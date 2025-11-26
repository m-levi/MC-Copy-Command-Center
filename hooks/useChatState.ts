'use client';

import { useState, useRef, useCallback } from 'react';
import { 
  Brand, 
  Conversation, 
  Message, 
  AIModel, 
  AIStatus, 
  ConversationMode, 
  OrganizationMember, 
  EmailType, 
  FlowType,
  FlowOutline,
  FlowConversation,
  FlowOutlineData
} from '@/types';
import { FilterType } from '@/components/ConversationFilterDropdown';
import { RequestCoalescer } from '@/lib/performance-utils';

export interface ChatState {
  // Brand state
  brand: Brand | null;
  allBrands: Brand[];
  showBrandSwitcher: boolean;
  
  // Conversation state
  conversations: Conversation[];
  filteredConversations: Conversation[];
  currentConversation: Conversation | null;
  
  // Message state
  messages: Message[];
  loadingMessages: boolean;
  
  // AI state
  selectedModel: AIModel;
  aiStatus: AIStatus;
  sending: boolean;
  regeneratingMessageId: string | null;
  
  // Mode state
  conversationMode: ConversationMode;
  emailType: EmailType;
  
  // Draft state
  draftContent: string;
  
  // User state
  currentUserId: string;
  currentUserName: string;
  teamMembers: OrganizationMember[];
  
  // Filter state
  currentFilter: FilterType;
  selectedPersonId: string | null;
  
  // UI state
  loading: boolean;
  showMemorySettings: boolean;
  isMobileSidebarOpen: boolean;
  showConversationMenu: boolean;
  showShareModal: boolean;
  commentsSidebarCollapsed: boolean;
  focusedMessageIdForComments: string | null;
  highlightedTextForComment: string | null;
  showScrollToBottom: boolean;
  
  // Flow state
  showFlowTypeSelector: boolean;
  selectedFlowType: FlowType | null;
  isCreatingFlow: boolean;
  isGeneratingFlow: boolean;
  flowGenerationProgress: number;
  flowOutline: FlowOutline | null;
  flowChildren: Conversation[];
  parentFlow: FlowConversation | null;
  pendingOutlineApproval: FlowOutlineData | null;
  
  // Other state
  isCreatingEmail: boolean;
  detectedCampaign: { title: string; brief: string } | null;
  starredEmailContents: Set<string>;
  messageCommentCounts: Record<string, number>;
  messageComments: Record<string, Array<{ id: string; quoted_text?: string; content: string }>>;
}

export interface ChatStateSetters {
  setBrand: (brand: Brand | null) => void;
  setAllBrands: (brands: Brand[]) => void;
  setShowBrandSwitcher: (show: boolean) => void;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  setFilteredConversations: (conversations: Conversation[]) => void;
  setCurrentConversation: (conversation: Conversation | null) => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setLoadingMessages: (loading: boolean) => void;
  setSelectedModel: (model: AIModel) => void;
  setAiStatus: (status: AIStatus) => void;
  setSending: (sending: boolean) => void;
  setRegeneratingMessageId: (id: string | null) => void;
  setConversationMode: (mode: ConversationMode) => void;
  setEmailType: (type: EmailType) => void;
  setDraftContent: (content: string) => void;
  setCurrentUserId: (id: string) => void;
  setCurrentUserName: (name: string) => void;
  setTeamMembers: (members: OrganizationMember[]) => void;
  setCurrentFilter: (filter: FilterType) => void;
  setSelectedPersonId: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setShowMemorySettings: (show: boolean) => void;
  setIsMobileSidebarOpen: (open: boolean) => void;
  setShowConversationMenu: (show: boolean) => void;
  setShowShareModal: (show: boolean) => void;
  setCommentsSidebarCollapsed: (collapsed: boolean) => void;
  setFocusedMessageIdForComments: (id: string | null) => void;
  setHighlightedTextForComment: (text: string | null) => void;
  setShowScrollToBottom: (show: boolean) => void;
  setShowFlowTypeSelector: (show: boolean) => void;
  setSelectedFlowType: (type: FlowType | null) => void;
  setIsCreatingFlow: (creating: boolean) => void;
  setIsGeneratingFlow: (generating: boolean) => void;
  setFlowGenerationProgress: (progress: number) => void;
  setFlowOutline: (outline: FlowOutline | null) => void;
  setFlowChildren: (children: Conversation[]) => void;
  setParentFlow: (flow: FlowConversation | null) => void;
  setPendingOutlineApproval: (data: FlowOutlineData | null) => void;
  setIsCreatingEmail: (creating: boolean) => void;
  setDetectedCampaign: (campaign: { title: string; brief: string } | null) => void;
  setStarredEmailContents: (contents: Set<string>) => void;
  setMessageCommentCounts: (counts: Record<string, number>) => void;
  setMessageComments: (comments: Record<string, Array<{ id: string; quoted_text?: string; content: string }>>) => void;
}

export interface ChatRefs {
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  messagesScrollRef: React.RefObject<HTMLDivElement | null>;
  abortControllerRef: React.MutableRefObject<AbortController | null>;
  requestCoalescerRef: React.MutableRefObject<RequestCoalescer<unknown>>;
  conversationsCoalescerRef: React.MutableRefObject<RequestCoalescer<unknown>>;
  isSelectingConversationRef: React.MutableRefObject<boolean>;
  justSwitchedConversation: React.MutableRefObject<boolean>;
  previousMessageCount: React.MutableRefObject<number>;
}

