import { useState, useCallback, useEffect, useRef } from 'react';
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
import toast from 'react-hot-toast';
import { logger } from '@/lib/logger';

/**
 * Hook for managing chat messages - loading, caching, and real-time updates
 */
export function useChatMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const requestCoalescerRef = useRef(new RequestCoalescer());
  const loadSeqRef = useRef(0);

  const getSupabase = useCallback(() => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient();
    }
    return supabaseRef.current;
  }, []);

  /**
   * Load messages for current conversation
   */
  const loadMessages = useCallback(async () => {
    const loadSeq = ++loadSeqRef.current;

    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const startTime = performance.now();
    setLoading(true);

    try {
      // Use request coalescer to prevent duplicate calls
      await requestCoalescerRef.current.execute(
        async () => {
          // Check cache first
          const cached = getCachedMessages(conversationId);
          if (cached && cached.length > 0) {
            if (loadSeq !== loadSeqRef.current) return;
            setMessages(cached);
            trackPerformance('load_messages', performance.now() - startTime, { 
              source: 'cache',
              count: cached.length 
            });
            return;
          }

          const supabase = getSupabase();

          // Load from database with selective fields
          const { data: messagesData, error } = await supabase
            .from('messages')
            .select('id, conversation_id, role, content, thinking, created_at, metadata, edited_at, parent_message_id, user_id')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

          if (error) throw error;
          if (loadSeq !== loadSeqRef.current) return;
          
          if (messagesData) {
            // Fetch user profiles for user messages
            const userIds = [...new Set(messagesData
              .filter(m => m.role === 'user' && m.user_id)
              .map(m => m.user_id))];
            
            let messagesWithUsers = messagesData;

            if (userIds.length > 0) {
              const { data: profiles } = await supabase
                .from('profiles')
                .select('user_id, email, full_name, avatar_url')
                .in('user_id', userIds);
              if (loadSeq !== loadSeqRef.current) return;
                
              if (profiles) {
                messagesWithUsers = messagesData.map(msg => {
                  if (msg.role === 'user' && msg.user_id) {
                    const profile = profiles.find(p => p.user_id === msg.user_id);
                    return { ...msg, user: profile };
                  }
                  return msg;
                });
              }
            }

            cacheMessages(conversationId, messagesWithUsers);
            setMessages(messagesWithUsers);
            trackPerformance('load_messages', performance.now() - startTime, { 
              source: 'database',
              count: messagesWithUsers.length 
            });
          }
        },
        conversationId
      );
    } catch (error) {
      if (loadSeq !== loadSeqRef.current) return;
      logger.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    } finally {
      if (loadSeq === loadSeqRef.current) {
        setLoading(false);
      }
    }
  }, [conversationId, getSupabase]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

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
    setMessages(prev => {
      let nextMessage: Message | null = null;
      const next = prev.map(msg => {
        if (msg.id !== messageId) return msg;
        nextMessage = { ...msg, ...updates };
        return nextMessage;
      });

      if (conversationId && nextMessage) {
        updateCachedMessage(conversationId, nextMessage);
      }

      return next;
    });
  }, [conversationId]);

  /**
   * Replace a message (e.g., replace placeholder with saved message)
   */
  const replaceMessage = useCallback((oldId: string, newMessage: Message) => {
    setMessages(prev => {
      // Remove any duplicates and replace the old message
      const filtered = prev.filter(msg => msg.id !== newMessage.id);
      const next = filtered.map(msg => msg.id === oldId ? newMessage : msg);
      if (conversationId) {
        cacheMessages(conversationId, next);
      }
      return next;
    });
  }, [conversationId]);

  /**
   * Clear messages (when switching conversations)
   */
  const clearMessages = useCallback(() => {
    loadSeqRef.current += 1;
    setMessages([]);
    setLoading(false);
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
