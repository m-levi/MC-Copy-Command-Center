import { useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Message } from '@/types';
import { 
  getCachedMessages, 
  cacheMessages, 
  addCachedMessage, 
  updateCachedMessage 
} from '@/lib/cache-manager';
import { RequestCoalescer } from '@/lib/performance-utils';
import { trackPerformance } from '@/lib/analytics';
import { loadDraft } from '@/hooks/useDraftSave';
import toast from 'react-hot-toast';

/**
 * Hook for managing chat messages - loading, caching, and real-time updates
 */
export function useChatMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const requestCoalescerRef = useRef(new RequestCoalescer());

  /**
   * Load messages for current conversation
   */
  const loadMessages = useCallback(async () => {
    if (!conversationId) return;

    const startTime = performance.now();
    setLoading(true);

    try {
      // Use request coalescer to prevent duplicate calls
      await requestCoalescerRef.current.execute(
        async () => {
          // Check cache first
          const cached = getCachedMessages(conversationId);
          if (cached && cached.length > 0) {
            setMessages(cached);
            trackPerformance('load_messages', performance.now() - startTime, { 
              source: 'cache',
              count: cached.length 
            });
            return;
          }

          // Load from database
          const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

          if (error) throw error;
          
          if (data) {
            cacheMessages(conversationId, data);
            setMessages(data);
            trackPerformance('load_messages', performance.now() - startTime, { 
              source: 'database',
              count: data.length 
            });
          }
        },
        conversationId
      );
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [conversationId, supabase]);

  /**
   * Add a message optimistically (before DB confirmation)
   */
  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
    if (conversationId) {
      addCachedMessage(conversationId, message);
    }
  }, [conversationId]);

  /**
   * Update a message (e.g., during streaming)
   */
  const updateMessage = useCallback((messageId: string, updates: Partial<Message>) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
    );
    
    if (conversationId) {
      const updatedMessage = messages.find(m => m.id === messageId);
      if (updatedMessage) {
        updateCachedMessage(conversationId, { ...updatedMessage, ...updates });
      }
    }
  }, [conversationId, messages]);

  /**
   * Replace a message (e.g., replace placeholder with saved message)
   */
  const replaceMessage = useCallback((oldId: string, newMessage: Message) => {
    setMessages(prev => {
      // Remove any duplicates and replace the old message
      const filtered = prev.filter(msg => msg.id !== newMessage.id);
      return filtered.map(msg => msg.id === oldId ? newMessage : msg);
    });
    
    if (conversationId) {
      addCachedMessage(conversationId, newMessage);
    }
  }, [conversationId]);

  /**
   * Clear messages (when switching conversations)
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    loading,
    loadMessages,
    addMessage,
    updateMessage,
    replaceMessage,
    clearMessages,
    setMessages
  };
}

