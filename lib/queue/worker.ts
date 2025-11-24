/**
 * Background worker to process queued messages
 * This would typically run as a Vercel Cron Job or separate worker process
 */

import { messageQueue } from './message-queue';
import { createClient } from '@/lib/supabase/server';
import { handleUnifiedStream } from '@/lib/unified-stream-handler';

const MAX_CONCURRENT_JOBS = 5;

/**
 * Process a single job
 */
async function processJob(job: any) {
  const supabase = await createClient();

  try {
    // Update status to processing
    await messageQueue.updateStatus(job.id, 'processing', {
      startedAt: Date.now(),
    });

    // Extract payload
    const { messages, modelId, brandContext, conversationId, systemPrompt, provider, websiteUrl } = job.payload;

    // Call the unified stream handler
    const response = await handleUnifiedStream({
      messages,
      modelId,
      systemPrompt,
      provider,
      websiteUrl,
      conversationId,
    });

    // Read the stream and accumulate content
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullContent += chunk;

        // Update job with partial result
        await messageQueue.updateStatus(job.id, 'streaming', {
          error: undefined,
        });
      }
    }

    // Mark as completed
    await messageQueue.updateStatus(job.id, 'completed', {
      completedAt: Date.now(),
    });

    // Update message in database
    await supabase
      .from('messages')
      .update({
        content: fullContent,
        status: 'completed',
        processing_completed_at: new Date().toISOString(),
      })
      .eq('id', job.messageId);

    // Create notification for user
    await supabase.from('notifications').insert({
      user_id: job.userId,
      type: 'job_completed',
      title: 'Message Generated',
      message: 'Your AI message has been generated',
      link: `/brands/${job.payload.brandContext?.id}/chat/${job.conversationId}`,
      metadata: {
        job_id: job.id,
        message_id: job.messageId,
        conversation_id: job.conversationId,
      },
    });

  } catch (error: any) {
    console.error('Job processing error:', error);

    // Mark as failed with retry logic
    const shouldRetry = (job.retryCount || 0) < 3;
    
    await messageQueue.updateStatus(job.id, shouldRetry ? 'queued' : 'failed', {
      error: error.message || 'Unknown error',
      retryCount: (job.retryCount || 0) + 1,
    });

    if (!shouldRetry) {
      // Create failure notification
      const supabase = await createClient();
      await supabase.from('notifications').insert({
        user_id: job.userId,
        type: 'job_failed',
        title: 'Message Generation Failed',
        message: 'Failed to generate message after multiple attempts',
        link: `/brands/${job.payload.brandContext?.id}/chat/${job.conversationId}`,
        metadata: {
          job_id: job.id,
          error: error.message,
        },
      });
    }
  }
}

/**
 * Process all queued jobs (called by cron job)
 */
export async function processMessageQueue() {
  console.log('[Worker] Starting queue processing...');

  const jobs: any[] = [];
  
  // Get up to MAX_CONCURRENT_JOBS jobs
  for (let i = 0; i < MAX_CONCURRENT_JOBS; i++) {
    const job = await messageQueue.dequeue(MAX_CONCURRENT_JOBS);
    if (!job) break;
    jobs.push(job);
  }

  if (jobs.length === 0) {
    console.log('[Worker] No jobs to process');
    return;
  }

  console.log(`[Worker] Processing ${jobs.length} jobs`);

  // Process jobs in parallel
  await Promise.allSettled(jobs.map(processJob));

  console.log('[Worker] Queue processing complete');
}





