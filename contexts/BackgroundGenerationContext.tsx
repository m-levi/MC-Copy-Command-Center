'use client';

import React, { createContext, useContext, useCallback, useRef, useState, useEffect } from 'react';
import { Message, AIStatus, Brand, ConversationMode, EmailType, FlowType, ProductLink } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import toast from 'react-hot-toast';

// Types for background generation tracking
export interface GenerationState {
  conversationId: string;
  conversationTitle: string;
  brandId: string;
  status: AIStatus;
  progress: number; // 0-100
  content: string;
  thinking: string;
  productLinks: ProductLink[];
  error: string | null;
  startedAt: Date;
  completedAt: Date | null;
  abortController: AbortController;
  // For UI updates when user returns to this conversation
  pendingUpdate: {
    aiMessageId: string;
    content: string;
    thinking: string;
    productLinks: ProductLink[];
    metadata: Record<string, unknown> | null;
  } | null;
}

export interface BackgroundGenerationContextType {
  // State
  activeGenerations: Map<string, GenerationState>;
  
  // Actions
  startGeneration: (params: StartGenerationParams) => Promise<void>;
  stopGeneration: (conversationId: string) => void;
  getGenerationState: (conversationId: string) => GenerationState | undefined;
  isGenerating: (conversationId: string) => boolean;
  getGeneratingConversationIds: () => string[];
  
  // Register an existing generation that was started elsewhere (e.g., chat page)
  // This allows tracking without starting a new fetch
  registerExistingGeneration: (params: RegisterExistingGenerationParams) => void;
  completeExistingGeneration: (params: CompleteExistingGenerationParams) => void;
  
  // Notifications
  pendingNotifications: CompletionNotification[];
  dismissNotification: (conversationId: string) => void;
  
  // For UI updates when returning to a conversation
  consumePendingUpdate: (conversationId: string) => GenerationState['pendingUpdate'] | null;
}

export interface RegisterExistingGenerationParams {
  conversationId: string;
  conversationTitle: string;
  brandId: string;
  abortController: AbortController;
  initialContent?: string;
  initialThinking?: string;
}

export interface CompleteExistingGenerationParams {
  conversationId: string;
  success: boolean;
  aiMessageId?: string;
  content?: string;
  thinking?: string;
  productLinks?: ProductLink[];
  metadata?: Record<string, unknown> | null;
  error?: string;
}

export interface StartGenerationParams {
  conversationId: string;
  conversationTitle: string;
  brandId: string;
  brand: Brand | null;
  messages: Message[];
  modelId: string;
  conversationMode: ConversationMode;
  emailType?: EmailType;
  isFlowMode?: boolean;
  flowType?: FlowType | null;
  attachments?: File[];
  customModeId?: string;
  // Called when streaming content updates (for live preview if user is viewing)
  onContentUpdate?: (content: string, thinking: string) => void;
  // Called when generation completes
  onComplete?: (result: GenerationResult) => void;
}

export interface GenerationResult {
  success: boolean;
  aiMessageId: string;
  content: string;
  thinking: string;
  productLinks: ProductLink[];
  metadata: Record<string, unknown> | null;
  error?: string;
}

export interface CompletionNotification {
  conversationId: string;
  conversationTitle: string;
  brandId: string;
  success: boolean;
  timestamp: Date;
  error?: string;
}

const BackgroundGenerationContext = createContext<BackgroundGenerationContextType | null>(null);

export function useBackgroundGeneration() {
  const context = useContext(BackgroundGenerationContext);
  if (!context) {
    throw new Error('useBackgroundGeneration must be used within BackgroundGenerationProvider');
  }
  return context;
}

// Optional hook that doesn't throw - useful for components that may be outside provider
export function useBackgroundGenerationOptional() {
  return useContext(BackgroundGenerationContext);
}

