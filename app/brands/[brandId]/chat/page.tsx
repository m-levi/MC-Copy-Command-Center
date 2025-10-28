'use client';

import { useEffect, useState, useRef, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Brand, Conversation, Message, AIModel, AIStatus, PromptTemplate, ConversationMode, OrganizationMember } from '@/types';
import { AI_MODELS } from '@/lib/ai-models';
import ChatSidebar from '@/components/ChatSidebar';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import VirtualizedMessageList from '@/components/VirtualizedMessageList';
import AIStatusIndicator from '@/components/AIStatusIndicator';
import ThemeToggle from '@/components/ThemeToggle';
import PlanningStageIndicator from '@/components/PlanningStageIndicator';
import { FilterType } from '@/components/ConversationFilterDropdown';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { useDraftSave, loadDraft, clearDraft } from '@/hooks/useDraftSave';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import StarredEmailsManager from '@/components/StarredEmailsManager';
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

export const dynamic = 'force-dynamic';

export default function ChatPage({ params }: { params: Promise<{ brandId: string }> }) {
  const resolvedParams = use(params);
  const brandId = resolvedParams.brandId;
  
  const [brand, setBrand] = useState<Brand | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedModel, setSelectedModel] = useState<AIModel>('claude-4.5-sonnet');
  const [loading, setLoading] = useState(true);
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
  const [showStarredEmails, setShowStarredEmails] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestCoalescerRef = useRef(new RequestCoalescer());
  const supabase = createClient();
  const router = useRouter();
  const { isOnline, addToQueue, removeFromQueue } = useOfflineQueue();
  
  // Auto-save drafts
  useDraftSave(currentConversation?.id || null, draftContent);

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
    
    // Cleanup subscription on unmount or brand change
    return () => {
      conversationChannel.unsubscribe();
    };
  }, [brandId]);

  useEffect(() => {
    applyConversationFilter();
  }, [conversations, currentFilter, selectedPersonId]);

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
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
      await loadConversations();
    } catch (error) {
      console.error('Error initializing page:', error);
      toast.error('Failed to initialize page');
    }
  };

  const applyConversationFilter = () => {
    if (currentFilter === 'all') {
      setFilteredConversations(conversations);
    } else if (currentFilter === 'mine') {
      setFilteredConversations(conversations.filter(c => c.user_id === currentUserId));
    } else if (currentFilter === 'person' && selectedPersonId) {
      setFilteredConversations(conversations.filter(c => c.user_id === selectedPersonId));
    } else {
      setFilteredConversations(conversations);
    }
  };

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

  const loadConversations = async () => {
    const startTime = performance.now();
    
    try {
      // Check cache first
      const cached = getCachedConversations(brandId);
      if (cached && cached.length > 0) {
        setConversations(cached);
        
        // Auto-select first conversation if available
        if (!currentConversation) {
          setCurrentConversation(cached[0]);
        }
        
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
      cacheConversations(brandId, data);
      setConversations(data);
      
      // Auto-select first conversation if available
      if (data.length > 0 && !currentConversation) {
        setCurrentConversation(data[0]);
      }
    }
  };

  const loadMessages = async () => {
    if (!currentConversation) return;

    const startTime = performance.now();

    try {
      // Use request coalescer to prevent duplicate calls
      await requestCoalescerRef.current.execute(
        async () => {
          // Check cache first
          const cached = getCachedMessages(currentConversation.id);
          if (cached && cached.length > 0) {
            setMessages(cached);
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
        },
        currentConversation.id
      );
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
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
      setDraftContent(''); // Clear draft when switching
      await loadConversations();
      toast.success('New conversation created');
      trackEvent('conversation_created', { conversationId: data.id });
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create conversation');
    }
  };

  const handleSelectConversation = (conversationId: string) => {
    // Abort any ongoing AI generation before switching
    if (abortControllerRef.current && sending) {
      abortControllerRef.current.abort();
      setSending(false);
      setAiStatus('idle');
      toast('Generation stopped - switching conversations', { icon: '⏹️' });
    }

    const conversation = conversations.find((c) => c.id === conversationId);
    if (conversation) {
      setCurrentConversation(conversation);
      setSelectedModel(conversation.model as AIModel);
      setConversationMode(conversation.mode || 'planning');
      setDraftContent(''); // Clear draft when switching
      trackEvent('conversation_selected', { conversationId });
    }
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
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
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

      setAiStatus('idle');

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
      setAiStatus('idle');
    } finally {
      setSending(false);
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
          regenerateSection: { type: sectionType, title: sectionTitle },
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate section');
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

      setAiStatus('idle');

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
      setAiStatus('idle');
    } finally {
      setSending(false);
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

    setSending(true);
    setAiStatus('analyzing_brand');
    
    // Clear draft
    clearDraft(currentConversation.id);
    setDraftContent('');

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
        setMessages((prev) => [...prev, userMessage!]);
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
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
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

      // Read streaming response with advanced parser and recovery
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let streamState = createStreamState();
      let productLinks: any[] = [];
      let checkpointCounter = 0;
      let rawStreamContent = ''; // Accumulate full raw content
      const CHECKPOINT_INTERVAL = 100; // Create checkpoint every 100 chunks

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            rawStreamContent += chunk; // Accumulate for product extraction
            
            // Parse status markers
            const statusMatch = chunk.match(/\[STATUS:(\w+)\]/g);
            if (statusMatch) {
              statusMatch.forEach((match) => {
                const status = match.replace('[STATUS:', '').replace(']', '') as AIStatus;
                setAiStatus(status);
              });
            }
            
            // Clean markers from content (but keep accumulating for later product extraction)
            const cleanChunk = chunk
              .replace(/\[STATUS:\w+\]/g, '')
              .replace(/\[PRODUCTS:[\s\S]*?\]/g, ''); // Remove any partial product markers
            
            // Process chunk with advanced parser
            const result = processStreamChunk(streamState, cleanChunk);
            streamState = result.state;
            
            // Only update UI when needed (batching for 60fps)
            if (result.shouldRender) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === aiMessageId
                    ? { ...msg, content: streamState.fullContent }
                    : msg
                )
              );
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
          
          // Extract product links from complete stream (after all chunks received)
          const productMatch = rawStreamContent.match(/\[PRODUCTS:([\s\S]*?)\]/);
          if (productMatch) {
            try {
              productLinks = JSON.parse(productMatch[1]);
            } catch (e) {
              console.error('Failed to parse product links:', e);
              // Silent fail - product links are optional
            }
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

      setAiStatus('idle');

      // Save complete AI message to database with product links
      const { data: savedAiMessage, error: aiError } = await supabase
        .from('messages')
        .insert({
          conversation_id: currentConversation.id,
          role: 'assistant',
          content: fullContent,
          metadata: productLinks.length > 0 ? { productLinks } : null,
        })
        .select()
        .single();

      if (aiError) throw aiError;

      // Replace placeholder with saved message
      setMessages((prev) =>
        prev.map((msg) => (msg.id === aiMessageId ? savedAiMessage : msg))
      );
      
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
      } else {
        console.error('Error sending message:', error);
        toast.error('Failed to send message');
      }
      setAiStatus('idle');
    } finally {
      setSending(false);
      abortControllerRef.current = null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!brand) {
    return null;
  }

  return (
    <div className="flex h-screen bg-[#fcfcfc] dark:bg-gray-950">
      <Toaster position="top-right" />

      {/* Sidebar */}
      <ChatSidebar
        brandName={brand.name}
        brandId={brandId}
        conversations={filteredConversations}
        currentConversationId={currentConversation?.id || null}
        teamMembers={teamMembers}
        currentFilter={currentFilter}
        selectedPersonId={selectedPersonId}
        onFilterChange={handleFilterChange}
        onNewConversation={handleNewConversation}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onPrefetchConversation={handlePrefetchConversation}
      />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Simple Header */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate max-w-md">
                {currentConversation?.title || 'No Conversation Selected'}
              </h2>
              {currentConversation && messages.length > 0 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {messages.length} {messages.length === 1 ? 'message' : 'messages'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Starred Emails Button */}
              {brand && (
                <button
                  onClick={() => setShowStarredEmails(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 dark:bg-yellow-950/30 hover:bg-yellow-100 dark:hover:bg-yellow-950/50 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300 rounded-lg text-xs font-medium transition-colors duration-150"
                  title="View starred emails (AI reference examples)"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  <span>Starred</span>
                </button>
              )}
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-8 py-8 bg-[#fcfcfc] dark:bg-gray-950">
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
              <div className="text-center max-w-2xl px-4">
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
                <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                  {conversationMode === 'planning' 
                    ? 'Let\'s Talk Strategy' 
                    : 'Create Your Email'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
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
          ) : messages.length > 50 ? (
            /* Use virtualized list for long conversations (50+ messages) */
            <>
              <div className="max-w-5xl mx-auto px-8 py-4">
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
              />
              
              {/* AI Status */}
              {sending && aiStatus !== 'idle' && (
                <div className="max-w-5xl mx-auto px-8 mb-4">
                  <AIStatusIndicator status={aiStatus} />
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </>
          ) : (
            /* Regular rendering for shorter conversations */
            <div className="max-w-5xl mx-auto">
              {/* Planning Stage Indicator (only in planning mode) */}
              {conversationMode === 'planning' && (
                <PlanningStageIndicator messages={messages} />
              )}
              
              {/* Messages */}
              {messages.map((message, index) => (
                <ChatMessage
                  key={message.id}
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
                />
              ))}
              
              {/* AI Status */}
              {sending && aiStatus !== 'idle' && (
                <div className="mb-4">
                  <AIStatusIndicator status={aiStatus} />
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

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
            <div className="max-w-4xl mx-auto flex items-center justify-between">
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
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Transfer this plan to Email Copy mode to generate your email
                  </p>
                </div>
              </div>
              <button
                onClick={handleTransferPlanToEmail}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
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

      {/* Starred Emails Manager Modal */}
      {showStarredEmails && brand && (
        <StarredEmailsManager
          brandId={brandId}
          onClose={() => setShowStarredEmails(false)}
        />
      )}
    </div>
  </div>
  );
}

