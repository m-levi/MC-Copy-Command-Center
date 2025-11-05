'use client';

import { useEffect, useState, useRef, use, useMemo, useCallback, lazy, Suspense, startTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Brand, Conversation, Message, AIModel, AIStatus, PromptTemplate, ConversationMode, OrganizationMember, EmailType, FlowType, FlowOutline, FlowConversation, FlowOutlineData, BulkActionType } from '@/types';
import { AI_MODELS } from '@/lib/ai-models';
import ChatSidebarEnhanced from '@/components/ChatSidebarEnhanced';
import { useSidebarState } from '@/hooks/useSidebarState';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import AIStatusIndicator from '@/components/AIStatusIndicator';
import ThemeToggle from '@/components/ThemeToggle';
import { executeBulkAction } from '@/lib/conversation-actions';

// Lazy load heavy/optional components
const VirtualizedMessageList = lazy(() => import('@/components/VirtualizedMessageList'));
const PlanningStageIndicator = lazy(() => import('@/components/PlanningStageIndicator'));
const MemorySettings = lazy(() => import('@/components/MemorySettings'));
const FlowTypeSelector = lazy(() => import('@/components/FlowTypeSelector'));
const FlowOutlineDisplay = lazy(() => import('@/components/FlowOutlineDisplay'));
const FlowNavigation = lazy(() => import('@/components/FlowNavigation'));
const ApproveOutlineButton = lazy(() => import('@/components/ApproveOutlineButton'));
const FlowGenerationProgress = lazy(() => import('@/components/FlowGenerationProgress'));
const ConversationOptionsMenu = lazy(() => import('@/components/ConversationOptionsMenu'));
import { FilterType } from '@/components/ConversationFilterDropdown';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { useDraftSave, loadDraft, clearDraft } from '@/hooks/useDraftSave';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { useConversationCleanup } from '@/hooks/useConversationCleanup';
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
import { RequestCoalescer } from '@/lib/performance-utils';
import { trackEvent, trackPerformance } from '@/lib/analytics';
import { createStreamState, processStreamChunk, finalizeStream } from '@/lib/stream-parser';
import { 
  saveCheckpoint, 
  loadCheckpoint, 
  clearCheckpoint 
} from '@/lib/stream-recovery';
import { ChatPageSkeleton } from '@/components/SkeletonLoader';
import DOMPurify from 'dompurify';
import { detectFlowOutline, isOutlineApprovalMessage } from '@/lib/flow-outline-parser';
import { buildFlowOutlinePrompt } from '@/lib/flow-prompts';

export const dynamic = 'force-dynamic';

// Sanitize AI-generated content before saving to database
const sanitizeContent = (content: string): string => {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'code', 'pre', 'blockquote'],
    ALLOWED_ATTR: ['href', 'title', 'target'],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
};

