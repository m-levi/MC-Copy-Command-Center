import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

export type JobStatus = 'queued' | 'processing' | 'streaming' | 'completed' | 'failed' | 'cancelled';

interface JobUpdate {
  type: 'connected' | 'status';
  status?: JobStatus;
  result?: any;
  error?: string;
}

interface UseBackgroundJobOptions {
  onStatusChange?: (status: JobStatus) => void;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
  onContent?: (content: string) => void;
}

/**
 * Hook for polling background job status via SSE
 * Used when ENABLE_MESSAGE_QUEUE is true and messages are processed in background
 */
export function useBackgroundJob(
  messageId: string | null,
  options: UseBackgroundJobOptions = {}
) {
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [content, setContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const supabase = createClient();

  const { onStatusChange, onComplete, onError, onContent } = options;

  /**
   * Start polling for job updates via SSE
   */
  const startPolling = useCallback(() => {
    if (!messageId || eventSourceRef.current) return;

    setIsPolling(true);
    setError(null);

    const eventSource = new EventSource(`/api/messages/${messageId}/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const update: JobUpdate = JSON.parse(event.data);

        if (update.type === 'connected') {
          logger.debug('[BackgroundJob] Connected to SSE stream');
          return;
        }

        if (update.type === 'status' && update.status) {
          setStatus(update.status);
          onStatusChange?.(update.status);

          if (update.status === 'completed') {
            // Fetch the final message content
            fetchMessageContent();
            onComplete?.(update.result);
            stopPolling();
          } else if (update.status === 'failed') {
            setError(update.error || 'Job failed');
            onError?.(update.error || 'Job failed');
            stopPolling();
          } else if (update.status === 'cancelled') {
            stopPolling();
          }
        }
      } catch (e) {
        logger.error('[BackgroundJob] Failed to parse SSE message:', e);
      }
    };

    eventSource.onerror = (e) => {
      logger.error('[BackgroundJob] SSE connection error:', e);
      // EventSource will auto-reconnect, but we should track this
      if (eventSource.readyState === EventSource.CLOSED) {
        setError('Connection lost');
        stopPolling();
      }
    };
  }, [messageId, onStatusChange, onComplete, onError]);

  /**
   * Stop polling for updates
   */
  const stopPolling = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsPolling(false);
  }, []);

  /**
   * Fetch final message content from database
   */
  const fetchMessageContent = useCallback(async () => {
    if (!messageId) return;

    try {
      const { data: message, error: fetchError } = await supabase
        .from('messages')
        .select('content')
        .eq('id', messageId)
        .single();

      if (fetchError) throw fetchError;

      if (message?.content) {
        setContent(message.content);
        onContent?.(message.content);
      }
    } catch (e) {
      logger.error('[BackgroundJob] Failed to fetch message content:', e);
    }
  }, [messageId, supabase, onContent]);

  /**
   * Cancel the job
   */
  const cancelJob = useCallback(async () => {
    if (!messageId) return;

    try {
      // Get job ID from message
      const { data: job } = await supabase
        .from('message_jobs')
        .select('id')
        .eq('message_id', messageId)
        .single();

      if (job) {
        await fetch(`/api/jobs/${job.id}/cancel`, { method: 'POST' });
        setStatus('cancelled');
        stopPolling();
      }
    } catch (e) {
      logger.error('[BackgroundJob] Failed to cancel job:', e);
    }
  }, [messageId, supabase, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    status,
    content,
    error,
    isPolling,
    startPolling,
    stopPolling,
    cancelJob,
    fetchMessageContent,
  };
}

/**
 * Check if background queue mode is enabled
 * This checks the response from the chat API
 */
export function isQueuedResponse(response: any): response is {
  queued: true;
  jobId: string;
  messageId: string;
  streamUrl: string;
} {
  return response && response.queued === true && response.messageId;
}

