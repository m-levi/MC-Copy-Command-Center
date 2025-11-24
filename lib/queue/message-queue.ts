/**
 * Message queue implementation using Vercel KV (Redis)
 * Handles queuing, priority, and job management
 */

import { createClient } from '@/lib/supabase/server';

export interface QueueJob {
  id: string;
  messageId: string;
  conversationId: string;
  userId: string;
  priority: number;
  payload: {
    messages: any[];
    modelId: string;
    brandContext: any;
    conversationId: string;
    [key: string]: any;
  };
  status: 'queued' | 'processing' | 'streaming' | 'completed' | 'failed' | 'cancelled';
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  retryCount: number;
}

export class MessageQueue {
  private kv: any;

  constructor() {
    try {
      // @ts-ignore - Vercel KV types
      this.kv = require('@vercel/kv');
    } catch (e) {
      console.warn('Vercel KV not available, using database queue');
    }
  }

  /**
   * Add a job to the queue
   */
  async enqueue(job: Omit<QueueJob, 'id' | 'status' | 'createdAt' | 'retryCount'>): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    const queueJob: QueueJob = {
      id: jobId,
      ...job,
      status: 'queued',
      createdAt: Date.now(),
      retryCount: 0,
    };

    // Store in database (primary storage)
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('message_jobs')
      .insert({
        id: jobId,
        message_id: job.messageId,
        conversation_id: job.conversationId,
        user_id: job.userId,
        status: 'queued',
        priority: job.priority,
        payload: job.payload,
        retry_count: 0,
        max_retries: 3,
      })
      .select()
      .single();

    if (error) throw error;

    // Also store in KV for fast access (if available)
    if (this.kv) {
      await this.kv.set(`job:${jobId}`, JSON.stringify(queueJob), { ex: 86400 }); // 24h TTL
      await this.kv.zadd('queue:priority', { score: job.priority, member: jobId });
    }

    // Update message status
    await supabase
      .from('messages')
      .update({
        status: 'queued',
        queued_at: new Date().toISOString(),
      })
      .eq('id', job.messageId);

    return jobId;
  }

  /**
   * Get next job from queue
   */
  async dequeue(maxConcurrent: number = 5): Promise<QueueJob | null> {
    const supabase = await createClient();

    // Use database function to get next job
    const { data, error } = await supabase.rpc('get_next_job', {
      max_concurrent: maxConcurrent,
    });

    if (error || !data || data.length === 0) {
      return null;
    }

    const jobData = data[0];

    // Fetch full job from database
    const { data: job, error: jobError } = await supabase
      .from('message_jobs')
      .select('*')
      .eq('id', jobData.id)
      .single();

    if (jobError || !job) {
      return null;
    }

    return {
      id: job.id,
      messageId: job.message_id,
      conversationId: job.conversation_id,
      userId: job.user_id,
      priority: job.priority,
      payload: job.payload,
      status: job.status,
      createdAt: new Date(job.created_at).getTime(),
      startedAt: job.started_at ? new Date(job.started_at).getTime() : undefined,
      completedAt: job.completed_at ? new Date(job.completed_at).getTime() : undefined,
      error: job.error || undefined,
      retryCount: job.retry_count,
    };
  }

  /**
   * Update job status
   */
  async updateStatus(
    jobId: string,
    status: QueueJob['status'],
    updates?: Partial<QueueJob>
  ): Promise<void> {
    const supabase = await createClient();
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'processing' && !updates?.startedAt) {
      updateData.started_at = new Date().toISOString();
    }

    if (status === 'completed' || status === 'failed') {
      updateData.completed_at = new Date().toISOString();
    }

    if (updates?.error) {
      updateData.error = updates.error;
    }

    if (updates?.retryCount !== undefined) {
      updateData.retry_count = updates.retryCount;
    }

    await supabase
      .from('message_jobs')
      .update(updateData)
      .eq('id', jobId);

    // Update message status
    const { data: job } = await supabase
      .from('message_jobs')
      .select('message_id')
      .eq('id', jobId)
      .single();

    if (job) {
      await supabase
        .from('messages')
        .update({
          status,
          processing_started_at: updateData.started_at,
          processing_completed_at: updateData.completed_at,
          error_message: updateData.error,
          retry_count: updateData.retry_count,
        })
        .eq('id', job.message_id);
    }
  }

  /**
   * Cancel a job
   */
  async cancel(jobId: string): Promise<void> {
    await this.updateStatus(jobId, 'cancelled');
  }

  /**
   * Get user's jobs
   */
  async getUserJobs(userId: string, status?: QueueJob['status']): Promise<QueueJob[]> {
    const supabase = await createClient();
    let query = supabase
      .from('message_jobs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: jobs, error } = await query;

    if (error) throw error;

    return (jobs || []).map((job: any) => ({
      id: job.id,
      messageId: job.message_id,
      conversationId: job.conversation_id,
      userId: job.user_id,
      priority: job.priority,
      payload: job.payload,
      status: job.status,
      createdAt: new Date(job.created_at).getTime(),
      startedAt: job.started_at ? new Date(job.started_at).getTime() : undefined,
      completedAt: job.completed_at ? new Date(job.completed_at).getTime() : undefined,
      error: job.error || undefined,
      retryCount: job.retry_count,
    }));
  }
}

// Singleton instance
export const messageQueue = new MessageQueue();





