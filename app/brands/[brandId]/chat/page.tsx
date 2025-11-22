'use client';

import { useEffect, useState, useRef, use, useMemo, useCallback, lazy, Suspense, startTransition, createContext, useContext } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Brand, Conversation, Message, AIModel, AIStatus, PromptTemplate, ConversationMode, OrganizationMember, EmailType, FlowType, FlowOutline, FlowConversation, FlowOutlineData, BulkActionType, ProductLink } from '@/types';
import { AI_MODELS } from '@/lib/ai-models';
import ChatSidebarEnhanced from '@/components/ChatSidebarEnhanced';
import { useSidebarState } from '@/hooks/useSidebarState';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import AIStatusIndicator from '@/components/AIStatusIndicator';
import ThemeToggle from '@/components/ThemeToggle';
import { executeBulkAction } from '@/lib/conversation-actions';
import InlineActionBanner from '@/components/InlineActionBanner';
import FlowGuidanceCard from '@/components/FlowGuidanceCard';
import FlowGenerationProgress from '@/components/FlowGenerationProgress';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import type { ImperativePanelHandle } from 'react-resizable-panels';

// Lazy load heavy/optional components
const VirtualizedMessageList = lazy(() => import('@/components/VirtualizedMessageList'));
const MemorySettings = lazy(() => import('@/components/MemorySettings'));
const FlowCreationPanel = lazy(() => import('@/components/FlowCreationPanel'));
const FlowOutlineDisplay = lazy(() => import('@/components/FlowOutlineDisplay'));
const FlowNavigation = lazy(() => import('@/components/FlowNavigation'));
const ApproveOutlineButton = lazy(() => import('@/components/ApproveOutlineButton'));
const ConversationOptionsMenu = lazy(() => import('@/components/ConversationOptionsMenu'));
const ShareModal = lazy(() => import('@/components/ShareModal'));
const CommentsSidebar = lazy(() => import('@/components/CommentsSidebar'));
import ActiveJobsIndicator from '@/components/ActiveJobsIndicator';
import { FilterType } from '@/components/ConversationFilterDropdown';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { useDraftSave, loadDraft, clearDraft } from '@/hooks/useDraftSave';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { useConversationCleanup, bulkCleanupEmptyConversations } from '@/hooks/useConversationCleanup';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { 
  getCachedMessages, 
  cacheMessages, 
  addCachedMessage, 
  updateCachedMessage,
  getCachedConversations,
  cacheConversations,
  prefetchMessages 
} from '@/lib/cache-manager';
import { generateCacheKey, getCachedResponse, cacheResponse } from '@/lib/response-cache';
import { parseAIResponse } from '@/lib/streaming/ai-response-parser';
import { RequestCoalescer } from '@/lib/performance-utils';
import { trackEvent, trackPerformance } from '@/lib/analytics';
import { createStreamState, processStreamChunk, finalizeStream } from '@/lib/stream-parser';
import { 
  saveCheckpoint, 
  loadCheckpoint, 
  clearCheckpoint 
} from '@/lib/stream-recovery';
import { ChatPageSkeleton, SidebarLoadingSkeleton, MessageSkeleton } from '@/components/SkeletonLoader';
import DOMPurify from 'dompurify';
import { detectFlowOutline, isOutlineApprovalMessage } from '@/lib/flow-outline-parser';
import { buildFlowOutlinePrompt } from '@/lib/flow-prompts';
import { extractCampaignIdea, stripCampaignTags } from '@/lib/campaign-parser';
import { logger } from '@/lib/logger';
import { ErrorBoundary, SectionErrorBoundary } from '@/components/ErrorBoundary';

export const dynamic = 'force-dynamic';

type EmailStyleOption = Extract<EmailType, 'design' | 'letter'>;

// Sanitize AI-generated content before saving to database
const sanitizeContent = (content: string): string => {
  const withoutMarkers = stripControlMarkers(content);

  return DOMPurify.sanitize(withoutMarkers, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'code', 'pre', 'blockquote'],
    ALLOWED_ATTR: ['href', 'title', 'target'],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
};

const stripControlMarkers = (value: string | undefined): string => {
  if (!value) return '';
  return value
    .replace(/\[STATUS:\w+\]/g, '')
    .replace(/\[TOOL:\w+:(?:START|END)\]/g, '')
    .replace(/\[THINKING:(?:START|END)\]/g, '')
    .replace(/\[THINKING:CHUNK\][\s\S]*?(?=\[|$)/g, '')
    .replace(/\[PRODUCTS:[\s\S]*?\]/g, '')
    .replace(/\[REMEMBER:[^\]]+\]/g, '');
};

// Comprehensive email content cleaning with multiple fallback strategies
const cleanEmailContentFinal = (content: string): string => {
  return stripControlMarkers(content)
    .replace(/<email_strategy>[\s\S]*?<\/email_strategy>/gi, '')
    .trim();
};

/**
 * Parse streamed content into separate sections
 * "Accumulate Then Parse" approach - clean, simple, reliable
 */
function parseStreamedContent(fullContent: string): {
  emailCopy: string;
  clarification: string;
  otherContent: string;
  thoughtContent: string;
  responseType: 'email_copy' | 'clarification' | 'other';
  productLinks: ProductLink[];
} {
  const parsed = parseAIResponse(fullContent);

  const emailCopy = parsed.emailCopy || '';
  const clarification = parsed.clarification || '';
  const otherContent = parsed.other || '';
  const thoughtContent = parsed.thinking || '';
  const responseType = parsed.responseType;
  const productLinks = parsed.productLinks || [];

      logger.log('[Parser] Parsed response summary:', {
        responseType,
        emailLength: emailCopy.length,
        clarificationLength: clarification.length,
        otherLength: otherContent.length,
        thinkingLength: thoughtContent.length,
        productLinks: productLinks.length,
        emailPreview: emailCopy?.substring(0, 100),
        clarificationPreview: clarification?.substring(0, 100),
        otherPreview: otherContent?.substring(0, 100),
      });

  return {
    emailCopy,
    clarification,
    otherContent,
    thoughtContent,
    responseType,
    productLinks,
  };
}

// Context for sidebar panel control
import { SidebarPanelContext } from '@/contexts/SidebarPanelContext';

// Wrapper component to handle sidebar panel resizing with native collapse support
function SidebarPanelWrapper({ 
  children, 
  defaultSize, 
  minSize, 
  maxSize, 
  collapsedSize = 5,
  className 
}: { 
  children: React.ReactNode;
  defaultSize: number;
  minSize: number;
  maxSize: number;
  collapsedSize?: number;
  className?: string;
}) {
  const panelRef = useRef<ImperativePanelHandle>(null);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebarCollapsed') === 'true';
    }
    return false;
  });

  // Sync collapsed state with localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarCollapsed', String(isCollapsed));
    }
  }, [isCollapsed]);

  const toggleCollapse = useCallback(() => {
    if (!panelRef.current) return;
    
    if (isCollapsed) {
      panelRef.current.expand();
    } else {
      panelRef.current.collapse();
    }
  }, [isCollapsed]);

  const handleCollapse = useCallback(() => {
    setIsCollapsed(true);
  }, []);

  const handleExpand = useCallback(() => {
    setIsCollapsed(false);
  }, []);

  return (
    <SidebarPanelContext.Provider value={{ isCollapsed, toggleCollapse }}>
      <ResizablePanel 
        ref={panelRef}
        id="sidebar-panel"
        defaultSize={isCollapsed ? collapsedSize : defaultSize}
        minSize={minSize} 
        maxSize={maxSize}
        collapsible={true}
        collapsedSize={collapsedSize}
        onCollapse={handleCollapse}
        onExpand={handleExpand}
        className={className}
      >
        {children}
      </ResizablePanel>
    </SidebarPanelContext.Provider>
  );
}

