'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { trackOfflineMode } from '@/lib/analytics';
import toast from 'react-hot-toast';

export interface QueuedMessage {
  id: string;
  conversationId: string;
  content: string;
  timestamp: number;
  retryCount?: number;
  lastError?: string;
}

interface QueueProcessor {
  (message: QueuedMessage): Promise<void>;
}

/**
 * Manage offline message queue with auto-processing
 */
export function useOfflineQueue(processor?: QueueProcessor) {
  const [isOnline, setIsOnline] = useState(true);
  const [queue, setQueue] = useState<QueuedMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const processorRef = useRef<QueueProcessor | undefined>(processor);
  const wasOffline = useRef(false);

  // Update processor ref
  useEffect(() => {
    processorRef.current = processor;
  }, [processor]);

  // Load queue from localStorage on mount
  useEffect(() => {
    const savedQueue = localStorage.getItem('message_queue');
    if (savedQueue) {
      try {
        setQueue(JSON.parse(savedQueue));
      } catch (error) {
        console.error('Error loading queue:', error);
      }
    }
  }, []);

  // Save queue to localStorage whenever it changes
  useEffect(() => {
    if (queue.length > 0) {
      localStorage.setItem('message_queue', JSON.stringify(queue));
    } else {
      localStorage.removeItem('message_queue');
    }
  }, [queue]);

  /**
   * Process queued messages
   */
  const processQueue = useCallback(async () => {
    if (!processorRef.current || queue.length === 0 || isProcessing) {
      return;
    }

    setIsProcessing(true);

    try {
      // Process messages one by one
      for (const message of queue) {
        try {
          await processorRef.current(message);
          
          // Remove successfully processed message
          setQueue((prev) => prev.filter((m) => m.id !== message.id));
          
          toast.success('Message sent!', { duration: 2000 });
        } catch (error) {
          console.error('Failed to process queued message:', error);
          
          // Update retry count
          setQueue((prev) =>
            prev.map((m) =>
              m.id === message.id
                ? {
                    ...m,
                    retryCount: (m.retryCount || 0) + 1,
                    lastError: (error as Error).message,
                  }
                : m
            )
          );

          // Stop processing if message fails multiple times
          if ((message.retryCount || 0) >= 3) {
            toast.error('Failed to send message after multiple attempts');
            break;
          }
        }
      }
    } finally {
      setIsProcessing(false);
    }
  }, [queue, isProcessing]);

  // Monitor online status and auto-process queue
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      trackOfflineMode(false);
      
      // Auto-process queue when coming back online
      if (wasOffline.current && queue.length > 0) {
        toast('Back online! Processing queued messages...', {
          icon: '📡',
          duration: 3000,
        });
        
        // Delay processing slightly to ensure connection is stable
        setTimeout(() => {
          processQueue();
        }, 1000);
      }
      
      wasOffline.current = false;
    };

    const handleOffline = () => {
      setIsOnline(false);
      trackOfflineMode(true);
      wasOffline.current = true;
      
      toast('You are offline. Messages will be queued.', {
        icon: '📡',
        duration: 3000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    const online = navigator.onLine;
    setIsOnline(online);
    if (!online) {
      wasOffline.current = true;
      trackOfflineMode(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queue.length, processQueue]);

  /**
   * Add message to queue
   */
  const addToQueue = useCallback((conversationId: string, content: string) => {
    const queuedMessage: QueuedMessage = {
      id: crypto.randomUUID(),
      conversationId,
      content,
      timestamp: Date.now(),
      retryCount: 0,
    };

    setQueue((prev) => [...prev, queuedMessage]);
    return queuedMessage;
  }, []);

  /**
   * Remove message from queue
   */
  const removeFromQueue = useCallback((messageId: string) => {
    setQueue((prev) => prev.filter((m) => m.id !== messageId));
  }, []);

  /**
   * Clear entire queue
   */
  const clearQueue = useCallback(() => {
    setQueue([]);
    localStorage.removeItem('message_queue');
  }, []);

  /**
   * Retry failed messages
   */
  const retryFailed = useCallback(() => {
    if (isOnline && !isProcessing) {
      processQueue();
    }
  }, [isOnline, isProcessing, processQueue]);

  /**
   * Get queued messages for a conversation
   */
  const getQueuedMessages = useCallback(
    (conversationId: string) => {
      return queue.filter((m) => m.conversationId === conversationId);
    },
    [queue]
  );

  /**
   * Get failed messages (retry count >= 3)
   */
  const getFailedMessages = useCallback(() => {
    return queue.filter((m) => (m.retryCount || 0) >= 3);
  }, [queue]);

  return {
    isOnline,
    queue,
    isProcessing,
    addToQueue,
    removeFromQueue,
    clearQueue,
    retryFailed,
    getQueuedMessages,
    getFailedMessages,
  };
}