// Clean email content by removing any preamble before the actual email structure
const cleanEmailContentFinal = (content: string): string => {
  // Remove <email_strategy> tags and everything inside them
  let cleaned = content.replace(/<email_strategy>[\s\S]*?<\/email_strategy>/gi, '');
  
  // Find the start of the actual email (look for common email markers)
  const emailStartMarkers = [
    /HERO SECTION:/i,
    /EMAIL SUBJECT LINE:/i,
    /SUBJECT LINE:/i,
  ];
  
  for (const marker of emailStartMarkers) {
    const match = cleaned.match(marker);
    if (match && match.index !== undefined && match.index > 0) {
      // Remove everything before this marker (preamble)
      cleaned = cleaned.substring(match.index);
      break;
    }
  }
  
  // Remove common meta-commentary patterns
  cleaned = cleaned
    .replace(/^I need to.*?\n\n/i, '')
    .replace(/^Let me.*?\n\n/i, '')
    .replace(/^Based on.*?\n\n/i, '')
    .replace(/^First,.*?\n\n/i, '')
    .trim();
  
  return cleaned;
};

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
  
  // Flow-related state
  const [showFlowTypeSelector, setShowFlowTypeSelector] = useState(false);
  const [selectedFlowType, setSelectedFlowType] = useState<FlowType | null>(null);
  const [flowOutline, setFlowOutline] = useState<FlowOutline | null>(null);
  const [flowChildren, setFlowChildren] = useState<Conversation[]>([]);
  const [parentFlow, setParentFlow] = useState<FlowConversation | null>(null);
  const [pendingOutlineApproval, setPendingOutlineApproval] = useState<FlowOutlineData | null>(null);
  const [isGeneratingFlow, setIsGeneratingFlow] = useState(false);
  const [flowGenerationProgress, setFlowGenerationProgress] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const brandSwitcherRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestCoalescerRef = useRef(new RequestCoalescer());
  const supabase = createClient();
  const router = useRouter();
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
  
  // Auto-save drafts
  useDraftSave(currentConversation?.id || null, draftContent);

  // Auto-cleanup empty conversations on unmount
  const { cleanupIfEmpty } = useConversationCleanup({
    conversationId: currentConversation?.id || null,
    messageCount: messages.length,
    isFlow: currentConversation?.is_flow || false,
    isChild: !!currentConversation?.parent_conversation_id,
    shouldAutoDelete: true
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
          console.log('New conversation created:', payload.new);
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
          console.log('Conversation updated:', payload.new);
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
          console.log('Conversation deleted:', payload.old);
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

  useEffect(() => {
    if (currentConversation) {
      loadMessages();
      
      // Subscribe to real-time message updates
      const messageChannel = supabase
        .channel(`messages:${currentConversation.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${currentConversation.id}`,
          },
          (payload) => {
            console.log('New message received:', payload.new);
            const newMessage = payload.new as Message;
            
            // Only add if not already in state (avoid duplicates from own sends)
            setMessages((prev) => {
              const exists = prev.some(m => m.id === newMessage.id);
              if (!exists) {
                // Update cache
                addCachedMessage(currentConversation.id, newMessage);
                trackEvent('message_received_realtime', {
                  conversationId: currentConversation.id,
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
            filter: `conversation_id=eq.${currentConversation.id}`,
          },
          (payload) => {
            console.log('Message updated:', payload.new);
            const updatedMessage = payload.new as Message;
            
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === updatedMessage.id ? updatedMessage : msg
              )
            );
            
            // Update cache
            updateCachedMessage(currentConversation.id, updatedMessage);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${currentConversation.id}`,
          },
          (payload) => {
            console.log('Message deleted:', payload.old);
            const deletedId = (payload.old as any).id;
            
            setMessages((prev) => prev.filter((msg) => msg.id !== deletedId));
          }
        )
        .subscribe();
      
      // Cleanup subscription on unmount or conversation change
      return () => {
        messageChannel.unsubscribe();
      };
    }
  }, [currentConversation]);

  useEffect(() => {
    // Only auto-scroll if NOT currently streaming
    // This lets users stay at the top and watch the indicator while AI generates
    if (!sending) {
      scrollToBottom();
    }
  }, [messages, sending]);

  // Detect flow outline in AI responses
  useEffect(() => {
    if (!currentConversation?.is_flow || !currentConversation.flow_type) return;
    if (flowOutline?.approved) return; // Don't detect if already approved
    if (messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'assistant') return;

    // Try to detect and parse outline
    const outline = detectFlowOutline(lastMessage.content, currentConversation.flow_type);
    if (outline) {
      console.log('Detected flow outline:', outline);
      setPendingOutlineApproval(outline);
    }
  }, [messages, currentConversation?.is_flow, currentConversation?.flow_type, flowOutline?.approved]);

  const scrollToBottom = useCallback(() => {
    // Use requestAnimationFrame for smoother scrolling
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }, []);

  const initializePage = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      setCurrentUserId(user.id);

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
        const { data: members } = await supabase
          .from('organization_members')
          .select(`
            id,
            organization_id,
            user_id,
            role,
            invited_by,
            joined_at,
            created_at,
            profile:profiles (
              user_id,
              email,
              full_name,
              avatar_url,
              created_at
            )
          `)
          .eq('organization_id', memberData.organization_id)
          .order('joined_at', { ascending: false });

        if (members) {
          setTeamMembers(members as unknown as OrganizationMember[]);
        }
      }

      await loadBrand();
      await loadAllBrands();
      await loadConversations();
    } catch (error) {
      console.error('Error initializing page:', error);
      toast.error('Failed to initialize page');
    }
  };

  const applyConversationFilter = useCallback(() => {
    if (currentFilter === 'all') {
      setFilteredConversations(conversations);
    } else if (currentFilter === 'mine') {
      setFilteredConversations(conversations.filter(c => c.user_id === currentUserId));
    } else if (currentFilter === 'person' && selectedPersonId) {
      setFilteredConversations(conversations.filter(c => c.user_id === selectedPersonId));
    } else {
      setFilteredConversations(conversations);
    }
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
      console.error('Error loading brand:', error);
      toast.error('Failed to load brand');
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
      console.error('Error loading brands:', error);
    }
  };

  const loadConversations = async () => {
    const startTime = performance.now();
    
    try {
      // Check cache first
      const cached = getCachedConversations(brandId);
      if (cached && cached.length > 0) {
        setConversations(cached);
        
        // DON'T auto-select - let user start fresh
        // The "No conversation selected" empty state will show instead
        
        trackPerformance('load_conversations', performance.now() - startTime, { source: 'cache' });
        
        // Refresh in background
        fetchAndCacheConversations();
        return;
      }
      
      // Load from database
      await fetchAndCacheConversations();
      trackPerformance('load_conversations', performance.now() - startTime, { source: 'database' });
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Failed to load conversations');
    }
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
      console.log('[LoadConversations] Loaded conversations:', data.length);
      console.log('[LoadConversations] Flow conversations:', data.filter(c => c.is_flow).map(c => ({
        title: c.title,
        is_flow: c.is_flow,
        flow_type: c.flow_type,
        id: c.id
      })));
      console.log('[LoadConversations] Child conversations:', data.filter(c => c.parent_conversation_id).length);
      
      cacheConversations(brandId, data);
      setConversations(data);
      
      // DON'T auto-select - let user start fresh
      // The "No conversation selected" empty state will show instead
    }
  };

  const loadMessages = async () => {
    if (!currentConversation) return;

    const startTime = performance.now();

    try {
      // Check cache first for instant loading
      const cached = getCachedMessages(currentConversation.id);
      if (cached && cached.length > 0) {
        setMessages(cached);
        setLoadingMessages(false);
        
        trackPerformance('load_messages', performance.now() - startTime, { 
          source: 'cache',
          count: cached.length 
        });
        
        // Prefetch draft
        const draft = loadDraft(currentConversation.id);
        if (draft) {
          setDraftContent(draft);
        }
        
        return;
      }

      // If not cached, loading state is already set by handleSelectConversation
      // No need to set it again here
      
      // Use request coalescer to prevent duplicate calls
      await requestCoalescerRef.current.execute(
        async () => {
          // Load from database
          const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', currentConversation.id)
            .order('created_at', { ascending: true });

          if (error) throw error;
          
          if (data) {
            cacheMessages(currentConversation.id, data);
            setMessages(data);
            trackPerformance('load_messages', performance.now() - startTime, { 
              source: 'database',
              count: data.length 
            });
          }
          
          // Load draft
          const draft = loadDraft(currentConversation.id);
          if (draft) {
            setDraftContent(draft);
          }
          
          // IMPORTANT: Hide loading state after database load
          setLoadingMessages(false);
        },
        currentConversation.id
      );
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
      setLoadingMessages(false);
    }
  };

  const handleNewConversation = async () => {
    try {
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
      if (!user) return;

      const { data, error } = await supabase
        .from('conversations')
        .insert({
          brand_id: brandId,
          user_id: user.id,
          created_by_name: currentUserName,
          title: 'New Conversation',
          model: selectedModel,
          conversation_type: 'email',
          mode: 'email_copy', // Default to email copy mode
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentConversation(data);
      setConversationMode('email_copy');
      setMessages([]);
      setEmailType('design'); // Always default to design email
      setDraftContent(''); // Clear draft when switching
      await loadConversations();
      toast.success('New conversation created');
      trackEvent('conversation_created', { conversationId: data.id });
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create conversation');
    }
  };

  const handleSelectConversation = async (conversationId: string) => {
    // Optimistically update UI immediately for instant feedback
    const conversation = conversations.find((c) => c.id === conversationId);
    if (!conversation) return;

    // Only show loading state if we don't have cached messages
    const cached = getCachedMessages(conversationId);
    if (!cached || cached.length === 0) {
      setLoadingMessages(true);
    }
    
    // Update current conversation immediately (optimistic update)
    setCurrentConversation(conversation);
    setSelectedModel(conversation.model as AIModel);
    setConversationMode(conversation.mode || 'planning');
    setDraftContent(''); // Clear draft when switching
    
    // Set email type based on conversation
    if (conversation.is_flow) {
      setEmailType('flow');
      setSelectedFlowType(conversation.flow_type || null);
    }
    
    // Abort any ongoing AI generation before switching
    if (abortControllerRef.current && sending) {
      abortControllerRef.current.abort();
      setSending(false);
      setAiStatus('idle');
      toast('Generation stopped - switching conversations', { icon: '⏹️' });
    }

    // Auto-delete current conversation if it's empty (do this after UI update)
    if (currentConversation && 
        messages.length === 0 && 
        currentConversation.id !== conversationId) {
      cleanupIfEmpty(currentConversation.id, 'empty_on_switch').catch(console.error);
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
      console.error('Error deleting conversation:', error);
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
      console.error('Error executing bulk action:', error);
      toast.error('Failed to complete bulk action');
    }
  };

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
      console.error('Error renaming conversation:', error);
      toast.error('Failed to rename conversation');
    }
  };

  const handleToggleMode = async (newMode: ConversationMode) => {
    if (!currentConversation) return;
    
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ mode: newMode })
        .eq('id', currentConversation.id);

      if (error) throw error;

      setConversationMode(newMode);
      setCurrentConversation({ ...currentConversation, mode: newMode });
      toast.success(`Switched to ${newMode === 'planning' ? 'Planning' : 'Email Copy'} mode`);
    } catch (error) {
      console.error('Error updating mode:', error);
      toast.error('Failed to update mode');
    }
  };

  // Handle email type change with Flow type selector
  const handleEmailTypeChange = (type: EmailType) => {
    if (type === 'flow') {
      // Show flow type selector modal
      setShowFlowTypeSelector(true);
    } else {
      setEmailType(type);
    }
  };

  // Handle flow type selection
  const handleSelectFlowType = async (flowType: FlowType) => {
    try {
      console.log('[Flow] Creating flow conversation for type:', flowType);
      setShowFlowTypeSelector(false);
      setSelectedFlowType(flowType);
      
      // Create new flow conversation
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        console.error('[Flow] No user found');
        return;
      }

      const flowData = {
        brand_id: brandId,
        user_id: user.user.id,
        title: `New ${flowType.replace(/_/g, ' ')} Flow`,
        model: selectedModel,
        conversation_type: 'email' as const,
        mode: 'email_copy' as const,
        is_flow: true,
        flow_type: flowType
      };

      console.log('[Flow] Inserting conversation with data:', flowData);

      const { data: newConversation, error } = await supabase
        .from('conversations')
        .insert(flowData)
        .select()
        .single();

      if (error) {
        console.error('[Flow] Error creating conversation:', error);
        throw error;
      }

      console.log('[Flow] Created conversation:', newConversation);
      console.log('[Flow] is_flow value:', newConversation.is_flow);
      console.log('[Flow] flow_type value:', newConversation.flow_type);

      // Set emailType to flow
      setEmailType('flow');
      
      // Load the new conversation
      setCurrentConversation(newConversation);
      setMessages([]);
      await loadConversations();
      
      console.log('[Flow] Conversation loaded, check sidebar for is_flow:', newConversation.is_flow);
      toast.success('Flow conversation created! Describe your automation needs.');
    } catch (error) {
      console.error('Error creating flow:', error);
      toast.error('Failed to create flow');
      // Reset email type
      setEmailType('design');
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
      console.error('Error loading flow data:', error);
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
      console.error('Error loading parent flow:', error);
    }
  };

  // Handle outline approval
  const handleApproveOutline = async (outline: FlowOutlineData) => {
    if (!currentConversation) return;
    
    try {
      setSending(true);
      setIsGeneratingFlow(true);
      setFlowGenerationProgress(0);
      
      // Simulate progress for better UX (actual generation happens on server)
      const progressInterval = setInterval(() => {
        setFlowGenerationProgress(prev => {
          if (prev >= outline.emails.length) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 1;
        });
      }, 5000); // Update every 5 seconds (approximate)
      
      const response = await fetch('/api/flows/generate-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: currentConversation.id,
          flowType: currentConversation.flow_type,
          outline,
          model: selectedModel,
          emailType: 'design' // Default to design emails for flows
        })
      });

      clearInterval(progressInterval);
      setFlowGenerationProgress(outline.emails.length);

      const result = await response.json();
      
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
        toast.error(`Generated ${result.generated} emails, but ${result.failed} failed`);
      }
    } catch (error) {
      console.error('Error approving outline:', error);
      toast.error('Failed to generate emails');
    } finally {
      setSending(false);
      setIsGeneratingFlow(false);
      setFlowGenerationProgress(0);
    }
  };

  const handleTransferPlanToEmail = async () => {
    if (!currentConversation || messages.length === 0) return;

    // Get all the conversation context
    const allMessages = messages.map(m => `${m.role === 'user' ? 'User' : 'Planning Session'}: ${m.content}`).join('\n\n---\n\n');
    
    try {
      // Switch to email copy mode
      await handleToggleMode('email_copy');

      // Create a comprehensive brief from the planning conversation
      const briefPrompt = `Based on our planning discussion, create an email campaign. Here's what we discussed:

${allMessages.substring(0, 2000)}${allMessages.length > 2000 ? '\n\n[Additional context from planning conversation]' : ''}

Please generate the complete email copy following all the guidelines we discussed in the planning phase.`;
      
      // Pre-fill the input with the comprehensive brief
      setDraftContent(briefPrompt);
      
      toast.success('Plan transferred to Email Copy mode! Review the brief and click send to generate.');
    } catch (error) {
      console.error('Error transferring plan:', error);
      toast.error('Failed to transfer plan');
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
      console.error('Error auto-generating title:', error);
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
        console.error('API Error (regenerate):', { status: response.status, message: errorMessage });
        throw new Error(errorMessage);
      }

      // Read streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          
          // Parse status markers
          const statusMatch = chunk.match(/\[STATUS:(\w+)\]/g);
          if (statusMatch) {
            statusMatch.forEach((match) => {
              const status = match.replace('[STATUS:', '').replace(']', '') as AIStatus;
              setAiStatus(status);
            });
            const cleanChunk = chunk.replace(/\[STATUS:\w+\]/g, '');
            fullContent += cleanChunk;
          } else {
            fullContent += chunk;
          }

          // Update message in real-time
          setMessages((prev) =>
            prev.map((msg, idx) =>
              idx === messageIndex
                ? { ...msg, content: fullContent }
                : msg
            )
          );
        }
      }

      // IMPORTANT: Reset status to idle
      console.log('[Regenerate] Completed, resetting status to idle');
      setAiStatus('idle');
      setSending(false);

      // Update message in database
      await supabase
        .from('messages')
        .update({ content: fullContent })
        .eq('id', messages[messageIndex].id);

    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast.error('Generation stopped');
      } else {
        console.error('Error regenerating message:', error);
        toast.error('Failed to regenerate message');
      }
      // CRITICAL: Always reset status to idle
      console.log('[Regenerate] Error occurred, resetting status to idle');
      setAiStatus('idle');
    } finally {
      // CRITICAL: Always reset
      console.log('[Regenerate] Finally block, ensuring all reset');
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
        console.error('API Error (regenerate section):', { status: response.status, message: errorMessage });
        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          
          const statusMatch = chunk.match(/\[STATUS:(\w+)\]/g);
          if (statusMatch) {
            statusMatch.forEach((match) => {
              const status = match.replace('[STATUS:', '').replace(']', '') as AIStatus;
              setAiStatus(status);
            });
            const cleanChunk = chunk.replace(/\[STATUS:\w+\]/g, '');
            fullContent += cleanChunk;
          } else {
            fullContent += chunk;
          }

          setMessages((prev) =>
            prev.map((msg, idx) =>
              idx === lastAIMessageIndex
                ? { ...msg, content: fullContent }
                : msg
            )
          );
        }
      }

      // IMPORTANT: Reset status to idle
      console.log('[RegenerateSection] Completed, resetting status to idle');
      setAiStatus('idle');
      setSending(false);

      // Update message in database
      await supabase
        .from('messages')
        .update({ content: fullContent })
        .eq('id', messages[lastAIMessageIndex].id);

      toast.success('Section regenerated!');
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast.error('Generation stopped');
      } else {
        console.error('Error regenerating section:', error);
        toast.error('Failed to regenerate section');
      }
      // CRITICAL: Always reset status to idle
      console.log('[RegenerateSection] Error occurred, resetting status to idle');
      setAiStatus('idle');
    } finally {
      // CRITICAL: Always reset
      console.log('[RegenerateSection] Finally block, ensuring all reset');
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
      console.error('Error editing message:', error);
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
      console.error('Error saving reaction:', error);
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
        console.error('API Error:', { status: response.status, message: errorMessage });
        throw new Error(errorMessage);
      }

      // Create placeholder for AI message
      const aiMessageId = crypto.randomUUID();
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

      console.log('[Stream] Created AI placeholder:', aiMessageId);

      // Read streaming response with advanced parser and recovery
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let streamState = createStreamState();
      let productLinks: any[] = [];
      let checkpointCounter = 0;
      let rawStreamContent = ''; // Accumulate full raw content
      let thinkingContent = ''; // Accumulate thinking content
      let isInThinkingBlock = false;
      const CHECKPOINT_INTERVAL = 100; // Create checkpoint every 100 chunks
      
      // Throttle UI updates to 60fps max for smoother performance
      let lastUpdateTime = 0;
      const UPDATE_THROTTLE = 16; // ~60fps (1000ms / 60 = 16.67ms)
      let pendingUpdate = false;

      console.log('[Stream] Starting to read response...');
      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            rawStreamContent += chunk; // Accumulate for product extraction
            
            if (checkpointCounter === 0) {
              console.log('[Stream] First chunk received:', chunk.substring(0, 100));
            }
            
            // Parse thinking markers
            if (chunk.includes('[THINKING:START]')) {
              isInThinkingBlock = true;
              continue;
            }
            if (chunk.includes('[THINKING:END]')) {
              isInThinkingBlock = false;
              continue;
            }
            
            // Parse thinking chunk content
            const thinkingChunkMatch = chunk.match(/\[THINKING:CHUNK\]([\s\S]*?)(?=\[|$)/);
            if (thinkingChunkMatch) {
              const thinkingText = thinkingChunkMatch[1];
              thinkingContent += thinkingText;
              
              // Update message with thinking content in real-time
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === aiMessageId
                    ? { ...msg, thinking: thinkingContent }
                    : msg
                )
              );
              continue;
            }
            
            // Parse tool markers - handle web search in thinking block
            const toolMatch = chunk.match(/\[TOOL:(\w+):(START|END)\]/g);
            if (toolMatch) {
              toolMatch.forEach((match) => {
                const toolParts = match.match(/\[TOOL:(\w+):(START|END)\]/);
                if (toolParts) {
                  const [, toolName, action] = toolParts;
                  if (action === 'START') {
                    console.log(`[Tool] ${toolName} started`);
                    // Add tool usage to thinking content
                    thinkingContent += `\n\n[Using web search to find information...]\n\n`;
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === aiMessageId
                          ? { ...msg, thinking: thinkingContent }
                          : msg
                      )
                    );
                  } else if (action === 'END') {
                    console.log(`[Tool] ${toolName} completed`);
                    thinkingContent += `\n[Web search complete]\n\n`;
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === aiMessageId
                          ? { ...msg, thinking: thinkingContent }
                          : msg
                      )
                    );
                  }
                }
              });
            }
            
            // Parse status markers
            const statusMatch = chunk.match(/\[STATUS:(\w+)\]/g);
            if (statusMatch) {
              statusMatch.forEach((match) => {
                const status = match.replace('[STATUS:', '').replace(']', '') as AIStatus;
                setAiStatus(status);
                
                // Update sidebar status for thinking or web search
                if (status === 'thinking') {
                  sidebarState.updateConversationStatus(currentConversation.id, 'ai_responding', 5);
                } else if (status === 'searching_web') {
                  sidebarState.updateConversationStatus(currentConversation.id, 'ai_responding', 8);
                }
              });
            }
            
            // Clean markers from content (but keep accumulating for later product extraction)
            let cleanChunk = chunk
              .replace(/\[STATUS:\w+\]/g, '')
              .replace(/\[TOOL:\w+:(START|END)\]/g, '') // Remove tool markers
              .replace(/\[THINKING:START\]/g, '')
              .replace(/\[THINKING:END\]/g, '')
              .replace(/\[THINKING:CHUNK\][\s\S]*?(?=\[|$)/g, '')
              .replace(/\[PRODUCTS:[\s\S]*?\]/g, '') // Remove any partial product markers
              .replace(/\[REMEMBER:[^\]]+\]/g, ''); // Remove memory instruction markers
            
            // Only process content chunks if we have actual content and not in thinking
            if (cleanChunk && !isInThinkingBlock) {
              // Aggressively filter out any leaked strategy tags or meta-commentary
              cleanChunk = cleanChunk
                .replace(/<email_strategy>[\s\S]*?<\/email_strategy>/gi, '')
                .replace(/\*\*EMAIL_BRIEF Analysis:\*\*/gi, '')
                .replace(/\*\*Context Analysis:\*\*/gi, '')
                .replace(/\*\*Brief Analysis:\*\*/gi, '')
                .replace(/\*\*Brand Analysis:\*\*/gi, '')
                .replace(/\*\*Audience Psychology:\*\*/gi, '')
                .replace(/\*\*Product Listing:\*\*/gi, '')
                .replace(/\*\*Hero Strategy:\*\*/gi, '')
                .replace(/\*\*Structure Planning:\*\*/gi, '')
                .replace(/\*\*CTA Strategy:\*\*/gi, '')
                .replace(/\*\*Objection Handling:\*\*/gi, '')
                .replace(/\*\*Product Integration:\*\*/gi, '')
                .replace(/^I need to (create|analyze|search for|work through)[\s\S]*?(?=HERO SECTION|EMAIL SUBJECT|SUBJECT LINE)/i, '')
                .replace(/^Let me (start by|analyze|search for|create)[\s\S]*?(?=HERO SECTION|EMAIL SUBJECT|SUBJECT LINE)/i, '')
                .replace(/^Based on (my analysis|the requirements)[\s\S]*?(?=HERO SECTION|EMAIL SUBJECT|SUBJECT LINE)/i, '');
              
              // If chunk still doesn't contain email structure markers, skip it
              // This prevents preamble from being added to content
              const hasEmailMarker = /HERO SECTION|EMAIL SUBJECT|SECTION \d+|CALL-TO-ACTION|SUBJECT LINE/i.test(streamState.fullContent + cleanChunk);
              if (!hasEmailMarker && streamState.fullContent.length === 0) {
                continue; // Skip preamble chunks
              }
              // Process chunk with advanced parser
              const result = processStreamChunk(streamState, cleanChunk);
              streamState = result.state;
              
              // Throttle UI updates to prevent choppy scrolling
              const now = Date.now();
              if (result.shouldRender && (now - lastUpdateTime >= UPDATE_THROTTLE || !pendingUpdate)) {
                lastUpdateTime = now;
                pendingUpdate = true;
                
                // Use requestAnimationFrame for smoother updates
                requestAnimationFrame(() => {
                  setMessages((prev) => {
                    const updated = prev.map((msg) =>
                      msg.id === aiMessageId
                        ? { ...msg, content: streamState.fullContent, thinking: thinkingContent }
                        : msg
                    );
                    
                    if (checkpointCounter % 50 === 0) {
                      console.log('[Stream] Updating message, content length:', streamState.fullContent.length);
                    }
                    
                    return updated;
                  });
                  pendingUpdate = false;
                });
              }
            }
            
            // Create checkpoint periodically for recovery
            checkpointCounter++;
            if (checkpointCounter % CHECKPOINT_INTERVAL === 0) {
              saveCheckpoint({
                conversationId: currentConversation.id,
                messageId: aiMessageId,
                content: streamState.fullContent,
                timestamp: Date.now(),
                isComplete: false,
              });
            }
          }
          
          // Finalize stream
          streamState = finalizeStream(streamState);
          
          // Post-process: Remove any preamble before the actual email structure
          const cleanedContent = cleanEmailContentFinal(streamState.fullContent);
          
          // Final update to ensure all content is rendered
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId
                ? { ...msg, content: cleanedContent, thinking: thinkingContent }
                : msg
            )
          );
          
          // Extract product links from complete stream (after all chunks received)
          console.log('[ProductExtract] Checking for PRODUCTS marker in stream...');
          const productMatch = rawStreamContent.match(/\[PRODUCTS:([\s\S]*?)\](?:\s|$)/);
          if (productMatch) {
            console.log('[ProductExtract] PRODUCTS marker found!', productMatch[1].substring(0, 100));
            try {
              const jsonString = productMatch[1].trim();
              // Validate JSON before parsing
              if (jsonString && jsonString.startsWith('[') && jsonString.endsWith(']')) {
                productLinks = JSON.parse(jsonString);
                console.log('[ProductExtract] Parsed product links:', productLinks);
                // Validate structure
                if (!Array.isArray(productLinks)) {
                  console.warn('Product links is not an array, resetting');
                  productLinks = [];
                }
              } else {
                console.warn('Invalid product links format, skipping:', jsonString.substring(0, 50));
                productLinks = [];
              }
            } catch (e) {
              console.error('Failed to parse product links:', e);
              // Silent fail - product links are optional
              productLinks = [];
            }
          } else {
            console.log('[ProductExtract] No PRODUCTS marker found in stream');
          }
          
          // Clear checkpoint after successful completion
          clearCheckpoint(aiMessageId);
        } catch (streamError) {
          // Try to recover from last checkpoint
          const recovered = loadCheckpoint(aiMessageId);
          if (recovered) {
            console.log('Recovered stream from checkpoint:', recovered);
            streamState.fullContent = recovered.content;
          }
          throw streamError;
        }
      }

      const fullContent = streamState.fullContent;

      // IMPORTANT: Reset AI status to idle IMMEDIATELY after stream completes
      console.log('[Stream] Completed successfully, resetting status to idle');
      setAiStatus('idle');
      setSending(false);
      
      // Update sidebar status - completion
      sidebarState.updateConversationStatus(currentConversation.id, 'idle');

      // Sanitize content before saving to database (XSS protection)
      const sanitizedContent = sanitizeContent(fullContent);
      const sanitizedThinking = thinkingContent ? sanitizeContent(thinkingContent) : null;

      // Save complete AI message to database with product links and thinking
      console.log('[Database] Saving message with product links:', productLinks.length, 'links');
      if (productLinks.length > 0) {
        console.log('[Database] Product links to save:', productLinks);
      }
      
      const { data: savedAiMessage, error: aiError } = await supabase
        .from('messages')
        .insert({
          conversation_id: currentConversation.id,
          role: 'assistant',
          content: sanitizedContent,
          thinking: sanitizedThinking,
          metadata: productLinks.length > 0 ? { productLinks } : null,
        })
        .select()
        .single();

      if (aiError) throw aiError;

      // Replace placeholder with saved message and remove any duplicates
      setMessages((prev) => {
        console.log('[Messages] Replacing AI placeholder. Prev count:', prev.length);
        console.log('[Messages] Placeholder ID:', aiMessageId, 'Saved ID:', savedAiMessage.id);
        
        // First, filter out any existing instances of the saved message ID
        const withoutDuplicates = prev.filter(msg => msg.id !== savedAiMessage.id);
        // Then replace the placeholder with the saved message
        const updated = withoutDuplicates.map((msg) => (msg.id === aiMessageId ? savedAiMessage : msg));
        
        console.log('[Messages] Final count:', updated.length);
        return updated;
      });
      
      // Update cache with new messages
      if (userMessage && savedAiMessage) {
        addCachedMessage(currentConversation.id, userMessage);
        addCachedMessage(currentConversation.id, savedAiMessage);
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
      if (error.name === 'AbortError') {
        toast.error('Generation stopped');
        sidebarState.updateConversationStatus(currentConversation.id, 'idle');
      } else {
        // Enhanced error logging for better debugging
        console.error('Error sending message:', {
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
      console.log('[Stream] Error occurred, resetting status to idle');
      setAiStatus('idle');
    } finally {
      // CRITICAL: Always reset sending to false
      console.log('[Stream] Finally block, ensuring sending=false and status=idle');
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
      console.log('[Sidebar] Flow conversations to display:', flowConvs.map(c => ({
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

  return (
    <div className="relative h-screen bg-[#fcfcfc] dark:bg-gray-950 overflow-hidden">
      <Toaster position="top-right" />
      
      {/* Flow Generation Progress Modal */}
      {isGeneratingFlow && pendingOutlineApproval && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"><div className="text-white">Loading...</div></div>}>
          <FlowGenerationProgress
            totalEmails={pendingOutlineApproval.emails.length}
            currentEmail={flowGenerationProgress}
            isGenerating={isGeneratingFlow}
          />
        </Suspense>
      )}
      
      {/* Flow Type Selector Modal */}
      {showFlowTypeSelector && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 z-50" />}>
          <FlowTypeSelector
            onSelect={handleSelectFlowType}
            onCancel={() => {
              setShowFlowTypeSelector(false);
              setEmailType('design'); // Reset to design if cancelled
            }}
          />
        </Suspense>
      )}

      {/* Enhanced Sidebar - Fixed overlay on mobile, in-flow on desktop */}
      <div className="contents lg:flex lg:h-screen">
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
        />

        {/* Main chat area - Full width on mobile, flex-1 on desktop */}
        <div className="flex flex-col h-screen w-full lg:flex-1 lg:w-auto min-w-0">
        {/* Enhanced Navigation Header - Cleaner without breadcrumb */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          {/* Mobile hamburger menu - only visible on mobile */}
          <div className="lg:hidden px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
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
              
              {/* Three-dot menu - Clean! */}
              {currentConversation && (
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
        <div 
          className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 bg-[#fcfcfc] dark:bg-gray-950"
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
              <div className="text-center">
                <svg
                  className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">No conversation selected</p>
                <button
                  onClick={handleNewConversation}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Start New Conversation
                </button>
              </div>
            </div>
          ) : messages.length === 0 ? (
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
                    ? 'Let\'s Talk Strategy' 
                    : 'Create Your Email'}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6">
                  {conversationMode === 'planning'
                    ? 'Ask questions, explore ideas, or plan your next campaign. This is your space to think and strategize.'
                    : 'Describe the email you want to create and I\'ll generate it for you with high-converting copy.'}
                </p>
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-left">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                    {conversationMode === 'planning' ? '💡 What You Can Do Here:' : '✉️ Email Copy Mode Tips:'}
                  </p>
                  {conversationMode === 'planning' ? (
                    <div className="space-y-3">
                      <div className="text-sm text-blue-800 dark:text-blue-200">
                        <p className="font-medium mb-1">💬 Ask Questions</p>
                        <p className="text-xs ml-3">"What makes a good subject line?" or "How do I improve open rates?"</p>
                      </div>
                      <div className="text-sm text-blue-800 dark:text-blue-200">
                        <p className="font-medium mb-1">🔍 Explore Ideas</p>
                        <p className="text-xs ml-3">"Tell me about our target audience" or "What's our brand voice?"</p>
                      </div>
                      <div className="text-sm text-blue-800 dark:text-blue-200">
                        <p className="font-medium mb-1">📋 Plan Campaigns</p>
                        <p className="text-xs ml-3">"I want to promote our sale" - I'll help you build a strategy</p>
                      </div>
                      <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          <strong>Note:</strong> When you're ready to write the actual email, switch to Email Copy mode or use the Transfer Plan button.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      <li>• Be specific about your product or offer</li>
                      <li>• Mention your target audience</li>
                      <li>• Include any key details like discounts or timeframes</li>
                      <li>• Switch to Planning mode if you need to brainstorm first</li>
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ) : loadingMessages ? (
            /* Loading skeleton */
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-gray-300 dark:bg-gray-700 rounded-full flex-shrink-0"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/4"></div>
                        <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : messages.length > 50 ? (
            /* Use virtualized list for long conversations (50+ messages) */
            <>
              <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                {/* Planning Stage Indicator (only in planning mode) */}
                {conversationMode === 'planning' && (
                  <PlanningStageIndicator messages={messages} />
                )}
              </div>
              
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
              />
              
              <div ref={messagesEndRef} />
              
              {/* Show preparing indicator when sending but no AI message yet */}
              {sending && messages.filter(m => m.role === 'assistant').length === messages.filter(m => m.role === 'user').length - 1 && (
                <div className="mb-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 px-4 py-2 inline-block">
                  <div className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex gap-1" style={{ minWidth: '28px' }}>
                      <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0ms', animationDuration: '1.4s', animationTimingFunction: 'cubic-bezier(0.4, 0, 0.6, 1)' }}></div>
                      <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '200ms', animationDuration: '1.4s', animationTimingFunction: 'cubic-bezier(0.4, 0, 0.6, 1)' }}></div>
                      <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '400ms', animationDuration: '1.4s', animationTimingFunction: 'cubic-bezier(0.4, 0, 0.6, 1)' }}></div>
                    </div>
                    <span className="font-medium">preparing response...</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Regular rendering for shorter conversations */
            <div className="max-w-5xl mx-auto">
              {/* Flow Outline Display for parent flow conversations */}
              {currentConversation?.is_flow && flowOutline && flowOutline.approved && (
                <FlowOutlineDisplay
                  outline={flowOutline.outline_data}
                  children={flowChildren}
                  onSelectChild={(childId) => handleSelectConversation(childId)}
                  currentChildId={currentConversation.id}
                />
              )}

              {/* Planning Stage Indicator (only in planning mode) */}
              {conversationMode === 'planning' && (
                <PlanningStageIndicator messages={messages} />
              )}
              
              {/* Messages */}
              {messages.map((message, index) => (
                <ChatMessage
                  key={`${message.id}-${index}`}
                  message={message}
                  brandId={brandId}
                  mode={conversationMode}
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
                />
              ))}
              
              <div ref={messagesEndRef} />
              
              {/* Show preparing indicator when sending but no AI message yet */}
              {sending && messages.filter(m => m.role === 'assistant').length === messages.filter(m => m.role === 'user').length - 1 && (
                <div className="mb-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 px-4 py-2 inline-block">
                  <div className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex gap-1" style={{ minWidth: '28px' }}>
                      <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0ms', animationDuration: '1.4s', animationTimingFunction: 'cubic-bezier(0.4, 0, 0.6, 1)' }}></div>
                      <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '200ms', animationDuration: '1.4s', animationTimingFunction: 'cubic-bezier(0.4, 0, 0.6, 1)' }}></div>
                      <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '400ms', animationDuration: '1.4s', animationTimingFunction: 'cubic-bezier(0.4, 0, 0.6, 1)' }}></div>
                    </div>
                    <span className="font-medium">preparing response...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Approve Outline Button (Flow Mode) */}
        {currentConversation?.is_flow && 
         pendingOutlineApproval && 
         !flowOutline?.approved && 
         !sending && (
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
            <div className="max-w-4xl mx-auto">
              <ApproveOutlineButton
                outline={pendingOutlineApproval}
                conversationId={currentConversation.id}
                onApprove={() => handleApproveOutline(pendingOutlineApproval)}
                disabled={sending}
              />
            </div>
          </div>
        )}

        {/* Transfer Plan Button (Planning Mode) - Only show after meaningful planning */}
        {currentConversation && 
         conversationMode === 'planning' && 
         messages.length >= 4 && // At least 2 back-and-forth exchanges
         messages[messages.length - 1]?.role === 'assistant' && 
         !sending && 
         (() => {
           // Check if there's been substantial planning content
           const userMessages = messages.filter(m => m.role === 'user');
           const assistantMessages = messages.filter(m => m.role === 'assistant');
           const totalLength = messages.reduce((sum, m) => sum + m.content.length, 0);
           
           // Show only if:
           // 1. At least 2 exchanges
           // 2. Total content > 500 chars (meaningful conversation)
           // 3. Last message is substantial (> 100 chars)
           return userMessages.length >= 2 && 
                  assistantMessages.length >= 2 && 
                  totalLength > 500 &&
                  messages[messages.length - 1].content.length > 100;
         })() && (
          <div className="border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 px-4 py-3">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Ready to create your email?
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 hidden sm:block">
                    Transfer this plan to Email Copy mode to generate your email
                  </p>
                </div>
              </div>
              <button
                onClick={handleTransferPlanToEmail}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Transfer Plan</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>
        )}

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
            onDraftChange={setDraftContent}
            onModeChange={handleToggleMode}
            selectedModel={selectedModel}
            onModelChange={(model) => setSelectedModel(model as AIModel)}
            emailType={emailType}
            onEmailTypeChange={handleEmailTypeChange}
            hasMessages={messages.length > 0}
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
          <MemorySettings
            conversationId={currentConversation.id}
            onClose={() => setShowMemorySettings(false)}
          />
        )}
        </div>
      </div>
    </div>
  );
}

