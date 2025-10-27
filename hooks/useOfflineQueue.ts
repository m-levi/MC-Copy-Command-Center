'use client';

import { useState, useEffect, useCallback } from 'react';

export interface QueuedMessage {
  id: string;
  conversationId: string;
  content: string;
  timestamp: number;
}

/**
 * Manage offline message queue
 */
export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(true);
  const [queue, setQueue] = useState<QueuedMessage[]>([]);

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

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /**
   * Add message to queue
   */
  const addToQueue = useCallback((conversationId: string, content: string) => {
    const queuedMessage: QueuedMessage = {
      id: crypto.randomUUID(),
      conversationId,
      content,
      timestamp: Date.now(),
    };

    setQueue(prev => [...prev, queuedMessage]);
    return queuedMessage;
  }, []);

  /**
   * Remove message from queue
   */
  const removeFromQueue = useCallback((messageId: string) => {
    setQueue(prev => prev.filter(m => m.id !== messageId));
  }, []);

  /**
   * Clear entire queue
   */
  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  /**
   * Get queued messages for a conversation
   */
  const getQueuedMessages = useCallback((conversationId: string) => {
    return queue.filter(m => m.conversationId === conversationId);
  }, [queue]);

  return {
    isOnline,
    queue,
    addToQueue,
    removeFromQueue,
    clearQueue,
    getQueuedMessages,
  };
}


