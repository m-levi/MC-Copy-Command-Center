import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { authenticationError, notFoundError, withErrorHandling } from '@/lib/api-error';

export const runtime = 'nodejs';

/**
 * Server-Sent Events endpoint for job progress updates
 */
export const GET = withErrorHandling(async (
  req: NextRequest,
  context?: { params: Promise<{ id: string }> }
) => {
  const { id: messageId } = await context!.params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return authenticationError('Please log in');
  }

  // Verify user owns the message
  const { data: message } = await supabase
    .from('messages')
    .select('id, conversation_id, user_id')
    .eq('id', messageId)
    .single();

  if (!message) {
    return notFoundError('Message not found');
  }

  // Verify user has access to conversation
  const { data: conversation } = await supabase
    .from('conversations')
    .select('user_id')
    .eq('id', message.conversation_id)
    .single();

  if (!conversation || conversation.user_id !== user.id) {
    return authenticationError('Access denied');
  }

  // Create SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      // Send initial connection message
      controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'));

      // Poll for updates
      const interval = setInterval(async () => {
        try {
          // Get job status
          const { data: job } = await supabase
            .from('message_jobs')
            .select('status, result, error')
            .eq('message_id', messageId)
            .single();

          if (job) {
            const update = {
              type: 'status',
              status: job.status,
              result: job.result,
              error: job.error,
            };

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(update)}\n\n`)
            );

            // Close stream if job is complete
            if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
              clearInterval(interval);
              controller.close();
            }
          }
        } catch (error) {
          console.error('SSE polling error:', error);
        }
      }, 1000); // Poll every second

      // Cleanup on client disconnect
      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
});