export function useChatState(): [ChatState, ChatStateSetters, ChatRefs] {
  // Brand state
  const [brand, setBrand] = useState<Brand | null>(null);
  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [showBrandSwitcher, setShowBrandSwitcher] = useState(false);
  
  // Conversation state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  
  // Message state
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  // AI state
  const [selectedModel, setSelectedModel] = useState<AIModel>('claude-4.5-sonnet');
  const [aiStatus, setAiStatus] = useState<AIStatus>('idle');
  const [sending, setSending] = useState(false);
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<string | null>(null);
  
  // Mode state
  const [conversationMode, setConversationMode] = useState<ConversationMode>('email_copy');
  const [emailType, setEmailType] = useState<EmailType>('design');
  
  // Draft state
  const [draftContent, setDraftContent] = useState('');
  
  // User state
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUserName, setCurrentUserName] = useState('');
  const [teamMembers, setTeamMembers] = useState<OrganizationMember[]>([]);
  
  // Filter state
  const [currentFilter, setCurrentFilter] = useState<FilterType>('all');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  
  // UI state
  const [loading, setLoading] = useState(true);
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
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  
  // Flow state
  const [showFlowTypeSelector, setShowFlowTypeSelector] = useState(false);
  const [selectedFlowType, setSelectedFlowType] = useState<FlowType | null>(null);
  const [isCreatingFlow, setIsCreatingFlow] = useState(false);
  const [isGeneratingFlow, setIsGeneratingFlow] = useState(false);
  const [flowGenerationProgress, setFlowGenerationProgress] = useState(0);
  const [flowOutline, setFlowOutline] = useState<FlowOutline | null>(null);
  const [flowChildren, setFlowChildren] = useState<Conversation[]>([]);
  const [parentFlow, setParentFlow] = useState<FlowConversation | null>(null);
  const [pendingOutlineApproval, setPendingOutlineApproval] = useState<FlowOutlineData | null>(null);
  
  // Other state
  const [isCreatingEmail, setIsCreatingEmail] = useState(false);
  const [detectedCampaign, setDetectedCampaign] = useState<{ title: string; brief: string } | null>(null);
  const [starredEmailContents, setStarredEmailContents] = useState<Set<string>>(new Set());
  const [messageCommentCounts, setMessageCommentCounts] = useState<Record<string, number>>({});
  const [messageComments, setMessageComments] = useState<Record<string, Array<{ id: string; quoted_text?: string; content: string }>>>({});
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestCoalescerRef = useRef(new RequestCoalescer<unknown>());
  const conversationsCoalescerRef = useRef(new RequestCoalescer<unknown>());
  const isSelectingConversationRef = useRef(false);
  const justSwitchedConversation = useRef(false);
  const previousMessageCount = useRef(0);

  const state: ChatState = {
    brand,
    allBrands,
    showBrandSwitcher,
    conversations,
    filteredConversations,
    currentConversation,
    messages,
    loadingMessages,
    selectedModel,
    aiStatus,
    sending,
    regeneratingMessageId,
    conversationMode,
    emailType,
    draftContent,
    currentUserId,
    currentUserName,
    teamMembers,
    currentFilter,
    selectedPersonId,
    loading,
    showMemorySettings,
    isMobileSidebarOpen,
    showConversationMenu,
    showShareModal,
    commentsSidebarCollapsed,
    focusedMessageIdForComments,
    highlightedTextForComment,
    showScrollToBottom,
    showFlowTypeSelector,
    selectedFlowType,
    isCreatingFlow,
    isGeneratingFlow,
    flowGenerationProgress,
    flowOutline,
    flowChildren,
    parentFlow,
    pendingOutlineApproval,
    isCreatingEmail,
    detectedCampaign,
    starredEmailContents,
    messageCommentCounts,
    messageComments,
  };

  const setters: ChatStateSetters = {
    setBrand,
    setAllBrands,
    setShowBrandSwitcher,
    setConversations,
    setFilteredConversations,
    setCurrentConversation,
    setMessages,
    setLoadingMessages,
    setSelectedModel,
    setAiStatus,
    setSending,
    setRegeneratingMessageId,
    setConversationMode,
    setEmailType,
    setDraftContent,
    setCurrentUserId,
    setCurrentUserName,
    setTeamMembers,
    setCurrentFilter,
    setSelectedPersonId,
    setLoading,
    setShowMemorySettings,
    setIsMobileSidebarOpen,
    setShowConversationMenu,
    setShowShareModal,
    setCommentsSidebarCollapsed,
    setFocusedMessageIdForComments,
    setHighlightedTextForComment,
    setShowScrollToBottom,
    setShowFlowTypeSelector,
    setSelectedFlowType,
    setIsCreatingFlow,
    setIsGeneratingFlow,
    setFlowGenerationProgress,
    setFlowOutline,
    setFlowChildren,
    setParentFlow,
    setPendingOutlineApproval,
    setIsCreatingEmail,
    setDetectedCampaign,
    setStarredEmailContents,
    setMessageCommentCounts,
    setMessageComments,
  };

  const refs: ChatRefs = {
    messagesEndRef,
    messagesScrollRef,
    abortControllerRef,
    requestCoalescerRef,
    conversationsCoalescerRef,
    isSelectingConversationRef,
    justSwitchedConversation,
    previousMessageCount,
  };

  return [state, setters, refs];
}

