'use client';

/**
 * Custom AI Chat Hook
 * 
 * This hook provides a simplified interface for AI chat functionality.
 * 
 * ## Why We Don't Use AI SDK's useChat Hook
 * 
 * The main chat page (app/brands/[brandId]/chat/page.tsx) uses a custom 
 * implementation because our requirements exceed what useChat provides:
 * 
 * 1. **Custom JSON Protocol** - Our API returns structured JSON messages
 *    ({type: 'thinking'/'text'/'products'/'status'}) not standard SSE
 * 
 * 2. **Checkpoint/Recovery** - We save streaming checkpoints for recovery
 *    if the connection drops mid-generation
 * 
 * 3. **60fps UI Throttling** - We use requestAnimationFrame to prevent
 *    UI jank during fast streaming
 * 
 * 4. **Thinking Content Separation** - We accumulate thinking/reasoning
 *    separately from main content for display
 * 
 * 5. **Product Links Extraction** - We extract product links from the
 *    stream in real-time
 * 
 * 6. **Sidebar Status Sync** - We update sidebar conversation status
 *    during AI generation
 * 
 * 7. **Flow Mode** - Special handling for email flow/outline approval
 * 
 * 8. **Offline Queue** - Messages are queued when offline
 * 
 * This hook is a simplified version for potential future use cases that
 * don't require the full feature set.
 * 
 * @see app/brands/[brandId]/chat/page.tsx for the full implementation
 */

import { useState, useCallback, useRef } from 'react';
import { Message, AIStatus, Brand, ConversationMode, EmailType, FlowType, ProductLink } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

interface UseAIChatOptions {
  conversationId: string | null;
  brand: Brand | null;
  conversationMode: ConversationMode;
  emailType: EmailType;
  modelId: string;
  isFlowMode?: boolean;
  flowType?: FlowType | null;
  onStatusChange?: (status: AIStatus) => void;
  onThinkingContent?: (content: string) => void;
  onProductLinks?: (links: ProductLink[]) => void;
  onError?: (error: Error) => void;
  onFinish?: (message: Message) => void;
}

interface UseAIChatReturn {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  isLoading: boolean;
  aiStatus: AIStatus;
  thinkingContent: string;
  productLinks: ProductLink[];
  sendMessage: (content: string) => Promise<void>;
  regenerateMessage: (messageIndex: number) => Promise<void>;
  stopGeneration: () => void;
  error: Error | null;
}

/**
 * Custom hook that wraps streaming chat functionality
 * 
 * Note: This is a simplified version that uses manual fetch.
 * A future version will use @ai-sdk/react's useChat hook.
 */
export function useAIChat(options: UseAIChatOptions): UseAIChatReturn {
  const {
    conversationId,
    brand,
    conversationMode,
    emailType,
    modelId,
    isFlowMode,
    flowType,
    onStatusChange,
    onThinkingContent,
    onProductLinks,
    onError,
    onFinish,
  } = options;

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<AIStatus>('idle');
  const [thinkingContent, setThinkingContent] = useState('');
  const [productLinks, setProductLinks] = useState<ProductLink[]>([]);
  const [chatError, setChatError] = useState<Error | null>(null);
  
  const supabase = createClient();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Update status and notify parent
  const updateStatus = useCallback((status: AIStatus) => {
    setAiStatus(status);
    onStatusChange?.(status);
  }, [onStatusChange]);

  // Send message using manual fetch with JSON streaming
  const sendMessage = useCallback(async (content: string) => {
    if (!conversationId || !content.trim()) return;

    setIsLoading(true);
    updateStatus('analyzing_brand');
    setChatError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Save user message to database first
      const { data: savedUserMessage, error: userError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: 'user',
          content,
          user_id: user?.id,
        })
        .select()
        .single();

      if (userError) {
        throw userError;
      }

      // Add to local messages immediately
      setMessages(prev => [...prev, savedUserMessage]);

      // Create abort controller
      abortControllerRef.current = new AbortController();

      // Call chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, savedUserMessage],
          modelId,
          brandContext: brand,
          conversationMode,
          emailType,
          conversationId,
          isFlowMode,
          flowType,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      // Create AI message placeholder
      const aiMessageId = crypto.randomUUID();
      const aiMessage: Message = {
        id: aiMessageId,
        conversation_id: conversationId,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiMessage]);

      // Read streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';
      let fullThinking = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;

            try {
              const message = JSON.parse(line);

              switch (message.type) {
                case 'status':
                  updateStatus(message.status as AIStatus);
                  break;
                case 'thinking':
                  fullThinking += message.content;
                  setThinkingContent(fullThinking);
                  onThinkingContent?.(fullThinking);
                  break;
                case 'text':
                  fullText += message.content;
                  setMessages(prev =>
                    prev.map(m =>
                      m.id === aiMessageId
                        ? { ...m, content: fullText, thinking: fullThinking }
                        : m
                    )
                  );
                  break;
                case 'products':
                  setProductLinks(message.products || []);
                  onProductLinks?.(message.products || []);
                  break;
              }
            } catch (e) {
              logger.error('[useAIChat] Error parsing message:', e);
            }
          }
        }
      }

      // Save final AI message to database
      const { data: savedAIMessage, error: aiError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: fullText,
          thinking: fullThinking || null,
        })
        .select()
        .single();

      if (aiError) {
        logger.error('[useAIChat] Error saving AI message:', aiError);
      } else if (savedAIMessage) {
        setMessages(prev =>
          prev.map(m =>
            m.id === aiMessageId ? { ...savedAIMessage, thinking: fullThinking } : m
          )
        );
        onFinish?.(savedAIMessage);
      }

      updateStatus('idle');
    } catch (error) {
      logger.error('[useAIChat] Error:', error);
      updateStatus('idle');
      setChatError(error instanceof Error ? error : new Error('Failed to send message'));
      onError?.(error instanceof Error ? error : new Error('Failed to send message'));
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, messages, brand, conversationMode, emailType, modelId, isFlowMode, flowType, supabase, updateStatus, onThinkingContent, onProductLinks, onError, onFinish]);

  // Regenerate a message
  const regenerateMessage = useCallback(async (messageIndex: number) => {
    if (!conversationId || messageIndex < 1) return;

    const userMessage = messages[messageIndex - 1];
    if (!userMessage || userMessage.role !== 'user') return;

    // Truncate messages
    setMessages(messages.slice(0, messageIndex));

    // Re-send
    await sendMessage(userMessage.content);
  }, [conversationId, messages, sendMessage]);

  // Stop generation
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    updateStatus('idle');
    setIsLoading(false);
  }, [updateStatus]);

  return {
    messages,
    setMessages,
    isLoading,
    aiStatus,
    thinkingContent,
    productLinks,
    sendMessage,
    regenerateMessage,
    stopGeneration,
    error: chatError,
  };
}