export default function ChatPage({ params }: { params: Promise<{ brandId: string }> }) {
  const resolvedParams = use(params);
  const brandId = resolvedParams.brandId;
  
  const [brand, setBrand] = useState<Brand | null>(null);
  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [showBrandSwitcher, setShowBrandSwitcher] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedModel, setSelectedModel] = useState<AIModel>('claude-4.5-sonnet');
  const [emailType, setEmailType] = useState<EmailType>('design');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [aiStatus, setAiStatus] = useState<AIStatus>('idle');
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<string | null>(null);
  const [conversationMode, setConversationMode] = useState<ConversationMode>('email_copy');
  const [draftContent, setDraftContent] = useState('');
  const [teamMembers, setTeamMembers] = useState<OrganizationMember[]>([]);
  const [currentFilter, setCurrentFilter] = useState<FilterType>('all');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUserName, setCurrentUserName] = useState('');
  const [showMemorySettings, setShowMemorySettings] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showConversationMenu, setShowConversationMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [commentsSidebarCollapsed, setCommentsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('commentsSidebarCollapsed') !== 'false';
    }
    return true;
  });
  const [focusedMessageIdForComments, setFocusedMessageIdForComments] = useState<string | null>(null);
  const [highlightedTextForComment, setHighlightedTextForComment] = useState<string | null>(null);
  const [messageCommentCounts, setMessageCommentCounts] = useState<Record<string, number>>({});
  const [messageComments, setMessageComments] = useState<Record<string, Array<{ id: string; quoted_text?: string; content: string }>>>({});
  const [pendingConversationSelection, setPendingConversationSelection] = useState<string | null>(null);
  const [isCreatingEmail, setIsCreatingEmail] = useState(false);
  const isSelectingConversationRef = useRef(false);
  
  // Flow-related state
  const [showFlowTypeSelector, setShowFlowTypeSelector] = useState(false);
  const [isCreatingFlow, setIsCreatingFlow] = useState(false);
  const [selectedFlowType, setSelectedFlowType] = useState<FlowType | null>(null);
  const [flowOutline, setFlowOutline] = useState<FlowOutline | null>(null);
  const [flowChildren, setFlowChildren] = useState<Conversation[]>([]);
  const [parentFlow, setParentFlow] = useState<FlowConversation | null>(null);
  const [pendingOutlineApproval, setPendingOutlineApproval] = useState<FlowOutlineData | null>(null);
  const [isGeneratingFlow, setIsGeneratingFlow] = useState(false);
  const [flowGenerationProgress, setFlowGenerationProgress] = useState(0);
  
  // Campaign detection state (for Planning mode)
  const [detectedCampaign, setDetectedCampaign] = useState<{ title: string; brief: string } | null>(null);
  
  // Starred emails cache - loaded once per brand to avoid N queries per message
  const [starredEmailContents, setStarredEmailContents] = useState<Set<string>>(new Set());
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const brandSwitcherRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestCoalescerRef = useRef(new RequestCoalescer());
  const conversationsCoalescerRef = useRef(new RequestCoalescer<void>());
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { isOnline, addToQueue, removeFromQueue } = useOfflineQueue();
  
  // Create a ref for loadConversations to avoid dependency issues
  const loadConversationsRef = useRef<(() => Promise<void>) | undefined>(undefined);
  
  // Enhanced sidebar state management (using ref to avoid initialization order issues)
  const sidebarState = useSidebarState({
    userId: currentUserId,
    userName: currentUserName,
    conversations,
    onConversationUpdate: async () => {
      if (loadConversationsRef.current) {
        await loadConversationsRef.current();
      }
    }
  });
  
  // Auto-save drafts (debounced in ChatInput component)
  const handleDraftChange = (content: string) => {
    setDraftContent(content);
  };

  useDraftSave(currentConversation?.id || null, draftContent);

  // Helper to update URL with conversation ID
  const updateConversationUrl = useCallback((conversationId: string | null) => {
    if (!conversationId) {
      router.replace(`/brands/${brandId}/chat`);
    } else {
      router.replace(`/brands/${brandId}/chat?conversation=${conversationId}`);
    }
  }, [brandId, router]);

  // Auto-cleanup empty conversations on unmount
  const { cleanupIfEmpty } = useConversationCleanup({
    conversationId: currentConversation?.id || null,
    messageCount: messages.length,
    isFlow: currentConversation?.is_flow || false,
    isChild: !!currentConversation?.parent_conversation_id,
    shouldAutoDelete: true
  });

  // Listen for conversation selection from command palette
  useEffect(() => {
    const handleSelectFromCommandPalette = (event: any) => {
      const conversationId = event.detail?.conversationId;
      if (conversationId) {
        setPendingConversationSelection(conversationId);
      }
    };

    const handleToggleSidebar = () => {
      setIsMobileSidebarOpen(prev => !prev);
    };

    const handleShowStarredEmails = () => {
      // TODO: Implement starred emails modal
      toast('Starred emails feature coming soon!', { icon: '⭐' });
    };

    const handleShowKeyboardShortcuts = () => {
      // Dispatch event that GlobalKeyboardShortcuts will handle
      window.dispatchEvent(new CustomEvent('showKeyboardShortcuts'));
    };

    window.addEventListener('selectConversation', handleSelectFromCommandPalette);
    window.addEventListener('toggleSidebar', handleToggleSidebar);
    window.addEventListener('showStarredEmails', handleShowStarredEmails);
    
    return () => {
      window.removeEventListener('selectConversation', handleSelectFromCommandPalette);
      window.removeEventListener('toggleSidebar', handleToggleSidebar);
      window.removeEventListener('showStarredEmails', handleShowStarredEmails);
    };
  }, []);

  // Check for target conversation from command palette on mount
  useEffect(() => {
    const targetConversationId = localStorage.getItem('command-palette-target-conversation');
    if (targetConversationId && conversations.length > 0) {
      localStorage.removeItem('command-palette-target-conversation');
      setPendingConversationSelection(targetConversationId);
    }
  }, [conversations.length]);

  // Load conversation from URL parameter
  useEffect(() => {
    // Don't interfere if we're already selecting a conversation programmatically
    if (isSelectingConversationRef.current) {
      return;
    }

    const conversationIdFromUrl = searchParams.get('conversation');
    if (conversationIdFromUrl && conversations.length > 0) {
      // Only update if conversation is different from current
      if (currentConversation?.id !== conversationIdFromUrl) {
        const targetConversation = conversations.find(c => c?.id === conversationIdFromUrl);
        if (targetConversation?.id) {
          logger.log('[URL Effect] Loading conversation from URL:', conversationIdFromUrl);
          // Use handleSelectConversation to properly load the conversation
          handleSelectConversation(conversationIdFromUrl);
        }
      }
    } else if (!conversationIdFromUrl && currentConversation?.id) {
      // If URL doesn't have conversation param but we have one selected, update URL
      updateConversationUrl(currentConversation.id);
    }
  }, [searchParams, conversations, currentConversation?.id]);

  // Handle pending conversation selection
  useEffect(() => {
    if (pendingConversationSelection && conversations.length > 0) {
      const conversation = conversations.find((c) => c?.id === pendingConversationSelection);
      if (conversation?.id) {
        handleSelectConversation(pendingConversationSelection);
        setPendingConversationSelection(null);
      }
    }
  }, [pendingConversationSelection, conversations]);

  // Page-specific keyboard shortcuts (Command K is handled globally in layout)
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'n',
        meta: true,
        ctrl: true,
        shift: false,
        description: 'New conversation',
        action: () => {
          if (!showFlowTypeSelector) {
            handleNewConversation();
          }
        },
      },
      {
        key: 'n',
        meta: true,
        ctrl: true,
        shift: true,
        description: 'New flow',
        action: () => {
          if (!showFlowTypeSelector) {
            handleNewConversation();
            setShowFlowTypeSelector(true);
          }
        },
      },
      {
        key: 'b',
        meta: true,
        ctrl: true,
        description: 'Toggle sidebar',
        action: () => setIsMobileSidebarOpen(prev => !prev),
      },
      // Note: Escape is not handled here to avoid conflicts with browser navigation
      // Modals handle their own Escape key internally
    ],
    enabled: true,
  });

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  // Close brand switcher on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (brandSwitcherRef.current && !brandSwitcherRef.current.contains(event.target as Node)) {
        setShowBrandSwitcher(false);
      }
    };

    if (showBrandSwitcher) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showBrandSwitcher]);

  useEffect(() => {
    initializePage();
    
    // Subscribe to real-time conversation updates
    const conversationChannel = supabase
      .channel(`conversations:${brandId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
          filter: `brand_id=eq.${brandId}`,
        },
        (payload) => {
          logger.log('New conversation created:', payload.new);
          const newConversation = payload.new as Conversation;
          
          setConversations((prev) => {
            const exists = prev.some(c => c.id === newConversation.id);
            if (!exists) {
              // Update cache
              const updated = [newConversation, ...prev];
              cacheConversations(brandId, updated);
              trackEvent('conversation_created_realtime', { conversationId: newConversation.id });
              return updated;
            }
            return prev;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `brand_id=eq.${brandId}`,
        },
        (payload) => {
          logger.log('Conversation updated:', payload.new);
          const updatedConversation = payload.new as Conversation;
          
          setConversations((prev) => {
            const updated = prev.map((conv) =>
              conv.id === updatedConversation.id ? updatedConversation : conv
            ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
            
            // Update cache
            cacheConversations(brandId, updated);
            
            // Update current conversation if it's the one that changed
            if (currentConversation?.id === updatedConversation.id) {
              setCurrentConversation(updatedConversation);
            }
            
            return updated;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'conversations',
          filter: `brand_id=eq.${brandId}`,
        },
        (payload) => {
          logger.log('Conversation deleted:', payload.old);
          const deletedId = (payload.old as any).id;
          
          setConversations((prev) => {
            const updated = prev.filter((conv) => conv.id !== deletedId);
            cacheConversations(brandId, updated);
            return updated;
          });
          
          // Clear current conversation if it was deleted
          if (currentConversation?.id === deletedId) {
            setCurrentConversation(null);
            setMessages([]);
          }
        }
      )
      .subscribe();
    
    // ESC key to go back to brands
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        router.push('/');
      }
    };

    window.addEventListener('keydown', handleEscKey);
    
    // Cleanup subscription on unmount or brand change
    return () => {
      conversationChannel.unsubscribe();
      window.removeEventListener('keydown', handleEscKey);
      // Note: Auto-delete cleanup is handled by useConversationCleanup hook
    };
  }, [brandId, router]);

  useEffect(() => {
    applyConversationFilter();
  }, [conversations, currentFilter, selectedPersonId, currentUserId]);

  // Auto-create a new conversation when opening a brand if none is selected
  useEffect(() => {
    // Only auto-create if:
    // 1. Page has finished loading
    // 2. No conversation is currently selected
    // 3. We're not already in the process of creating one
    // 4. User ID is available
    if (!loading && !currentConversation && !isCreatingEmail && !isCreatingFlow && currentUserId) {
      // Small delay to ensure everything is initialized
      const timer = setTimeout(() => {
        handleNewConversation();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [loading, currentConversation, isCreatingEmail, isCreatingFlow, currentUserId]);

  useEffect(() => {
    if (!currentConversation?.id) {
      logger.log('[MessagesEffect] No conversation selected, clearing state');
      setMessages([]);
      setDraftContent('');
      setLoadingMessages(false);
      return;
    }

    // Use conversation ID to prevent stale closures
    const conversationId = currentConversation.id;
    logger.log('[MessagesEffect] Loading messages for conversation:', conversationId);
    
    // Load messages and draft
    loadMessages();
    
    // Load draft for this conversation
    const draft = loadDraft(conversationId);
    if (draft) {
      logger.log('[MessagesEffect] Loaded draft for conversation:', conversationId);
      setDraftContent(draft);
    }
    
    // Subscribe to real-time message updates
    const messageChannel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          logger.log('[Realtime] New message received:', payload.new);
          const newMessage = payload.new as Message;
          
          // Only add if not already in state (avoid duplicates from own sends)
          setMessages((prev) => {
            const exists = prev.some(m => m.id === newMessage.id);
            if (!exists) {
              // Update cache
              addCachedMessage(conversationId, newMessage);
              trackEvent('message_received_realtime', {
                conversationId,
                role: newMessage.role
              });
              return [...prev, newMessage];
            }
            return prev;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          logger.log('[Realtime] Message updated:', payload.new);
          const updatedMessage = payload.new as Message;
          
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === updatedMessage.id ? updatedMessage : msg
            )
          );
          
          // Update cache
          updateCachedMessage(conversationId, updatedMessage);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          logger.log('[Realtime] Message deleted:', payload.old);
          const deletedId = (payload.old as any).id;
          
          setMessages((prev) => prev.filter((msg) => msg.id !== deletedId));
        }
      )
      .subscribe();
    
    // Cleanup subscription on unmount or conversation change
    return () => {
      logger.log('[MessagesEffect] Cleaning up for conversation:', conversationId);
      messageChannel.unsubscribe();
    };
  }, [currentConversation?.id]);

  // Track if we just switched conversations to prevent auto-scroll on initial load
  const justSwitchedConversation = useRef(false);
  const previousMessageCount = useRef(messages.length);

  useEffect(() => {
    // Don't auto-scroll if we just switched conversations
    if (justSwitchedConversation.current) {
      justSwitchedConversation.current = false;
      previousMessageCount.current = messages.length;
      return;
    }

    // Only auto-scroll if a NEW message was added (not on initial load)
    const messageCountIncreased = messages.length > previousMessageCount.current;
    previousMessageCount.current = messages.length;

    if (!messageCountIncreased) {
      return; // Don't scroll if messages didn't increase (just loaded existing)
    }

    // Check if user is already near the bottom (within 100px)
    const container = messagesScrollRef.current;
    if (container) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      
      // Only auto-scroll if user is near bottom AND not currently streaming
      // This lets users read older messages without being interrupted
      if (isNearBottom && !sending) {
        scrollToBottom();
      }
    } else if (!sending) {
      // Fallback if no container ref
      scrollToBottom();
    }
  }, [messages, sending]);

  // Detect flow outline in AI responses
  useEffect(() => {
    if (!currentConversation?.is_flow || !currentConversation.flow_type) {
      console.log('[Outline Detection] Not a flow conversation or no flow type');
      return;
    }
    if (flowOutline?.approved) {
      console.log('[Outline Detection] Outline already approved, skipping');
      return;
    }
    if (messages.length === 0) {
      console.log('[Outline Detection] No messages yet');
      return;
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'assistant') {
      console.log('[Outline Detection] Last message is not from assistant');
      return;
    }

    console.log('[Outline Detection] Attempting to detect outline in message...');
    console.log('[Outline Detection] Message preview:', lastMessage.content.substring(0, 300));

    // Try to detect and parse outline
    const outline = detectFlowOutline(lastMessage.content, currentConversation.flow_type);
    if (outline) {
      console.log('✅ [Outline Detection] Successfully detected flow outline:', outline);
      setPendingOutlineApproval(outline);
    } else {
      console.log('❌ [Outline Detection] No outline detected');
      console.log('[Outline Detection] Has OUTLINE keyword:', lastMessage.content.includes('OUTLINE'));
      console.log('[Outline Detection] Has Goal keyword:', lastMessage.content.includes('Goal:'));
      console.log('[Outline Detection] Has Audience keyword:', lastMessage.content.includes('Audience:'));
    }
  }, [messages, currentConversation?.is_flow, currentConversation?.flow_type, flowOutline?.approved]);

  const scrollToBottom = useCallback((instant = false) => {
    // Use requestAnimationFrame for smoother scrolling
    const container = messagesScrollRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: instant ? 'instant' : 'smooth',
      });
    } else {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: instant ? 'instant' : 'smooth' });
      });
    }
  }, []);

  // Track scroll position for scroll-to-bottom button
  useEffect(() => {
    const container = messagesScrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      const distanceFromBottom = container.scrollHeight - (container.scrollTop + container.clientHeight);
      setShowScrollToBottom(distanceFromBottom > 300);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => container.removeEventListener('scroll', handleScroll);
  }, [currentConversation?.id]);

  const initializePage = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      setCurrentUserId(user.id);

      // Cleanup any accumulated empty conversations on page load
      // This runs in the background and doesn't block page load
      bulkCleanupEmptyConversations(brandId).catch(error => {
        // Only log non-network errors to avoid console pollution
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes('aborted') && !errorMessage.includes('Failed to fetch')) {
          logger.error('[Init] Background cleanup failed:', error);
        }
        // Don't show error to user - this is a background optimization
      });

      // Get user's profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setCurrentUserName(profile.full_name || profile.email || 'Unknown');
      }

      // Load team members
      const { data: memberData } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (memberData) {
        // Fetch members without nested profile select (to avoid foreign key issues)
        const { data: members } = await supabase
          .from('organization_members')
          .select('id, organization_id, user_id, role, invited_by, joined_at, created_at')
          .eq('organization_id', memberData.organization_id)
          .order('joined_at', { ascending: false });

        if (members) {
          // Fetch profiles separately for each member
          const membersWithProfiles = await Promise.all(
            members.map(async (member) => {
              const { data: profile } = await supabase
                .from('profiles')
                .select('user_id, email, full_name, avatar_url, created_at')
                .eq('user_id', member.user_id)
                .single();
              
              return {
                ...member,
                profile: profile || null
              };
            })
          );

          setTeamMembers(membersWithProfiles as unknown as OrganizationMember[]);
        }
      }

      await loadBrand();
      await loadAllBrands();
      await loadConversations();
      await loadStarredEmails();
    } catch (error) {
      logger.error('Error initializing page:', error);
      toast.error('Failed to load page. Please refresh and try again.', {
        duration: 5000,
      });
    }
  };
  
  // Load starred emails once per brand to avoid N queries per message
  const loadStarredEmails = useCallback(async () => {
    if (!brandId) return;
    
    try {
      const { data, error } = await supabase
        .from('brand_documents')
        .select('content')
        .eq('brand_id', brandId)
        .eq('doc_type', 'example');
      
      if (error) throw error;
      
      // Create a Set of starred email contents for O(1) lookup
      const starredSet = new Set<string>((data || []).map(doc => doc.content));
      setStarredEmailContents(starredSet);
    } catch (error) {
      logger.error('Error loading starred emails:', error);
      // Don't show toast - this is a background optimization
    }
  }, [brandId, supabase]);
  
  // Reload starred emails when brand changes
  useEffect(() => {
    loadStarredEmails();
  }, [loadStarredEmails]);

  const applyConversationFilter = useCallback(() => {
    let filtered = conversations;
    
    // Special case: Archived filter - ONLY show archived conversations
    if (currentFilter === 'archived') {
      setFilteredConversations(conversations.filter(c => c.is_archived));
      return;
    }
    
    // For all other filters: EXCLUDE archived conversations by default
    filtered = conversations.filter(c => !c.is_archived);
    
    // Apply additional filters
    if (currentFilter === 'mine') {
      filtered = filtered.filter(c => c.user_id === currentUserId);
    } else if (currentFilter === 'person' && selectedPersonId) {
      filtered = filtered.filter(c => c.user_id === selectedPersonId);
    } else if (currentFilter === 'emails') {
      filtered = filtered.filter(c => !c.is_flow && c.mode !== 'planning');
    } else if (currentFilter === 'flows') {
      filtered = filtered.filter(c => c.is_flow);
    } else if (currentFilter === 'planning') {
      filtered = filtered.filter(c => c.mode === 'planning');
    }
    
    setFilteredConversations(filtered);
  }, [currentFilter, conversations, currentUserId, selectedPersonId]);

  const handleFilterChange = (filter: FilterType, personId?: string) => {
    setCurrentFilter(filter);
    setSelectedPersonId(personId || null);
  };

  const loadBrand = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single();

      if (error) throw error;
      setBrand(data);
    } catch (error) {
      logger.error('Error loading brand:', error);
      toast.error('Failed to load brand. Redirecting to home...', {
        duration: 3000,
      });
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const loadAllBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('name');

      if (error) throw error;
      setAllBrands(data || []);
    } catch (error) {
      logger.error('Error loading brands:', error);
    }
  };

  const loadConversations = async () => {
    // Use RequestCoalescer to prevent duplicate API calls
    return conversationsCoalescerRef.current.execute(async () => {
      const startTime = performance.now();
      
      try {
        // Check cache first
        const cached = getCachedConversations(brandId);
        if (cached && cached.length > 0) {
          setConversations(cached);
          
          trackPerformance('load_conversations', performance.now() - startTime, { source: 'cache' });
          
          // Refresh in background
          fetchAndCacheConversations();
          return;
        }
        
        // Load from database
        await fetchAndCacheConversations();
        trackPerformance('load_conversations', performance.now() - startTime, { source: 'database' });
      } catch (error) {
        logger.error('Error loading conversations:', error instanceof Error ? error.message : String(error), error);
        toast.error('Unable to load conversations. Check your connection and try again.', {
          duration: 5000,
        });
      }
    }, 'loadConversations');
  };
  
  const fetchAndCacheConversations = async () => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('brand_id', brandId)
      .eq('conversation_type', 'email')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    
    if (data) {
      logger.log('[LoadConversations] Loaded conversations:', data.length);
      logger.log('[LoadConversations] Flow conversations:', data.filter(c => c.is_flow).map(c => ({
        title: c.title,
        is_flow: c.is_flow,
        flow_type: c.flow_type,
        id: c.id
      })));
      logger.log('[LoadConversations] Child conversations:', data.filter(c => c.parent_conversation_id).length);
      
      cacheConversations(brandId, data);
      setConversations(data);
    }
  };

  const loadMessages = async () => {
    if (!currentConversation) {
      logger.log('[LoadMessages] No current conversation');
      return;
    }

    // Skip loading messages for temporary/optimistic conversation IDs
    if (currentConversation.id.startsWith('temp-')) {
      logger.log('[LoadMessages] Skipping temp conversation:', currentConversation.id);
      setMessages([]);
      setLoadingMessages(false);
      return;
    }

    // Capture conversation ID at start to detect race conditions
    const conversationId = currentConversation.id;
    const startTime = performance.now();
    
    logger.log('[LoadMessages] Loading messages for:', conversationId);

    try {
      // Check cache first for instant loading
      const cached = getCachedMessages(conversationId);
      if (cached && cached.length > 0) {
        // Verify we're still on the same conversation (prevent race condition)
        if (currentConversation?.id !== conversationId) {
          logger.log('[LoadMessages] Conversation changed during cache load, aborting');
          return;
        }
        
        // Deduplicate cached messages
        const uniqueMessages = cached.filter((message, index, self) => 
          index === self.findIndex(m => m.id === message.id)
        );
        setMessages(uniqueMessages);
        setLoadingMessages(false);
        
        trackPerformance('load_messages', performance.now() - startTime, { 
          source: 'cache',
          count: uniqueMessages.length,
          originalCount: cached.length
        });
        
        // Load comment counts for messages
        loadCommentCounts(uniqueMessages.map(m => m.id));
        
        return;
      }

      // If not cached, loading state is already set by handleSelectConversation
      // No need to set it again here
      
      // Use request coalescer to prevent duplicate calls
      await requestCoalescerRef.current.execute(
        async () => {
          // Verify we're still on the same conversation before loading
          if (currentConversation?.id !== conversationId) {
            logger.log('[LoadMessages] Conversation changed before DB load, aborting');
            return;
          }
          
          // Load from database
          const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

          if (error) throw error;
          
          // Final check: verify we're still on the same conversation before setting state
          if (currentConversation?.id !== conversationId) {
            logger.log('[LoadMessages] Conversation changed after DB load, aborting');
            return;
          }
          
          if (data) {
            // Deduplicate messages from database
            const uniqueMessages = data.filter((message, index, self) => 
              index === self.findIndex(m => m.id === message.id)
            );
            
            cacheMessages(conversationId, uniqueMessages);
            setMessages(uniqueMessages);
            trackPerformance('load_messages', performance.now() - startTime, { 
              source: 'database',
              count: uniqueMessages.length,
              originalCount: data.length
            });
            
            // Load comment counts for messages
            loadCommentCounts(uniqueMessages.map(m => m.id));
          }
          
          // IMPORTANT: Hide loading state after database load
          setLoadingMessages(false);
        },
        conversationId
      );
    } catch (error) {
      // Better error logging with details
      const errorDetails = error instanceof Error 
        ? { message: error.message, stack: error.stack, name: error.name }
        : typeof error === 'object' && error !== null
        ? { ...error, code: (error as any).code, message: (error as any).message, details: (error as any).details }
        : { error };
      
      logger.error('[LoadMessages] Error loading messages:', errorDetails);
      toast.error('Failed to load messages');
      setLoadingMessages(false);
    }
  };

  const handleNewConversation = async () => {
    try {
      setIsCreatingEmail(true);
      
      // Abort any ongoing AI generation before switching
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        setSending(false);
        setAiStatus('idle');
        toast('Previous generation stopped', { icon: '⏹️' });
      }

      // Auto-delete current conversation if it's empty
      if (currentConversation && messages.length === 0) {
        await cleanupIfEmpty(currentConversation.id, 'empty_on_new_click');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsCreatingEmail(false);
        return;
      }

      // Optimistic UI: Create temporary conversation object immediately
      const tempId = `temp-${Date.now()}`;
      const optimisticConversation: Conversation = {
        id: tempId,
        brand_id: brandId,
        user_id: user.id,
        created_by_name: currentUserName,
        title: 'New Conversation',
        model: selectedModel,
        conversation_type: 'email',
        mode: 'email_copy',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Add to conversations list optimistically
      setConversations(prev => [optimisticConversation, ...prev]);
      
      // Select it immediately for instant navigation feel
      setCurrentConversation(optimisticConversation);
      setConversationMode('email_copy');
      setMessages([]);
      setEmailType('design');
      setDraftContent('');
      setDetectedCampaign(null);
      setPendingOutlineApproval(null);
      setIsGeneratingFlow(false);
      setFlowGenerationProgress(0);
      setSelectedFlowType(null);

      // Now create in database
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          brand_id: brandId,
          user_id: user.id,
          created_by_name: currentUserName,
          title: 'New Conversation',
          model: selectedModel,
          conversation_type: 'email',
          mode: 'email_copy',
        })
        .select()
        .single();

      if (error) {
        // Roll back optimistic update on error
        setConversations(prev => prev.filter(c => c.id !== tempId));
        setCurrentConversation(null);
        throw error;
      }

      // Replace optimistic conversation with real one
      setConversations(prev => prev.map(c => c.id === tempId ? data : c));
      setCurrentConversation(data);
      
      // Update URL to reflect the new conversation
      updateConversationUrl(data.id);
      
      await loadConversations();
      toast.success('New conversation created');
      trackEvent('conversation_created', { conversationId: data.id });
    } catch (error) {
      logger.error('Error creating conversation:', error instanceof Error ? error.message : String(error), error);
      toast.error('Failed to create conversation');
    } finally {
      setIsCreatingEmail(false);
    }
  };

  const handleToggleMode = async (newMode: ConversationMode) => {
    if (!currentConversation || messages.length > 0) return;
    
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ mode: newMode })
        .eq('id', currentConversation.id);

      if (error) throw error;

      setConversationMode(newMode);
      setCurrentConversation({ ...currentConversation, mode: newMode });
      toast.success(`Switched to ${newMode === 'planning' ? 'Planning' : 'Writing'} mode`);
    } catch (error) {
      logger.error('Error updating mode:', error);
      toast.error('Failed to update mode');
    }
  };

  const handleSelectConversation = async (conversationId: string) => {
    // Validate conversationId
    if (!conversationId) {
      logger.error('[SelectConversation] No conversation ID provided');
      return;
    }

    // Prevent selecting the same conversation twice
    if (currentConversation?.id === conversationId) {
      logger.log('[SelectConversation] Already on this conversation, skipping');
      return;
    }

    // Optimistically update UI immediately for instant feedback
    const conversation = conversations.find((c) => c?.id === conversationId);
    if (!conversation?.id) {
      logger.error('[SelectConversation] Conversation not found:', conversationId);
      return;
    }

    // Mark that we're selecting a conversation to prevent URL effect from interfering
    isSelectingConversationRef.current = true;

    logger.log('[SelectConversation] Switching to conversation:', conversationId);

    // Abort any ongoing AI generation before switching
    if (abortControllerRef.current && sending) {
      abortControllerRef.current.abort();
      setSending(false);
      setAiStatus('idle');
      toast('Generation stopped - switching conversations', { icon: '⏹️' });
    }

    // Auto-delete current conversation if it's empty (do this before UI update)
    if (currentConversation && 
        messages.length === 0 && 
        currentConversation.id !== conversationId) {
      cleanupIfEmpty(currentConversation.id, 'empty_on_switch').catch(logger.error);
    }

    // INSTANT scroll to top (no animation) - prevents jarring jumps
    if (messagesEndRef.current) {
      const container = messagesEndRef.current.closest('.overflow-y-auto');
      if (container) {
        container.scrollTop = 0; // Instant scroll to top
      }
    }

    // Mark that we just switched - prevents auto-scroll to bottom on load
    justSwitchedConversation.current = true;

    // CRITICAL: Clear messages immediately to prevent showing wrong conversation
    setMessages([]);
    
    // Clear draft immediately - will be loaded by useEffect if it exists
    setDraftContent('');
    
    // Clear all conversation-specific state
    setDetectedCampaign(null);
    setPendingOutlineApproval(null);
    setIsGeneratingFlow(false);
    setFlowGenerationProgress(0);
    setRegeneratingMessageId(null);
    setFocusedMessageIdForComments(null);
    setHighlightedTextForComment(null);
    
    // Check for cached messages - if available, use them immediately (no loading state)
    const cached = getCachedMessages(conversationId);
    const hasCachedMessages = cached && cached.length > 0;
    
    // Only show loading state if we DON'T have cached messages
    if (!hasCachedMessages) {
      setLoadingMessages(true);
    }
    
    // Update current conversation immediately (optimistic update)
    setCurrentConversation(conversation);
    updateConversationUrl(conversationId);
    setSelectedModel((conversation.model as AIModel) || 'claude-3-5-sonnet-20241022');
    setConversationMode(conversation.mode || 'planning');
    
    // Set email type based on conversation
    if (conversation.is_flow) {
      setEmailType('flow');
      setSelectedFlowType(conversation.flow_type || null);
    } else if (conversation.parent_conversation_id) {
      // Child email in a flow - default to 'design' email type
      setEmailType('design');
    } else {
      // Regular conversation - keep current email type or default to 'design'
      // (only reset if coming from a flow conversation)
      if (emailType === 'flow') {
        setEmailType('design');
      }
    }

    // Use startTransition for non-urgent updates
    startTransition(() => {
      // Load flow data if this is a flow conversation
      if (conversation.is_flow) {
        loadFlowData(conversation.id);
      }
      
      // Load parent flow if this is a child conversation
      if (conversation.parent_conversation_id) {
        loadParentFlow(conversation.parent_conversation_id);
      }
      
      trackEvent('conversation_selected', { conversationId });
      
      // Clear the selection flag after URL has been updated
      setTimeout(() => {
        isSelectingConversationRef.current = false;
      }, 100);
    });
  };
  
  const handlePrefetchConversation = (conversationId: string) => {
    // Prefetch messages in background when hovering
    prefetchMessages(conversationId, supabase);
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }

      await loadConversations();
      toast.success('Conversation deleted');
    } catch (error) {
      logger.error('Error deleting conversation:', error);
      toast.error('Failed to delete conversation');
    }
  };

  const handleBulkAction = async (action: BulkActionType, conversationIds: string[]) => {
    try {
      const result = await executeBulkAction(action, conversationIds);
      
      // If we deleted the current conversation, clear it
      if (action === 'delete' && currentConversation && conversationIds.includes(currentConversation.id)) {
        setCurrentConversation(null);
        setMessages([]);
        router.push(`/brands/${brandId}/chat`);
      }
      
      // Refresh conversations list
      await loadConversations();
      
    } catch (error) {
      logger.error('Error executing bulk action:', error);
      toast.error('Failed to complete bulk action');
    }
  };

  // Load comment counts for messages
  const loadCommentCounts = useCallback(async (messageIds: string[]) => {
    if (!currentConversation || messageIds.length === 0) return;
    
    try {
      const response = await fetch(`/api/conversations/${currentConversation.id}/comments`);
      if (!response.ok) {
        console.log('[Comment Counts] API returned:', response.status);
        return;
      }
      
      const data = await response.json();
      const comments = data.comments || [];
      
      console.log('[Comment Counts] Loaded comments:', comments.length, 'for conversation', currentConversation.id);
      
      // Count comments per message AND store comment data
      const counts: Record<string, number> = {};
      const commentsByMessage: Record<string, Array<{ id: string; quoted_text?: string; content: string }>> = {};
      
      messageIds.forEach(id => {
        const messageComments = comments.filter((c: any) => c.message_id === id && !c.resolved);
        if (messageComments.length > 0) {
          counts[id] = messageComments.length;
          commentsByMessage[id] = messageComments.map((c: any) => ({
            id: c.id,
            quoted_text: c.quoted_text,
            content: c.content
          }));
          console.log('[Comment Counts] Message', id.substring(0, 8), 'has', messageComments.length, 'comments');
        }
      });
      
      setMessageCommentCounts(counts);
      setMessageComments(commentsByMessage);
      console.log('[Comment Counts] Final counts:', counts);
      console.log('[Comment Data] Comments by message:', commentsByMessage);
    } catch (error) {
      logger.error('Failed to load comment counts:', error);
      // Don't show error - this is a background operation
    }
  }, [currentConversation]);

  // Reload comment counts when comments sidebar opens
  useEffect(() => {
    if (!commentsSidebarCollapsed && currentConversation && messages.length > 0) {
      loadCommentCounts(messages.map(m => m.id));
    }
  }, [commentsSidebarCollapsed, currentConversation, messages.length, loadCommentCounts]);

  // Persist comments sidebar collapsed state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('commentsSidebarCollapsed', String(commentsSidebarCollapsed));
    }
  }, [commentsSidebarCollapsed]);

  const handleRenameConversation = async (conversationId: string, newTitle: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/name`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: newTitle }),
      });

      if (!response.ok) {
        throw new Error('Failed to rename conversation');
      }

      const { title } = await response.json();

      // Update current conversation if it's the one being renamed
      if (currentConversation?.id === conversationId) {
        setCurrentConversation({ ...currentConversation, title });
      }

      // Reload conversations to reflect the change
      await loadConversations();
      toast.success('Conversation renamed');
    } catch (error) {
      logger.error('Error renaming conversation:', error);
      toast.error('Failed to rename conversation');
    }
  };

  // Handle email type change with Flow type selector
  const handleEmailTypeChange = (type: EmailType) => {
    if (type === 'flow') {
      if (!currentConversation?.is_flow) {
      setShowFlowTypeSelector(true);
      }
      setEmailType('flow');
    } else {
      setShowFlowTypeSelector(false);
      setEmailType(type);
    }
  };

  const handleFlowPromptSelect = (prompt: string) => {
    setDraftContent(prompt);
    scrollToBottom();
  };

  // Handle flow type selection
  const handleSelectFlowType = async (flowType: FlowType) => {
    try {
      logger.log('[Flow] Creating flow conversation for type:', flowType);
      setIsCreatingFlow(true);
      setShowFlowTypeSelector(false);
      setSelectedFlowType(flowType);
      
      // Create new flow conversation
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        logger.error('[Flow] No user found');
        setIsCreatingFlow(false);
        return;
      }

      const flowTitle = `New ${flowType.replace(/_/g, ' ')} Flow`;
      const flowData = {
        brand_id: brandId,
        user_id: user.user.id,
        title: flowTitle,
        model: selectedModel,
        conversation_type: 'email' as const,
        mode: 'email_copy' as const,
        is_flow: true,
        flow_type: flowType
      };

      // Optimistic UI: Create temporary flow conversation immediately
      const tempId = `temp-flow-${Date.now()}`;
      const optimisticFlow: Conversation = {
        id: tempId,
        brand_id: brandId,
        user_id: user.user.id,
        created_by_name: currentUserName,
        title: flowTitle,
        model: selectedModel,
        conversation_type: 'email',
        mode: 'email_copy',
        is_flow: true,
        flow_type: flowType,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Add to conversations list optimistically
      setConversations(prev => [optimisticFlow, ...prev]);
      
      // Select it immediately
      setCurrentConversation(optimisticFlow);
      setEmailType('flow');
      setMessages([]);
      setPendingOutlineApproval(null);
      setIsGeneratingFlow(false);
      setFlowGenerationProgress(0);
      setFlowOutline(null);
      setFlowChildren([]);

      logger.log('[Flow] Inserting conversation with data:', flowData);

      const { data: newConversation, error } = await supabase
        .from('conversations')
        .insert(flowData)
        .select()
        .single();

      if (error) {
        logger.error('[Flow] Error creating conversation:', error);
        logger.error('[Flow] Error details:', JSON.stringify(error, null, 2));
        logger.error('[Flow] Error message:', error.message);
        logger.error('[Flow] Error code:', error.code);
        logger.error('[Flow] Error hint:', error.hint);
        logger.error('[Flow] Error details:', error.details);
        
        // Roll back optimistic update on error
        setConversations(prev => prev.filter(c => c.id !== tempId));
        setCurrentConversation(null);
        setEmailType('design');
        throw error;
      }

      logger.log('[Flow] Created conversation:', newConversation);
      logger.log('[Flow] is_flow value:', newConversation.is_flow);
      logger.log('[Flow] flow_type value:', newConversation.flow_type);

      // Replace optimistic conversation with real one
      setConversations(prev => prev.map(c => c.id === tempId ? newConversation : c));
      setCurrentConversation(newConversation);
      
      await loadConversations();
      
      logger.log('[Flow] Conversation loaded, check sidebar for is_flow:', newConversation.is_flow);
      toast.success('Flow conversation created! Describe your automation needs.');
    } catch (error) {
      logger.error('Error creating flow:', error);
      toast.error('Failed to create flow');
      // Reset email type
      setEmailType('design');
    } finally {
      setIsCreatingFlow(false);
    }
  };

  // Load flow data for flow conversations
  const loadFlowData = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/flows/${conversationId}`);
      if (!response.ok) return;

      const data = await response.json();
      if (data.outline) {
        setFlowOutline(data.outline);
      }
      if (data.children) {
        setFlowChildren(data.children);
      }
    } catch (error) {
      logger.error('Error loading flow data:', error);
    }
  };

  // Load parent flow data for child conversations
  const loadParentFlow = async (parentId: string) => {
    try {
      const { data: parent } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', parentId)
        .single();

      if (parent) {
        setParentFlow(parent as FlowConversation);
        await loadFlowData(parentId);
      }
    } catch (error) {
      logger.error('Error loading parent flow:', error);
    }
  };

  // Handle outline approval
  const handleApproveOutline = async (outline: FlowOutlineData) => {
    if (!currentConversation) return;

    let flowProgressChannel: ReturnType<typeof supabase.channel> | null = null;
    let progressInterval: NodeJS.Timeout | null = null;
    const observedChildIds = new Set<string>();
    
    try {
      setSending(true);
      setIsGeneratingFlow(true);
      setFlowGenerationProgress(0);
      
      logger.log('[Flow UI] Starting flow generation for', outline.emails.length, 'emails');
      
      // Set initial progress to 1 to show we're starting
      setFlowGenerationProgress(1);
      
      // Subscribe to child conversation inserts for real-time progress updates
      flowProgressChannel = supabase
        .channel(`flow-generation:${currentConversation.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'conversations',
            filter: `parent_conversation_id=eq.${currentConversation.id}`,
          },
          (payload) => {
            const inserted = payload.new as { id?: string } | null;
            if (inserted?.id) {
              observedChildIds.add(inserted.id);
              const progressCount = Math.min(outline.emails.length, observedChildIds.size);
              console.log('[Flow Progress] Email created, updating progress:', progressCount);
              setFlowGenerationProgress(progressCount);
            }
          }
        )
        .subscribe();
      
      // Fallback: Poll for progress every 3 seconds if realtime updates fail
      progressInterval = setInterval(async () => {
        try {
          const { data: children } = await supabase
            .from('conversations')
            .select('id')
            .eq('parent_conversation_id', currentConversation.id);
          
          if (children && children.length > observedChildIds.size) {
            children.forEach(c => observedChildIds.add(c.id));
            const progressCount = Math.min(outline.emails.length, children.length);
            console.log('[Flow Progress] Polling detected progress:', progressCount);
            setFlowGenerationProgress(progressCount);
          }
        } catch (error) {
          console.error('[Flow Progress] Error polling progress:', error);
        }
      }, 3000);
      
      logger.log('[Flow UI] Calling generate-emails API...');
      const response = await fetch('/api/flows/generate-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: currentConversation.id,
          flowType: currentConversation.flow_type,
          outline: outline,
          model: selectedModel
        })
      });

      logger.log('[Flow UI] API call completed, response status:', response.status);

      const result = await response.json();
      logger.log('[Flow UI] Generation result:', result);
      if (typeof result.generated === 'number') {
        setFlowGenerationProgress(result.generated);
      }
      
      if (result.success) {
        toast.success(`Generated ${result.generated} emails successfully!`, {
          duration: 4000,
          icon: '🎉'
        });
        
        // Reload flow data to show children
        await loadFlowData(currentConversation.id);
        
        // Reload conversations to show new children in sidebar
        await loadConversations();
        
        // Clear pending approval
        setPendingOutlineApproval(null);
        
        // Add a system message about the generation (local only, not saved to DB)
        const systemMessage: Message = {
          id: `system-flow-complete-${currentConversation.id}-${Date.now()}-${Math.random()}`,
          conversation_id: currentConversation.id,
          role: 'assistant',
          content: `✅ Successfully generated ${result.generated} emails! Click on any email in the outline above to view and edit it.`,
          created_at: new Date().toISOString()
        };
        
        setMessages(prev => {
          // Only add if not already there
          const exists = prev.some(m => m.content.includes('Successfully generated') && m.content.includes('emails!'));
          if (!exists) {
            return [...prev, systemMessage];
          }
          return prev;
        });
      } else {
        logger.warn('[Flow UI] Partial success:', result);
        toast.error(`Generated ${result.generated} emails, but ${result.failed} failed. Check console for details.`);
        
        // Still reload to show successful emails
        if (result.generated > 0) {
          await loadFlowData(currentConversation.id);
          await loadConversations();
        }
      }
    } catch (error) {
      logger.error('[Flow UI] Error approving outline:', error);
      
      // Provide more detailed error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to generate emails: ${errorMessage}`);
      
      // Try to reload anyway in case some emails were created
      try {
        await loadFlowData(currentConversation.id);
        await loadConversations();
      } catch (reloadError) {
        logger.error('[Flow UI] Error reloading after failure:', reloadError);
      }
    } finally {
      if (flowProgressChannel) {
        flowProgressChannel.unsubscribe();
      }
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      setSending(false);
      setIsGeneratingFlow(false);
      setFlowGenerationProgress(0);
    }
  };

  const handleCreateCampaignFromPlan = async (campaignTitle: string, campaignBrief: string) => {
    try {
      // Get current user
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        logger.error('[Campaign] No user found');
        toast.error('Failed to create campaign');
        return;
      }

      // Create new conversation in email_copy mode
      const conversationData = {
        brand_id: brandId,
        user_id: user.user.id,
        title: campaignTitle,
        model: selectedModel,
        conversation_type: 'email' as const,
        mode: 'email_copy' as const,
      };

      const { data: newConversation, error } = await supabase
        .from('conversations')
        .insert(conversationData)
        .select()
        .single();

      if (error) {
        logger.error('[Campaign] Error creating conversation:', error);
        throw error;
      }

      // Pre-fill the draft with the campaign brief
      setDraftContent(`Create an email for this campaign:\n\nCampaign: ${campaignTitle}\n\n${campaignBrief}`);
      
      // Switch to the new conversation
      setCurrentConversation(newConversation);
      setConversationMode('email_copy');
      setMessages([]);
      setDetectedCampaign(null); // Clear the detected campaign
      
      // Reload conversations to show the new one in sidebar
      await loadConversations();
      
      toast.success(`Campaign conversation created! Ready to write your email.`);
    } catch (error) {
      logger.error('Error creating campaign conversation:', error);
      toast.error('Failed to create campaign');
    }
  };

  const generateTitle = async (userMessage: string, conversationId: string): Promise<string> => {
    // Trigger background auto-naming with AI
    try {
      const response = await fetch(`/api/conversations/${conversationId}/name`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userMessage }),
      });

      if (response.ok) {
        const { title } = await response.json();
        return title;
      }
    } catch (error) {
      logger.error('Error auto-generating title:', error);
    }

    // Fallback: Simple title generation from first message
    const words = userMessage.split(' ').slice(0, 6);
    return words.join(' ') + (words.length < userMessage.split(' ').length ? '...' : '');
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setSending(false);
      setAiStatus('idle');
    }
  };

  const handleRegenerateMessage = async (messageIndex: number) => {
    if (!currentConversation || !brand) return;

    // Find the user message before this AI message
    const userMessageIndex = messageIndex - 1;
    if (userMessageIndex < 0) return;

    const userMessage = messages[userMessageIndex];
    if (userMessage.role !== 'user') return;

    setRegeneratingMessageId(messages[messageIndex].id);
    setSending(true);
    setAiStatus('analyzing_brand');

    try {
      // Get all messages up to the user message
      const conversationHistory = messages.slice(0, userMessageIndex + 1);

      // Create abort controller
      abortControllerRef.current = new AbortController();

      // Call AI API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: conversationHistory,
          modelId: selectedModel,
          brandContext: brand,
          conversationMode: conversationMode,
          conversationId: currentConversation.id,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to get AI response';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch {
          if (errorText) {
            errorMessage = `${errorMessage}: ${errorText}`;
          }
        }
        logger.error('API Error (regenerate):', { status: response.status, message: errorMessage });
        throw new Error(errorMessage);
      }

      // Read streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let rawStreamContent = '';
      let streamingContent = '';
      let finalEmailCopy = '';
      let finalClarification = '';
      let finalThinking = '';
      let finalResponseType: 'email_copy' | 'clarification' | 'other' = 'other';
      let finalContent = '';
      let productLinks: ProductLink[] = [];

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          rawStreamContent += chunk;
          
          // Parse status markers
          const statusMatch = chunk.match(/\[STATUS:(\w+)\]/g);
          if (statusMatch) {
            statusMatch.forEach((match) => {
              const status = match.replace('[STATUS:', '').replace(']', '') as AIStatus;
              setAiStatus(status);
            });
          }

          // Clean control markers for streaming display
          let cleanChunk = chunk
            .replace(/\[STATUS:\w+\]/g, '')
            .replace(/\[TOOL:\w+:(START|END)\]/g, '')
            .replace(/\[THINKING:START\]/g, '')
            .replace(/\[THINKING:END\]/g, '')
            .replace(/\[THINKING:CHUNK\][\s\S]*?(?=\[|$)/g, '')
            .replace(/\[PRODUCTS:[\s\S]*?\]/g, '')
            .replace(/\[REMEMBER:[^\]]+\]/g, '');

          if (cleanChunk) {
            streamingContent += cleanChunk;

          // Update message in real-time
          setMessages((prev) =>
            prev.map((msg, idx) =>
              idx === messageIndex
                  ? { ...msg, content: streamingContent }
                : msg
            )
          );
          }
        }
      }

      const parsed = parseStreamedContent(rawStreamContent);
      finalEmailCopy = parsed.emailCopy;
      finalClarification = parsed.clarification;
      const finalOtherContent = parsed.otherContent;
      finalThinking = parsed.thoughtContent;
      finalResponseType = parsed.responseType;
      productLinks = parsed.productLinks;

      finalContent =
        finalResponseType === 'clarification'
          ? finalClarification
          : finalResponseType === 'other'
            ? finalOtherContent
            : finalEmailCopy || parsed.clarification || streamingContent.trim();
      finalContent = stripControlMarkers(finalContent);

      const metadataPayload: Record<string, any> = {
        responseType: finalResponseType,
      };
      if (productLinks.length > 0) {
        metadataPayload.productLinks = productLinks;
      }
      if (finalResponseType === 'clarification' && finalClarification) {
        metadataPayload.clarification = finalClarification;
      }
      const metadataToSave = Object.keys(metadataPayload).length > 0 ? metadataPayload : null;

      // Final update with parsed content and metadata
      setMessages((prev) =>
        prev.map((msg, idx) =>
          idx === messageIndex
            ? {
                ...msg,
                content: finalContent,
                thinking: finalThinking,
                metadata: {
                  ...msg.metadata,
                  ...metadataPayload,
                },
              }
            : msg
        )
      );

      // IMPORTANT: Reset status to idle
      logger.log('[Regenerate] Completed, resetting status to idle');
      setAiStatus('idle');
      setSending(false);

      // Update message in database
      await supabase
        .from('messages')
        .update({
          content: sanitizeContent(finalContent),
          thinking: finalThinking ? sanitizeContent(finalThinking) : null,
          metadata: metadataToSave,
        })
        .eq('id', messages[messageIndex].id);

    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast.error('Generation stopped');
      } else {
        logger.error('Error regenerating message:', error);
        toast.error('Failed to regenerate message');
      }
      // CRITICAL: Always reset status to idle
      logger.log('[Regenerate] Error occurred, resetting status to idle');
      setAiStatus('idle');
    } finally {
      // CRITICAL: Always reset
      logger.log('[Regenerate] Finally block, ensuring all reset');
      setSending(false);
      setAiStatus('idle');
      setRegeneratingMessageId(null);
      abortControllerRef.current = null;
    }
  };

  const handleRegenerateSection = async (sectionType: string, sectionTitle: string) => {
    if (!currentConversation || !brand) return;

    // Find the last AI message
    const lastAIMessageIndex = messages.findIndex((m, idx) => 
      m.role === 'assistant' && idx === messages.length - 1
    );
    
    if (lastAIMessageIndex === -1) return;

    setRegeneratingMessageId(messages[lastAIMessageIndex].id);
    setSending(true);
    setAiStatus('analyzing_brand');

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages.slice(0, lastAIMessageIndex + 1),
          modelId: selectedModel,
          brandContext: brand,
          conversationMode: conversationMode,
          conversationId: currentConversation.id,
          regenerateSection: { type: sectionType, title: sectionTitle },
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to regenerate section';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch {
          if (errorText) {
            errorMessage = `${errorMessage}: ${errorText}`;
          }
        }
        logger.error('API Error (regenerate section):', { status: response.status, message: errorMessage });
        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let rawStreamContent = '';
      let streamingContent = '';
      let finalEmailCopy = '';
      let finalClarification = '';
      let finalThinking = '';
      let finalResponseType: 'email_copy' | 'clarification' | 'other' = 'other';
      let finalContent = '';
      let productLinks: ProductLink[] = [];

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          rawStreamContent += chunk;
          
          const statusMatch = chunk.match(/\[STATUS:(\w+)\]/g);
          if (statusMatch) {
            statusMatch.forEach((match) => {
              const status = match.replace('[STATUS:', '').replace(']', '') as AIStatus;
              setAiStatus(status);
            });
          }

          let cleanChunk = chunk
            .replace(/\[STATUS:\w+\]/g, '')
            .replace(/\[TOOL:\w+:(START|END)\]/g, '')
            .replace(/\[THINKING:START\]/g, '')
            .replace(/\[THINKING:END\]/g, '')
            .replace(/\[THINKING:CHUNK\][\s\S]*?(?=\[|$)/g, '')
            .replace(/\[PRODUCTS:[\s\S]*?\]/g, '')
            .replace(/\[REMEMBER:[^\]]+\]/g, '');

          if (cleanChunk) {
            streamingContent += cleanChunk;

          setMessages((prev) =>
            prev.map((msg, idx) =>
              idx === lastAIMessageIndex
                  ? { ...msg, content: streamingContent }
                : msg
            )
          );
          }
        }
      }

      const parsed = parseStreamedContent(rawStreamContent);
      finalEmailCopy = parsed.emailCopy;
      finalClarification = parsed.clarification;
      const finalOtherContent = parsed.otherContent;
      finalThinking = parsed.thoughtContent;
      finalResponseType = parsed.responseType;
      productLinks = parsed.productLinks;

      finalContent =
        finalResponseType === 'clarification'
          ? finalClarification
          : finalResponseType === 'other'
            ? finalOtherContent
            : finalEmailCopy || parsed.clarification || streamingContent.trim();
      finalContent = stripControlMarkers(finalContent);

      const metadataPayload: Record<string, any> = {
        responseType: finalResponseType,
      };
      if (productLinks.length > 0) {
        metadataPayload.productLinks = productLinks;
      }
      if (finalResponseType === 'clarification' && finalClarification) {
        metadataPayload.clarification = finalClarification;
      }
      const metadataToSave = Object.keys(metadataPayload).length > 0 ? metadataPayload : null;

      setMessages((prev) =>
        prev.map((msg, idx) =>
          idx === lastAIMessageIndex
            ? {
                ...msg,
                content: finalContent,
                thinking: finalThinking,
                metadata: {
                  ...msg.metadata,
                  ...metadataPayload,
                },
              }
            : msg
        )
      );

      // IMPORTANT: Reset status to idle
      logger.log('[RegenerateSection] Completed, resetting status to idle');
      setAiStatus('idle');
      setSending(false);

      // Update message in database
      await supabase
        .from('messages')
        .update({
          content: sanitizeContent(finalContent),
          thinking: finalThinking ? sanitizeContent(finalThinking) : null,
          metadata: metadataToSave,
        })
        .eq('id', messages[lastAIMessageIndex].id);

      toast.success('Section regenerated!');
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast.error('Generation stopped');
      } else {
        logger.error('Error regenerating section:', error);
        toast.error('Failed to regenerate section');
      }
      // CRITICAL: Always reset status to idle
      logger.log('[RegenerateSection] Error occurred, resetting status to idle');
      setAiStatus('idle');
    } finally {
      // CRITICAL: Always reset
      logger.log('[RegenerateSection] Finally block, ensuring all reset');
      setSending(false);
      setAiStatus('idle');
      setRegeneratingMessageId(null);
      abortControllerRef.current = null;
    }
  };

  const handleEditMessage = async (messageIndex: number, newContent: string) => {
    if (!currentConversation) return;

    try {
      const messageToEdit = messages[messageIndex];
      
      // Update the message in the database
      await supabase
        .from('messages')
        .update({ 
          content: newContent,
          edited_at: new Date().toISOString(),
        })
        .eq('id', messageToEdit.id);

      // Delete all messages after this one
      const messagesToDelete = messages.slice(messageIndex + 1);
      if (messagesToDelete.length > 0) {
        await supabase
          .from('messages')
          .delete()
          .in('id', messagesToDelete.map(m => m.id));
      }

      // Update local state
      setMessages(prev => prev.slice(0, messageIndex + 1).map((msg, idx) =>
        idx === messageIndex 
          ? { ...msg, content: newContent, edited_at: new Date().toISOString() }
          : msg
      ));

      // Automatically regenerate the AI response
      toast.success('Message edited. Regenerating response...');
      
      // Trigger new AI response
      await handleSendMessage(newContent, true);
    } catch (error) {
      logger.error('Error editing message:', error);
      toast.error('Failed to edit message');
    }
  };

  const handleMessageReaction = async (messageId: string, reaction: 'thumbs_up' | 'thumbs_down') => {
    // Store reaction in metadata (optional - for analytics)
    try {
      const message = messages.find(m => m.id === messageId);
      if (!message) return;

      const metadata = message.metadata || {};
      await supabase
        .from('messages')
        .update({
          metadata: { ...metadata, reaction } as any,
        })
        .eq('id', messageId);

      toast.success(reaction === 'thumbs_up' ? 'Thanks for the feedback!' : "We'll try to do better");
    } catch (error) {
      logger.error('Error saving reaction:', error);
    }
  };

  const handleSendMessage = async (content: string, skipUserMessage: boolean = false) => {
    if (!currentConversation || !brand) {
      toast.error('Please create a conversation first');
      return;
    }

    // Check if offline
    if (!isOnline) {
      const queuedMsg = addToQueue(currentConversation.id, content);
      toast("You're offline. Message will be sent when you're back online.", {
        icon: '📡',
      });
      return;
    }

    // IMMEDIATE FEEDBACK: Show user message and loading state instantly
    const tempUserMessage: Message | null = !skipUserMessage ? {
      id: `temp-${Date.now()}`,
      conversation_id: currentConversation.id,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    } : null;
    
    if (tempUserMessage) {
      setMessages((prev) => [...prev, tempUserMessage]);
    }
    
    setSending(true);
    setAiStatus('analyzing_brand');
    
    // Update sidebar status
    sidebarState.updateConversationStatus(currentConversation.id, 'ai_responding', 0);
    
    // Clear draft
    clearDraft(currentConversation.id);
    setDraftContent('');

    let currentController: AbortController | null = null;
    let aiMessageId: string | null = null; // Declare outside try block for catch block access

    try {
      let userMessage: Message | undefined;
      
      // Only save user message if not editing
      if (!skipUserMessage) {
        const { data, error: userError } = await supabase
          .from('messages')
          .insert({
            conversation_id: currentConversation.id,
            role: 'user',
            content,
          })
          .select()
          .single();

        if (userError) throw userError;
        userMessage = data;
        
        // Replace temp user message with real saved one
        setMessages((prev) => prev.map(msg => 
          msg.id === tempUserMessage?.id ? userMessage! : msg
        ));
      } else {
        // Use the last user message
        userMessage = messages.filter(m => m.role === 'user').pop();
      }

      if (!userMessage) {
        throw new Error('No user message found');
      }

      // Update conversation title if it's the first message
      if (messages.length === 0) {
        const title = await generateTitle(content, currentConversation.id);
        // Update optimistically
        setCurrentConversation({ ...currentConversation, title });
        await loadConversations();
      } else {
        // Update conversation timestamp
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', currentConversation.id);
      }

      // Create abort controller for this request
      abortControllerRef.current = new AbortController();
      currentController = abortControllerRef.current; // Capture reference

      // Check if user is approving an outline
      if (currentConversation.is_flow && pendingOutlineApproval && isOutlineApprovalMessage(content)) {
        // User approved the outline! Don't send message, just approve
        setSending(false);
        await handleApproveOutline(pendingOutlineApproval);
        return;
      }

      // Call AI API with streaming
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          modelId: selectedModel,
          brandContext: brand,
          conversationMode: conversationMode,
          conversationId: currentConversation.id,
          emailType: emailType,
          // Add flow parameters if in flow mode
          isFlowMode: currentConversation.is_flow && !flowOutline?.approved,
          flowType: currentConversation.flow_type,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to get AI response';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch {
          // If not JSON, use the raw text if available
          if (errorText) {
            errorMessage = `${errorMessage}: ${errorText}`;
          }
        }
        logger.error('API Error:', { status: response.status, message: errorMessage });
        throw new Error(errorMessage);
      }

      // Create placeholder for AI message
      aiMessageId = crypto.randomUUID();
      const aiMessage: Message = {
        id: aiMessageId,
        conversation_id: currentConversation.id,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      
      // Scroll to show the activity indicator at the top
      setTimeout(() => {
        requestAnimationFrame(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }, 100);

      logger.log('[Stream] Created AI placeholder:', aiMessageId);

      // Read streaming response with advanced parser and recovery
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let streamState = createStreamState();
      let productLinks: ProductLink[] = [];
      let checkpointCounter = 0;
      let rawStreamContent = ''; // Accumulate full raw content for debugging
      let allStreamedContent = ''; // Accumulate text content (email copy)
      let allThinkingContent = ''; // Accumulate thinking content separately
      let finalEmailCopy = ''; // Final parsed email copy
      let finalClarification = ''; // Final parsed clarification copy
      let finalThinking = ''; // Final parsed thinking content
      let finalResponseType: 'email_copy' | 'clarification' | 'other' = 'other';
      let finalContent = ''; // Final response content (email or clarification)
      const CHECKPOINT_INTERVAL = 100; // Create checkpoint every 100 chunks
      
      // Throttle UI updates to 60fps max for smoother performance
      let lastUpdateTime = 0;
      const UPDATE_THROTTLE = 16; // ~60fps (1000ms / 60 = 16.67ms)
      let pendingUpdate = false;

      logger.log('[Stream] Starting to read response...');
      logger.log('═'.repeat(70));
      logger.log('🔍 DEBUG MODE: RAW API RESPONSE LOGGING ENABLED');
      logger.log('═'.repeat(70));
      
      if (reader) {
        try {
          let buffer = ''; // Buffer for incomplete JSON messages
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              logger.log('═'.repeat(70));
              logger.log('📊 STREAM COMPLETE - FULL RAW CONTENT:');
              logger.log('═'.repeat(70));
              logger.log(rawStreamContent);
              logger.log('═'.repeat(70));
              logger.log('📏 Total Length:', rawStreamContent.length, 'characters');
              logger.log('═'.repeat(70));
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            
            rawStreamContent += chunk; // Accumulate for debugging
            
            // Parse JSON messages (one per line)
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer
            
            for (const line of lines) {
              if (!line.trim()) continue;
              
              try {
                const message = JSON.parse(line);
                logger.log('📨 Parsed message:', message.type, message);
                
                switch (message.type) {
                  case 'status':
                    setAiStatus(message.status as AIStatus);
                    // Update sidebar status for thinking or web search
                    if (message.status === 'thinking') {
                      sidebarState.updateConversationStatus(currentConversation.id, 'ai_responding', 5);
                    } else if (message.status === 'searching_web') {
                      sidebarState.updateConversationStatus(currentConversation.id, 'ai_responding', 8);
                    }
                    break;
                    
                  case 'thinking_start':
                    setAiStatus('thinking');
                    break;
                    
                  case 'thinking':
                    // Accumulate thinking content
                    allThinkingContent += message.content;
                    // Update message to show thinking in real-time
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === aiMessageId
                          ? { ...msg, thinking: allThinkingContent, content: '' }
                          : msg
                      )
                    );
                    break;
                    
                  case 'thinking_end':
                    setAiStatus('analyzing_brand');
                    break;
                    
                  case 'tool_use':
                    if (message.status === 'start') {
                      logger.log(`[Tool] ${message.tool} started`);
                      setAiStatus('searching_web');
                      
                      // Add web search indicator to thinking content for UI display
                      if (message.tool === 'web_search') {
                        allThinkingContent += `\n\n[Using web search to find information...]\n\n`;
                        // Update message to show the indicator immediately
                        setMessages((prev) =>
                          prev.map((msg) =>
                            msg.id === aiMessageId
                              ? { ...msg, thinking: allThinkingContent, content: allStreamedContent }
                              : msg
                          )
                        );
                      }
                    } else if (message.status === 'end') {
                      logger.log(`[Tool] ${message.tool} completed`);
                      
                      // Add web search complete indicator
                      if (message.tool === 'web_search') {
                        allThinkingContent += `[Web search complete]\n\n`;
                        // Update message to show completion
                        setMessages((prev) =>
                          prev.map((msg) =>
                            msg.id === aiMessageId
                              ? { ...msg, thinking: allThinkingContent, content: allStreamedContent }
                              : msg
                          )
                        );
                      }
                    }
                    break;
                    
                  case 'text':
                    // Clean text content (the actual email copy)
                    {
                      const cleanChunk = message.content;
                      allStreamedContent += cleanChunk;
              
                      // Throttle UI updates to prevent choppy scrolling
                      const now = Date.now();
                      if (now - lastUpdateTime >= UPDATE_THROTTLE || !pendingUpdate) {
                        lastUpdateTime = now;
                        pendingUpdate = true;
                        
                        // Use requestAnimationFrame for smoother updates
                        requestAnimationFrame(() => {
                          setMessages((prev) => {
                            const updated = prev.map((msg) =>
                              msg.id === aiMessageId
                                ? { ...msg, content: allStreamedContent, thinking: allThinkingContent }
                                : msg
                            );
                            
                            if (checkpointCounter % 50 === 0) {
                              logger.log('[Stream] Updating content, length:', allStreamedContent.length);
                            }
                            
                            return updated;
                          });
                          pendingUpdate = false;
                        });
                      }
                      
                      checkpointCounter++;
                    }
                    break;
                    
                  case 'products':
                    productLinks = message.products || [];
                    logger.log('[Stream] Received product links:', productLinks.length);
                    break;
                    
                  default:
                    logger.warn('[Stream] Unknown message type:', message.type);
                }
              } catch (error) {
                logger.error('[Stream] Error parsing JSON message:', error, 'Line:', line);
              }
            }
            
            // Create checkpoint periodically for recovery
            if (checkpointCounter % CHECKPOINT_INTERVAL === 0) {
              saveCheckpoint({
                conversationId: currentConversation.id,
                messageId: aiMessageId,
                content: rawStreamContent,
                timestamp: Date.now(),
                isComplete: false,
              });
            }
          }
          
          // ====================================================================
          // POST-PROCESSING: Content is already clean!
          // ====================================================================
          
          logger.log('[PostProcess] Stream complete!');
          logger.log('[PostProcess] Total content:', allStreamedContent.length, 'chars');
          logger.log('[PostProcess] Total thinking:', allThinkingContent.length, 'chars');
          logger.log('[PostProcess] Product links:', productLinks.length);
          
          logger.log('═'.repeat(70));
          logger.log('✅ FINAL CLEAN CONTENT:');
          logger.log('═'.repeat(70));
          logger.log('Content preview:', allStreamedContent.substring(0, 300));
          logger.log('Thinking preview:', allThinkingContent.substring(0, 300));
          logger.log('═'.repeat(70));
          
          // Content is already clean from the structured messages!
          finalThinking = allThinkingContent;
          finalEmailCopy = allStreamedContent;
          finalClarification = '';
          const finalOtherContent = '';
          finalResponseType = 'email_copy';
          // productLinks already set from messages

          // Ensure finalContent is always a valid string
          finalContent =
            finalResponseType === 'clarification'
              ? (finalClarification || '')
              : finalResponseType === 'other'
                ? (finalOtherContent || '')
                : (finalEmailCopy || finalClarification || finalOtherContent || '');
          
          finalContent = stripControlMarkers(finalContent);
          
          logger.log('═'.repeat(70));
          logger.log('✅ FINAL CONTENT TO DISPLAY:');
          logger.log('═'.repeat(70));
          logger.log(finalContent);
          logger.log('═'.repeat(70));

          logger.log('[PostProcess] Final separation:', {
            responseType: finalResponseType,
            emailCopyLength: finalEmailCopy.length,
            clarificationLength: finalClarification.length,
            thinkingLength: finalThinking.length,
            productLinks: productLinks.length,
          });

          const existingMessage = messages.find((msg) => msg.id === aiMessageId);
          const baseMetadata = existingMessage?.metadata || {};

          // Final update with cleanly separated content and metadata
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId
                ? {
                    ...msg,
                    content: finalContent,
                    thinking: finalThinking,
                    metadata: {
                      ...baseMetadata,
                      productLinks,
                      responseType: finalResponseType,
                      clarification: finalClarification || undefined,
                    },
                  }
                : msg
            )
          );
          
          // Clear checkpoint after successful completion
          clearCheckpoint(aiMessageId);
        } catch (streamError) {
          // Try to recover from last checkpoint
          const recovered = loadCheckpoint(aiMessageId);
          if (recovered) {
            logger.log('[Recovery] Recovered stream from checkpoint:', recovered.content.length, 'chars');
            
            // Re-parse the recovered content to separate fields
            rawStreamContent = recovered.content;
            const parsed = parseStreamedContent(rawStreamContent);

              finalThinking = parsed.thoughtContent;
            finalEmailCopy = parsed.emailCopy;
            finalClarification = parsed.clarification;
            finalResponseType = parsed.responseType;
            productLinks = parsed.productLinks;

            // Ensure finalContent is always a valid string (recovery path)
            finalContent =
              finalResponseType === 'clarification'
                ? (finalClarification || '')
                : (finalEmailCopy || parsed.clarification || '');
            finalContent = stripControlMarkers(finalContent);

            logger.log('[Recovery] Parsed recovered content:', {
              responseType: finalResponseType,
              emailCopyLength: finalEmailCopy.length,
              clarificationLength: finalClarification.length,
              thinkingLength: finalThinking.length,
            });

            const existingMessage = messages.find((msg) => msg.id === aiMessageId);
            const baseMetadata = existingMessage?.metadata || {};
            
            // Update UI with recovered content
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === aiMessageId
                  ? {
                      ...msg,
                      content: finalContent,
                      thinking: finalThinking,
                      metadata: {
                        ...baseMetadata,
                        productLinks,
                        responseType: finalResponseType,
                        clarification: finalClarification || undefined,
                      },
                    }
                  : msg
              )
            );
            
            logger.log('[Recovery] Recovery successful - continuing to save recovered content to database');
            // DON'T re-throw - let execution continue to save the recovered content
          } else {
            // No checkpoint found - recovery failed, re-throw the error
            logger.log('[Recovery] No checkpoint found for recovery - re-throwing error');
            throw streamError;
          }
        }
      } else {
        // No readable stream available - this should never happen with proper API responses
        logger.error('[Stream] No readable stream available from response');
        throw new Error('No readable stream available from response. The API may not support streaming.');
      }

      // Validate that we have usable parsed content before proceeding
      // Check the parsed outputs (finalContent or finalThinking), not raw stream data
      // This allows legitimate partial responses (thinking without copy, or clarification requests)
      if (!finalContent && !finalThinking) {
        logger.error('[Stream] No usable content after parsing. Raw stream length:', allStreamedContent.length);
        logger.error('[Stream] First 200 chars of raw stream:', allStreamedContent.substring(0, 200));
        throw new Error('No usable content could be extracted from the response. The AI may have returned an empty or malformed response.');
      }

      const fullContent = finalContent;

      // IMPORTANT: Reset AI status to idle IMMEDIATELY after stream completes
      logger.log('[Stream] Completed successfully, resetting status to idle');
      setAiStatus('idle');
      setSending(false);
      
      // Update sidebar status - completion
      sidebarState.updateConversationStatus(currentConversation.id, 'idle');

      // CRITICAL: Validate content before saving
      const trimmedContent = finalContent?.trim() || '';
      const hasThinking = finalThinking && finalThinking.trim().length > 0;
      const hasValidContent = trimmedContent.length > 0 && trimmedContent !== ']';
      
      // Allow messages with only thinking content (for debugging/analysis purposes)
      // But reject completely empty messages
      if (!hasValidContent && !hasThinking) {
        logger.error('[Validation] Invalid final content detected:', {
          finalContentType: typeof finalContent,
          finalContentLength: finalContent?.length || 0,
          finalContentPreview: finalContent?.substring(0, 200) || 'undefined',
          responseType: finalResponseType,
          emailCopyLength: finalEmailCopy?.length || 0,
          emailCopyPreview: finalEmailCopy?.substring(0, 200) || 'empty',
          clarificationLength: finalClarification?.length || 0,
          clarificationPreview: finalClarification?.substring(0, 200) || 'empty',
          rawStreamLength: rawStreamContent?.length || 0,
          rawStreamPreview: rawStreamContent?.substring(0, 1000) || 'empty',
          hasThinking,
          thinkingLength: finalThinking?.length || 0
        });
        throw new Error('No valid content generated - refusing to save empty message. The AI response may have been malformed or contained only control markers.');
      }
      
      // Warn if content looks suspicious but allow it
      if (hasValidContent && trimmedContent.length < 10) {
        logger.warn('[Validation] Suspiciously short content detected:', {
          content: trimmedContent,
          length: trimmedContent.length,
          responseType: finalResponseType
        });
      }

      // Sanitize content before saving to database (XSS protection)
      const sanitizedContent = sanitizeContent(finalContent);
      const sanitizedThinking = finalThinking ? sanitizeContent(finalThinking) : null;
      const metadataPayload: Record<string, any> = {
        responseType: finalResponseType,
      };
      if (productLinks.length > 0) {
        metadataPayload.productLinks = productLinks;
      }
      if (finalResponseType === 'clarification' && finalClarification) {
        metadataPayload.clarification = finalClarification;
      }
      const metadataToSave = Object.keys(metadataPayload).length > 0 ? metadataPayload : null;

      // Save complete AI message to database with product links and thinking
      logger.log('[Database] Saving message with product links:', productLinks.length, 'links');
      if (productLinks.length > 0) {
        logger.log('[Database] Product links to save:', productLinks);
      }
      
      // Verify user session before inserting (RLS requires it)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        logger.error('[Database] No authenticated user - cannot save message');
        throw new Error('Not authenticated');
      }
      
      logger.log('[Database] User authenticated:', user.id);
      logger.log('[Database] Conversation ID:', currentConversation.id);
      logger.log('[Database] Brand ID:', brand.id);
      
      const { data: savedAiMessage, error: aiError } = await supabase
        .from('messages')
        .insert({
          conversation_id: currentConversation.id,
          role: 'assistant',
          content: sanitizedContent,
          thinking: sanitizedThinking,
          metadata: metadataToSave,
        })
        .select()
        .single();

      if (aiError) {
        logger.error('[Database] Error saving message:', aiError);
        logger.error('[Database] Error details:', {
          message: aiError.message,
          code: aiError.code,
          details: aiError.details,
          hint: aiError.hint,
        });
        throw aiError;
      }

      // Replace placeholder with saved message and remove any duplicates
      setMessages((prev) => {
        logger.log('[Messages] Replacing AI placeholder. Prev count:', prev.length);
        logger.log('[Messages] Placeholder ID:', aiMessageId, 'Saved ID:', savedAiMessage.id);
        
        // First, filter out any existing instances of the saved message ID
        const withoutDuplicates = prev.filter(msg => msg.id !== savedAiMessage.id);
        // Then replace the placeholder with the saved message
        const updated = withoutDuplicates.map((msg) => (msg.id === aiMessageId ? savedAiMessage : msg));
        
        logger.log('[Messages] Final count:', updated.length);
        return updated;
      });
      
      // Update cache with new messages
      if (userMessage && savedAiMessage) {
        addCachedMessage(currentConversation.id, userMessage);
        addCachedMessage(currentConversation.id, savedAiMessage);
      }
      
      // Detect campaign ideas in planning mode
      if (conversationMode === 'planning' && finalResponseType === 'email_copy' && finalEmailCopy) {
        logger.log('[Campaign] Checking for campaign idea in planning mode');
        logger.log('[Campaign] Full content length:', finalEmailCopy.length);
        logger.log('[Campaign] Content preview:', finalEmailCopy.substring(0, 200));
        
        const campaignIdea = extractCampaignIdea(finalEmailCopy);
        logger.log('[Campaign] Extracted campaign idea:', campaignIdea);
        
        if (campaignIdea) {
          logger.log('[Campaign] Setting detected campaign:', campaignIdea.title);
          setDetectedCampaign({
            title: campaignIdea.title,
            brief: campaignIdea.brief
          });
        } else {
          logger.log('[Campaign] No campaign idea detected');
        }
      } else if (conversationMode === 'planning') {
        logger.log('[Campaign] Skipping campaign detection (response is not email copy)');
      }
      
      // Cache the response for potential regenerations
      cacheResponse(
        generateCacheKey([...messages, userMessage!], selectedModel, brandId),
        fullContent,
        selectedModel,
        productLinks
      );
      
      trackEvent('message_sent', {
        conversationId: currentConversation.id,
        model: selectedModel,
        mode: conversationMode,
        messageLength: content.length,
        responseLength: fullContent.length
      });
    } catch (error: any) {
      // Remove the placeholder AI message on error (if it was created)
      if (aiMessageId) {
        setMessages((prev) => prev.filter((msg) => msg.id !== aiMessageId));
        logger.log('[Error] Removed placeholder AI message:', aiMessageId);
      }
      
      if (error.name === 'AbortError') {
        toast.error('Generation stopped');
        sidebarState.updateConversationStatus(currentConversation.id, 'idle');
      } else {
        // Enhanced error logging for better debugging
        logger.error('Error sending message:', {
          message: error?.message || 'Unknown error',
          name: error?.name,
          stack: error?.stack,
          error: error
        });
        
        // Show more specific error message to user
        const errorMessage = error?.message || 'Failed to send message';
        toast.error(errorMessage);
        sidebarState.updateConversationStatus(currentConversation.id, 'error');
      }
      // CRITICAL: Always reset status to idle
      logger.log('[Stream] Error occurred, resetting status to idle');
      setAiStatus('idle');
    } finally {
      // CRITICAL: Always reset sending to false
      logger.log('[Stream] Finally block, ensuring sending=false and status=idle');
      setSending(false);
      setAiStatus('idle');
      // Only clear if this is still the current controller
      if (abortControllerRef.current === currentController) {
        abortControllerRef.current = null;
      }
    }
  };

  // Assign loadConversations to ref after it's defined
  loadConversationsRef.current = loadConversations;
  
  // Memoize filtered conversations with status to reduce re-renders
  const filteredConversationsWithStatus = useMemo(() => {
    return sidebarState.conversationsWithStatus.filter(conv => 
      filteredConversations.some(fc => fc.id === conv.id) && 
      !conv.parent_conversation_id // Don't show children in main list
    );
  }, [sidebarState.conversationsWithStatus, filteredConversations]);

  // Debug: Log what's being shown in sidebar
  useEffect(() => {
    const flowConvs = filteredConversationsWithStatus.filter(c => c.is_flow);
    if (flowConvs.length > 0) {
      logger.log('[Sidebar] Flow conversations to display:', flowConvs.map(c => ({
        id: c.id,
        title: c.title,
        is_flow: c.is_flow,
        flow_type: c.flow_type
      })));
    }
  }, [filteredConversationsWithStatus]);

  if (loading) {
    return <ChatPageSkeleton />;
  }

  if (!brand) {
    return null;
  }

  const flowCreationPanel = showFlowTypeSelector && !currentConversation?.is_flow ? (
    <Suspense
      fallback={
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl h-60 animate-pulse" />
      }
    >
      <SectionErrorBoundary sectionName="flow creation panel">
        <FlowCreationPanel
          onCreate={(flowType) => handleSelectFlowType(flowType)}
          onCancel={() => {
            setShowFlowTypeSelector(false);
            setEmailType('design');
          }}
        />
      </SectionErrorBoundary>
    </Suspense>
  ) : null;

  const flowGuidanceCard = currentConversation?.is_flow &&
    messages.length === 0 &&
    !pendingOutlineApproval
      ? (
        <FlowGuidanceCard
          flowType={(currentConversation.flow_type ?? selectedFlowType) || null}
          onPromptSelect={handleFlowPromptSelect}
        />
      )
      : null;

  return (
    <div className="relative h-screen bg-[#fcfcfc] dark:bg-gray-950 overflow-hidden">
      <Toaster position="top-right" />
      
      {/* Subtle loading progress bar at top */}
      {loadingMessages && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-500 z-50 animate-pulse">
          <div className="h-full bg-blue-400 dark:bg-blue-300 animate-shimmer"></div>
        </div>
      )}
      
      {/* Enhanced Sidebar and Main Content with Resizable Panels */}
      <ResizablePanelGroup 
        direction="horizontal" 
        className="h-screen"
        autoSaveId="chat-layout-panels"
      >
        {/* Sidebar Panel - Desktop only, mobile uses overlay */}
        <SidebarPanelWrapper
          defaultSize={25}
          minSize={5}
          maxSize={40}
          collapsedSize={5}
          className="hidden lg:block"
        >
          <SectionErrorBoundary sectionName="sidebar">
            <ChatSidebarEnhanced
              brandName={brand.name}
              brandId={brandId}
              conversations={filteredConversationsWithStatus}
              currentConversationId={currentConversation?.id || null}
              teamMembers={teamMembers}
              currentFilter={currentFilter}
              selectedPersonId={selectedPersonId}
              pinnedConversationIds={sidebarState.pinnedConversationIds}
              viewMode={sidebarState.viewMode}
              isMobileOpen={isMobileSidebarOpen}
              onMobileToggle={setIsMobileSidebarOpen}
              onFilterChange={handleFilterChange}
              onNewConversation={handleNewConversation}
              onSelectConversation={handleSelectConversation}
              onDeleteConversation={handleDeleteConversation}
              onRenameConversation={handleRenameConversation}
              onPrefetchConversation={handlePrefetchConversation}
              onQuickAction={sidebarState.handleQuickAction}
              onViewModeChange={sidebarState.setViewMode}
              onSidebarWidthChange={sidebarState.setSidebarWidth}
              onBulkAction={handleBulkAction}
              initialWidth={sidebarState.sidebarWidth}
              allBrands={allBrands}
              onBrandSwitch={(newBrandId) => router.push(`/brands/${newBrandId}/chat`)}
              onNavigateHome={() => router.push('/')}
              onNewFlow={() => {
                handleNewConversation();
                setShowFlowTypeSelector(true);
              }}
              isCreatingEmail={isCreatingEmail}
              isCreatingFlow={isCreatingFlow}
            />
          </SectionErrorBoundary>
        </SidebarPanelWrapper>

        {/* Mobile Sidebar Overlay */}
        <div className="lg:hidden">
        <SectionErrorBoundary sectionName="sidebar">
          <ChatSidebarEnhanced
            brandName={brand.name}
            brandId={brandId}
            conversations={filteredConversationsWithStatus}
            currentConversationId={currentConversation?.id || null}
            teamMembers={teamMembers}
            currentFilter={currentFilter}
            selectedPersonId={selectedPersonId}
            pinnedConversationIds={sidebarState.pinnedConversationIds}
            viewMode={sidebarState.viewMode}
            isMobileOpen={isMobileSidebarOpen}
            onMobileToggle={setIsMobileSidebarOpen}
            onFilterChange={handleFilterChange}
            onNewConversation={handleNewConversation}
            onSelectConversation={handleSelectConversation}
            onDeleteConversation={handleDeleteConversation}
            onRenameConversation={handleRenameConversation}
            onPrefetchConversation={handlePrefetchConversation}
            onQuickAction={sidebarState.handleQuickAction}
            onViewModeChange={sidebarState.setViewMode}
            onSidebarWidthChange={sidebarState.setSidebarWidth}
            onBulkAction={handleBulkAction}
            initialWidth={sidebarState.sidebarWidth}
            allBrands={allBrands}
            onBrandSwitch={(newBrandId) => router.push(`/brands/${newBrandId}/chat`)}
            onNavigateHome={() => router.push('/')}
            onNewFlow={() => {
              handleNewConversation();
              setShowFlowTypeSelector(true);
            }}
            isCreatingEmail={isCreatingEmail}
            isCreatingFlow={isCreatingFlow}
          />
        </SectionErrorBoundary>
        </div>

        {/* Resizable Handle - Desktop only */}
        <ResizableHandle withHandle className="hidden lg:flex" />

        {/* Main chat area */}
        <ResizablePanel 
          id="main-chat-panel"
          defaultSize={75} 
          minSize={50} 
          className="min-w-0"
        >
          <div className="flex flex-col h-screen w-full min-w-0">
        {/* Enhanced Navigation Header - Cleaner without breadcrumb */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          {/* Mobile hamburger menu - only visible on mobile */}
          <div className="lg:hidden px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
              aria-label="Open sidebar"
            >
              <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Flow Navigation for child conversations */}
          {currentConversation?.parent_conversation_id && parentFlow && (
            <FlowNavigation
              parentFlow={parentFlow}
              currentConversation={currentConversation}
              brandId={brandId}
              onNavigateToParent={() => {
                const parent = conversations.find(c => c.id === currentConversation.parent_conversation_id);
                if (parent) {
                  handleSelectConversation(parent.id);
                }
              }}
            />
          )}

          {/* Conversation Info Bar - Clean and Minimal */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Conversation Title */}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                  {currentConversation?.title || 'No Conversation Selected'}
                </h2>
              </div>
              
              {/* Action buttons */}
              {currentConversation && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-600 dark:text-gray-400"
                    title="Share Conversation"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      const newState = !commentsSidebarCollapsed;
                      console.log('[Comments Toggle] Changing from', commentsSidebarCollapsed, 'to', newState);
                      setCommentsSidebarCollapsed(newState);
                      // Removed toast notification - visual feedback is immediate via panel
                    }}
                    className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors ${commentsSidebarCollapsed ? 'text-gray-600 dark:text-gray-400' : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'}`}
                    title={commentsSidebarCollapsed ? 'Show comments' : 'Hide comments'}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </button>
                  <button
                    data-conversation-menu-trigger
                    onClick={() => setShowConversationMenu(!showConversationMenu)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-600 dark:text-gray-400"
                    title="Conversation Options"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Conversation Options Menu */}
          {showConversationMenu && currentConversation && (
            <Suspense fallback={null}>
              <ConversationOptionsMenu
                conversationId={currentConversation.id}
                conversationTitle={currentConversation.title || 'Conversation'}
                onShowMemory={() => setShowMemorySettings(true)}
                onToggleTheme={() => {
                  // Trigger theme toggle
                  const themeButton = document.querySelector('[data-theme-toggle]');
                  if (themeButton instanceof HTMLElement) {
                    themeButton.click();
                  }
                }}
                onClose={() => setShowConversationMenu(false)}
              />
            </Suspense>
          )}
        </div>

        {/* Messages */}
        <div className="relative flex-1">
          <div 
            ref={messagesScrollRef}
            className="absolute inset-0 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 bg-[#fcfcfc] dark:bg-gray-950"
            style={{
              // Hardware acceleration and smooth scrolling
              willChange: 'scroll-position',
              WebkitOverflowScrolling: 'touch',
              // Optimize scroll performance
              scrollBehavior: 'smooth',
              // Reduce layout thrashing
              contain: 'layout style paint',
            }}
          >
          {!currentConversation ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md px-4">
                <div className="mb-6">
                  <svg
                    className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  No conversation selected
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Select a conversation from the sidebar or start a new one to begin creating email copy.
                </p>
                <button
                  onClick={handleNewConversation}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer shadow-sm hover:shadow-md"
                >
                  Start New Conversation
                </button>
              </div>
            </div>
          ) : messages.length === 0 ? (
            flowCreationPanel ? (
              <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="space-y-6">{flowCreationPanel}</div>
              </div>
            ) : flowGuidanceCard ? (
              <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="space-y-6">{flowGuidanceCard}</div>
              </div>
            ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-2xl px-4 sm:px-6">
                <div className="mb-6 flex justify-center">
                  {conversationMode === 'planning' ? (
                    <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center">
                      <svg className="w-12 h-12 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center">
                      <svg className="w-12 h-12 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                  {conversationMode === 'planning' 
                    ? 'Your Brand Strategy Partner' 
                    : 'Create Your Email'}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6">
                  {conversationMode === 'planning'
                    ? 'Get marketing advice, brainstorm campaigns, explore creative ideas, and develop winning strategies for your brand.'
                    : 'Describe the email you want to create and I\'ll generate it for you with high-converting copy.'}
                </p>
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-left">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                    {conversationMode === 'planning' ? '💡 What You Can Do Here:' : '✉️ Email Copy Mode Tips:'}
                  </p>
                  {conversationMode === 'planning' ? (
                    <div className="space-y-3">
                      <div className="text-sm text-blue-800 dark:text-blue-200">
                        <p className="font-medium mb-1">💬 Get Marketing Advice</p>
                        <p className="text-xs ml-3">"What are best practices for abandoned cart emails?"</p>
                      </div>
                      <div className="text-sm text-blue-800 dark:text-blue-200">
                        <p className="font-medium mb-1">🎨 Brainstorm Creative Ideas</p>
                        <p className="text-xs ml-3">"I need creative campaign ideas for our new product launch"</p>
                      </div>
                      <div className="text-sm text-blue-800 dark:text-blue-200">
                        <p className="font-medium mb-1">🎯 Develop Strategy</p>
                        <p className="text-xs ml-3">"Help me plan a re-engagement campaign for inactive customers"</p>
                      </div>
                      <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          <strong>Note:</strong> When we develop a campaign concept together, I'll offer to create it in Writing mode.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      <li>• Be specific about your product or offer</li>
                      <li>• Mention your target audience</li>
                      <li>• Include any key details like discounts or timeframes</li>
                      <li>• Provide context about the email's purpose and goal</li>
                    </ul>
                  )}
                </div>
              </div>
            </div>
            )
          ) : loadingMessages ? (
            /* Loading skeleton with fade-in animation */
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-200">
              <div className="space-y-6">
                {flowCreationPanel}
                {flowGuidanceCard}
                <MessageSkeleton isUser />
                <MessageSkeleton />
                <MessageSkeleton isUser />
                <MessageSkeleton />
              </div>
            </div>
          ) : messages.length > 50 ? (
            /* Use virtualized list for long conversations (50+ messages) */
            <SectionErrorBoundary sectionName="message list">
              <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
                {flowCreationPanel}
                {flowGuidanceCard}
              <VirtualizedMessageList
                messages={messages}
                brandId={brandId}
                mode={conversationMode}
                sending={sending}
                regeneratingMessageId={regeneratingMessageId}
                onRegenerate={handleRegenerateMessage}
                onRegenerateSection={handleRegenerateSection}
                onEdit={handleEditMessage}
                onReaction={handleMessageReaction}
                aiStatus={aiStatus}
                starredEmailContents={starredEmailContents}
              />
              
              {/* Inline Flow Generation Progress */}
              {isGeneratingFlow && pendingOutlineApproval && (
                <FlowGenerationProgress
                  totalEmails={pendingOutlineApproval.emails.length}
                  currentEmail={flowGenerationProgress}
                  isGenerating={isGeneratingFlow}
                />
              )}
              
              <div ref={messagesEndRef} />
              
              {/* Show preparing indicator when sending but no AI message yet */}
              {sending && !isGeneratingFlow && messages.filter(m => m.role === 'assistant').length === messages.filter(m => m.role === 'user').length - 1 && (
                <div className="mb-3 inline-block">
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0ms', animationDuration: '1.4s' }}></div>
                      <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '200ms', animationDuration: '1.4s' }}></div>
                      <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '400ms', animationDuration: '1.4s' }}></div>
                    </div>
                    <span className="font-medium">preparing response</span>
                  </div>
                </div>
              )}
              </div>
            </SectionErrorBoundary>
          ) : (
            /* Regular rendering for shorter conversations */
            <SectionErrorBoundary sectionName="message list">
              <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
                {flowCreationPanel}
                {flowGuidanceCard}
                {/* Flow Outline Display for parent flow conversations */}
                {currentConversation?.is_flow && flowOutline && flowOutline.approved && (
                  <FlowOutlineDisplay
                    outline={flowOutline.outline_data}
                    mermaidChart={flowOutline.mermaid_chart}
                    children={flowChildren}
                    onSelectChild={(childId) => handleSelectConversation(childId)}
                    currentChildId={currentConversation.id}
                  />
                )}

                
                {/* Messages */}
                {messages
                  // Deduplicate messages by ID (in case of race conditions)
                  .filter((message, index, self) => 
                    index === self.findIndex(m => m.id === message.id)
                  )
                  .map((message, index) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  brandId={brandId}
                  mode={conversationMode}
                  isStarred={message.role === 'assistant' ? starredEmailContents.has(message.content) : false}
                  onRegenerate={
                    message.role === 'assistant' && index === messages.length - 1 && !sending
                      ? () => handleRegenerateMessage(index)
                      : undefined
                  }
                  onRegenerateSection={handleRegenerateSection}
                  onEdit={
                    message.role === 'user'
                      ? (newContent) => handleEditMessage(index, newContent)
                      : undefined
                  }
                  onReaction={
                    message.role === 'assistant'
                      ? (reaction) => handleMessageReaction(message.id, reaction)
                      : undefined
                  }
                  isRegenerating={regeneratingMessageId === message.id}
                  isStreaming={message.role === 'assistant' && index === messages.length - 1 && sending}
                  aiStatus={aiStatus}
                  commentCount={messageCommentCounts[message.id] || 0}
                  commentsData={messageComments[message.id] || []}
                  conversationId={currentConversation?.id}
                  onCommentClick={(highlightedText) => {
                    // If highlighted text, it's for inline comment box (handled in ChatMessage)
                    // If no highlighted text, it's clicking "View comments" - open sidebar
                    if (!highlightedText) {
                      setFocusedMessageIdForComments(message.id);
                      setCommentsSidebarCollapsed(false);
                    }
                    // Reload comment counts after inline comment is added
                    if (messages.length > 0) {
                      loadCommentCounts(messages.map(m => m.id));
                    }
                  }}
                />
              ))}
              
              {/* Inline Flow Generation Progress */}
              {isGeneratingFlow && pendingOutlineApproval && (
                <FlowGenerationProgress
                  totalEmails={pendingOutlineApproval.emails.length}
                  currentEmail={flowGenerationProgress}
                  isGenerating={isGeneratingFlow}
                />
              )}
              
              <div ref={messagesEndRef} />
              
              {/* Show preparing indicator when sending but no AI message yet */}
              {sending && !isGeneratingFlow && messages.filter(m => m.role === 'assistant').length === messages.filter(m => m.role === 'user').length - 1 && (
                <div className="mb-3 inline-block">
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0ms', animationDuration: '1.4s' }}></div>
                      <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '200ms', animationDuration: '1.4s' }}></div>
                      <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '400ms', animationDuration: '1.4s' }}></div>
                    </div>
                    <span className="font-medium">preparing response</span>
                  </div>
                </div>
              )}
              </div>
            </SectionErrorBoundary>
          )}
        </div>

        {/* Approve Outline Button (Flow Mode) */}
        {(() => {
          const shouldShow = currentConversation?.is_flow && 
                            pendingOutlineApproval && 
                            !flowOutline?.approved && 
                            !sending;
          
          if (currentConversation?.is_flow) {
            console.log('[Approve Button Debug]', {
              isFlow: currentConversation?.is_flow,
              hasPendingOutline: !!pendingOutlineApproval,
              flowOutlineApproved: flowOutline?.approved,
              sending,
              shouldShow
            });
          }
          
          return shouldShow;
        })() && (
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <div className="max-w-4xl mx-auto">
              <Suspense fallback={<div className="p-4 text-center text-gray-500">Loading...</div>}>
                <ApproveOutlineButton
                  outline={pendingOutlineApproval!}
                  onApprove={() => handleApproveOutline(pendingOutlineApproval!)}
                  disabled={sending}
                />
              </Suspense>
            </div>
          </div>
        )}

        {/* Create Campaign Button (Planning Mode with detected campaign) */}
        {currentConversation && 
         conversationMode === 'planning' && 
         detectedCampaign && 
         messages.length > 0 &&
         messages[messages.length - 1]?.role === 'assistant' && 
         !sending && (
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <div className="max-w-4xl mx-auto">
              <InlineActionBanner
                tone="success"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                title="Campaign idea ready!"
                message={detectedCampaign.title}
                helperText="Move into Writing mode to turn this concept into a polished email."
                action={{
                  label: 'Create Campaign in Writing Mode',
                  onClick: () => handleCreateCampaignFromPlan(detectedCampaign.title, detectedCampaign.brief),
                  icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                  )
                }}
              />
            </div>
          </div>
        )}
        
          {/* Scroll to bottom button */}
          {showScrollToBottom && (
            <button
              type="button"
              onClick={scrollToBottom}
              className="hidden sm:flex items-center justify-center w-8 h-8 text-gray-400 dark:text-gray-500 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full shadow-sm border border-gray-200/50 dark:border-gray-700/50 transition-all hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-800 hover:shadow-md focus:outline-none absolute bottom-6 right-6 z-20 opacity-60 hover:opacity-100"
              title="Scroll to latest message"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
          )}
        </div>

        {/* Input */}
        {currentConversation && (
          <ChatInput
            onSend={handleSendMessage}
            onStop={handleStopGeneration}
            disabled={sending}
            isGenerating={sending}
            conversationId={currentConversation.id}
            mode={conversationMode}
            draftContent={draftContent}
            onDraftChange={handleDraftChange}
            onModeChange={handleToggleMode}
            selectedModel={selectedModel}
            onModelChange={(model) => setSelectedModel(model as AIModel)}
            emailType={emailType}
            onEmailTypeChange={handleEmailTypeChange}
            hasMessages={messages.length > 0}
            autoFocus={messages.length === 0}
          />
        )}

      {/* Offline Indicator */}
      {!isOnline && (
        <div className="fixed bottom-4 right-4 bg-orange-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
          </svg>
          <span className="text-sm font-medium">You're offline</span>
        </div>
      )}

        {/* Memory Settings Modal */}
        {showMemorySettings && currentConversation && (
          <SectionErrorBoundary sectionName="memory settings">
            <MemorySettings
              conversationId={currentConversation.id}
              onClose={() => setShowMemorySettings(false)}
            />
          </SectionErrorBoundary>
        )}

        {/* Share Modal */}
        {showShareModal && currentConversation && (
          <Suspense fallback={null}>
            <ShareModal
              conversationId={currentConversation.id}
              isOpen={showShareModal}
              onClose={() => setShowShareModal(false)}
            />
          </Suspense>
        )}

        {/* Active Jobs Indicator */}
        <ActiveJobsIndicator />
        
        {/* Command Palette and Keyboard Shortcuts are now global - see layout.tsx */}
        </div>
        </ResizablePanel>

        {/* Comments Sidebar - Resizable */}
        {!commentsSidebarCollapsed && currentConversation && (
          <>
            <ResizableHandle 
              withHandle 
              className="w-px bg-gray-200 dark:bg-gray-700 hover:bg-blue-500 dark:hover:bg-blue-500 transition-all data-[resize-handle-active]:bg-blue-500"
              style={{ cursor: 'col-resize' }}
            />
            <ResizablePanel 
              id="comments-panel"
              defaultSize={25} 
              minSize={15} 
              maxSize={40}
              className="min-w-0"
            >
              <Suspense fallback={
                <div className="h-full bg-white dark:bg-gray-950 p-4">
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse flex gap-3">
                        <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-800"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-24"></div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-full"></div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              }>
                <CommentsSidebar
                  conversationId={currentConversation.id}
                  focusedMessageId={focusedMessageIdForComments}
                  highlightedText={highlightedTextForComment}
                  onHighlightedTextUsed={() => setHighlightedTextForComment(null)}
                  onSendToChat={(text) => {
                    setDraftContent(prev => prev ? `${prev}\n\n${text}` : text);
                    // Removed toast notification - text appears in input immediately
                  }}
                />
              </Suspense>
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}