export function BackgroundGenerationProvider({ children }: { children: React.ReactNode }) {
  // Use refs for state that needs to be accessed in callbacks without triggering re-renders
  const generationsRef = useRef<Map<string, GenerationState>>(new Map());
  // State version to trigger re-renders when generations change
  const [stateVersion, setStateVersion] = useState(0);
  const [pendingNotifications, setPendingNotifications] = useState<CompletionNotification[]>([]);

  // Ref to track if we have a pending RAF update (prevents duplicate re-renders)
  const pendingUpdateRef = useRef(false);

  const supabase = createClient();

  // Force a re-render when generations change - batched via requestAnimationFrame
  // This prevents 40+ re-renders per streaming response by batching updates
  const notifyChange = useCallback(() => {
    if (pendingUpdateRef.current) return; // Already have a pending update
    pendingUpdateRef.current = true;
    requestAnimationFrame(() => {
      pendingUpdateRef.current = false;
      setStateVersion(v => v + 1);
    });
  }, []);

  // Immediate notify for critical state changes (start/complete/error)
  const notifyChangeImmediate = useCallback(() => {
    pendingUpdateRef.current = false; // Cancel any pending RAF
    setStateVersion(v => v + 1);
  }, []);

  // Get current generations as a new Map (for consumers)
  const activeGenerations = new Map(generationsRef.current);

  const startGeneration = useCallback(async (params: StartGenerationParams) => {
    const {
      conversationId,
      conversationTitle,
      brandId,
      brand,
      messages,
      modelId,
      conversationMode,
      emailType,
      isFlowMode,
      flowType,
      attachments,
      customModeId,
      onContentUpdate,
      onComplete,
    } = params;

    // Check if already generating for this conversation
    if (generationsRef.current.has(conversationId)) {
      logger.warn('[BackgroundGeneration] Already generating for conversation:', conversationId);
      return;
    }

    const abortController = new AbortController();
    
    // Initialize generation state
    const state: GenerationState = {
      conversationId,
      conversationTitle,
      brandId,
      status: 'analyzing_brand',
      progress: 0,
      content: '',
      thinking: '',
      productLinks: [],
      error: null,
      startedAt: new Date(),
      completedAt: null,
      abortController,
      pendingUpdate: null,
    };
    
    generationsRef.current.set(conversationId, state);
    notifyChangeImmediate(); // Immediate update for generation start

    logger.log('[BackgroundGeneration] Starting generation for:', conversationId);

    try {
      // Process attachments if any
      let processedAttachments: Array<{
        type: 'image' | 'file';
        name: string;
        mimeType: string;
        data: string;
      }> = [];

      if (attachments && attachments.length > 0) {
        processedAttachments = await Promise.all(
          attachments.map(async (file) => {
            const buffer = await file.arrayBuffer();
            const base64 = btoa(
              new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
            );
            return {
              type: (file.type.startsWith('image/') ? 'image' : 'file') as 'image' | 'file',
              name: file.name,
              mimeType: file.type,
              data: base64,
            };
          })
        );
      }

      // Make the API call
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          modelId,
          brandContext: brand,
          conversationId,
          conversationMode,
          emailType: emailType || 'design',
          isFlowMode: isFlowMode || false,
          flowType: flowType || null,
          attachments: processedAttachments.length > 0 ? processedAttachments : undefined,
          customModeId,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      // Process streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let fullThinking = '';
      const productLinks: ProductLink[] = [];
      let lastStatus: AIStatus = 'analyzing_brand';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const data = JSON.parse(line);
            
            switch (data.type) {
              case 'text':
                fullContent += data.content || '';
                state.content = fullContent;
                state.progress = Math.min(90, state.progress + 5);
                onContentUpdate?.(fullContent, fullThinking);
                break;
                
              case 'thinking':
                fullThinking += data.content || '';
                state.thinking = fullThinking;
                onContentUpdate?.(fullContent, fullThinking);
                break;
                
              case 'thinking_start':
                lastStatus = 'thinking';
                state.status = 'thinking';
                break;
                
              case 'status':
                lastStatus = data.status;
                state.status = data.status;
                break;
                
              case 'products':
                if (data.products) {
                  productLinks.push(...data.products);
                  state.productLinks = productLinks;
                }
                break;
                
              case 'error':
                state.error = data.error;
                logger.error('[BackgroundGeneration] Stream error:', data.error);
                break;
            }
            
            notifyChange();
          } catch (parseError) {
            // Ignore parse errors for incomplete JSON
          }
        }
      }

      // Generation complete - save to database
      state.status = 'finalizing';
      state.progress = 100;
      state.completedAt = new Date();
      
      // Get user for DB insert
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Prepare metadata
      const metadata: Record<string, unknown> = {};
      if (productLinks.length > 0) {
        metadata.productLinks = productLinks;
      }

      // Save AI message to database
      const { data: savedMessage, error: saveError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: fullContent,
          thinking: fullThinking || null,
          metadata: Object.keys(metadata).length > 0 ? metadata : null,
        })
        .select()
        .single();

      if (saveError) {
        throw saveError;
      }

      logger.log('[BackgroundGeneration] Message saved:', savedMessage.id);

      // Update conversation's last message preview
      await supabase
        .from('conversations')
        .update({
          last_message_preview: fullContent.substring(0, 100),
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      // Store pending update for when user returns to conversation
      state.pendingUpdate = {
        aiMessageId: savedMessage.id,
        content: fullContent,
        thinking: fullThinking,
        productLinks,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
      };

      // Show completion notification
      setPendingNotifications(prev => [
        ...prev,
        {
          conversationId,
          conversationTitle,
          brandId,
          success: true,
          timestamp: new Date(),
        },
      ]);

      // Show toast notification
      toast.success(
        <div className="flex items-center gap-2">
          <span className="font-medium">{conversationTitle}</span>
          <span className="text-gray-500">finished generating</span>
        </div>,
        {
          duration: 5000,
          icon: '✨',
        }
      );

      // Call completion callback
      onComplete?.({
        success: true,
        aiMessageId: savedMessage.id,
        content: fullContent,
        thinking: fullThinking,
        productLinks,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
      });

      notifyChangeImmediate(); // Immediate update for completion
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.log('[BackgroundGeneration] Generation aborted:', conversationId);
        state.status = 'idle';
      } else {
        logger.error('[BackgroundGeneration] Generation error:', error);
        state.error = error instanceof Error ? error.message : 'Unknown error';
        state.status = 'idle';
        
        // Show error notification
        setPendingNotifications(prev => [
          ...prev,
          {
            conversationId,
            conversationTitle,
            brandId,
            success: false,
            timestamp: new Date(),
            error: state.error || 'Generation failed',
          },
        ]);

        toast.error(
          <div className="flex items-center gap-2">
            <span className="font-medium">{conversationTitle}</span>
            <span className="text-gray-500">generation failed</span>
          </div>,
          {
            duration: 5000,
          }
        );

        onComplete?.({
          success: false,
          aiMessageId: '',
          content: state.content,
          thinking: state.thinking,
          productLinks: state.productLinks,
          metadata: null,
          error: state.error || undefined,
        });
      }

      state.completedAt = new Date();
      notifyChangeImmediate(); // Immediate update for error/abort
    }
  }, [supabase, notifyChange, notifyChangeImmediate]);

  const stopGeneration = useCallback((conversationId: string) => {
    const state = generationsRef.current.get(conversationId);
    if (state) {
      state.abortController.abort();
      state.status = 'idle';
      state.completedAt = new Date();
      notifyChangeImmediate(); // Immediate update for stop

      toast('Generation stopped', { icon: '⏹️' });
    }
  }, [notifyChangeImmediate]);

  const getGenerationState = useCallback((conversationId: string) => {
    return generationsRef.current.get(conversationId);
  }, []);

  const isGenerating = useCallback((conversationId: string) => {
    const state = generationsRef.current.get(conversationId);
    return state ? !state.completedAt : false;
  }, []);

  const getGeneratingConversationIds = useCallback(() => {
    const ids: string[] = [];
    generationsRef.current.forEach((state, id) => {
      if (!state.completedAt) {
        ids.push(id);
      }
    });
    return ids;
  }, []);

  const dismissNotification = useCallback((conversationId: string) => {
    setPendingNotifications(prev => 
      prev.filter(n => n.conversationId !== conversationId)
    );
  }, []);

  const consumePendingUpdate = useCallback((conversationId: string) => {
    const state = generationsRef.current.get(conversationId);
    if (state?.pendingUpdate) {
      const update = state.pendingUpdate;
      state.pendingUpdate = null;
      // Clean up completed generation
      if (state.completedAt) {
        generationsRef.current.delete(conversationId);
        notifyChange();
      }
      return update;
    }
    return null;
  }, [notifyChange]);

  // Register an existing generation that was started in the chat page
  // This allows us to track background generations without duplicating the fetch logic
  const registerExistingGeneration = useCallback((params: RegisterExistingGenerationParams) => {
    const {
      conversationId,
      conversationTitle,
      brandId,
      abortController,
      initialContent = '',
      initialThinking = '',
    } = params;

    // Check if already tracking this generation
    if (generationsRef.current.has(conversationId)) {
      logger.log('[BackgroundGeneration] Already tracking generation for:', conversationId);
      return;
    }

    const state: GenerationState = {
      conversationId,
      conversationTitle,
      brandId,
      status: 'developing_body',
      progress: 50, // Midway since already started
      content: initialContent,
      thinking: initialThinking,
      productLinks: [],
      error: null,
      startedAt: new Date(),
      completedAt: null,
      abortController,
      pendingUpdate: null,
    };

    generationsRef.current.set(conversationId, state);
    notifyChange();
    
    logger.log('[BackgroundGeneration] Registered existing generation for:', conversationId);
  }, [notifyChange]);

  // Complete an existing generation that was tracked via registerExistingGeneration
  const completeExistingGeneration = useCallback((params: CompleteExistingGenerationParams) => {
    const {
      conversationId,
      success,
      aiMessageId,
      content,
      thinking,
      productLinks,
      metadata,
      error,
    } = params;

    const state = generationsRef.current.get(conversationId);
    if (!state) {
      logger.log('[BackgroundGeneration] No tracked generation found for:', conversationId);
      return;
    }

    state.completedAt = new Date();
    state.status = 'idle';
    state.progress = 100;
    
    if (success && aiMessageId) {
      state.content = content || '';
      state.thinking = thinking || '';
      state.productLinks = productLinks || [];
      
      // Store pending update for when user returns to conversation
      state.pendingUpdate = {
        aiMessageId,
        content: content || '',
        thinking: thinking || '',
        productLinks: productLinks || [],
        metadata: metadata || null,
      };

      // Show completion notification
      setPendingNotifications(prev => [
        ...prev,
        {
          conversationId,
          conversationTitle: state.conversationTitle,
          brandId: state.brandId,
          success: true,
          timestamp: new Date(),
        },
      ]);

      toast.success(
        <div className="flex items-center gap-2">
          <span className="font-medium">{state.conversationTitle}</span>
          <span className="text-gray-500">finished generating</span>
        </div>,
        {
          duration: 5000,
          icon: '✨',
        }
      );
    } else {
      state.error = error || 'Generation failed';
      
      // Show error notification
      setPendingNotifications(prev => [
        ...prev,
        {
          conversationId,
          conversationTitle: state.conversationTitle,
          brandId: state.brandId,
          success: false,
          timestamp: new Date(),
          error: state.error || undefined,
        },
      ]);

      toast.error(
        <div className="flex items-center gap-2">
          <span className="font-medium">{state.conversationTitle}</span>
          <span className="text-gray-500">generation failed</span>
        </div>,
        {
          duration: 5000,
        }
      );
    }

    notifyChange();
    logger.log('[BackgroundGeneration] Completed existing generation for:', conversationId, { success });
  }, [notifyChange]);

  // Clean up completed generations after a delay
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = new Date();
      let hasChanges = false;
      
      generationsRef.current.forEach((state, id) => {
        // Remove completed generations after 30 seconds if no pending update
        if (state.completedAt && !state.pendingUpdate) {
          const elapsed = now.getTime() - state.completedAt.getTime();
          if (elapsed > 30000) {
            generationsRef.current.delete(id);
            hasChanges = true;
          }
        }
      });
      
      if (hasChanges) {
        notifyChange();
      }
    }, 10000);

    return () => clearInterval(cleanup);
  }, [notifyChange]);

  const contextValue: BackgroundGenerationContextType = {
    activeGenerations,
    startGeneration,
    stopGeneration,
    getGenerationState,
    isGenerating,
    getGeneratingConversationIds,
    registerExistingGeneration,
    completeExistingGeneration,
    pendingNotifications,
    dismissNotification,
    consumePendingUpdate,
  };

  return (
    <BackgroundGenerationContext.Provider value={contextValue}>
      {children}
    </BackgroundGenerationContext.Provider>
  );
}

