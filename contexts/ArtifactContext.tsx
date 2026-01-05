'use client';

import React, { createContext, useContext, useCallback, useState, useMemo } from 'react';
import { useEmailArtifacts } from '@/hooks/useEmailArtifacts';
import {
  EmailArtifactWithContent,
  ArtifactVariant,
  ArtifactStreamingState,
  CreateEmailArtifact,
  ArtifactKind,
} from '@/types/artifacts';
import { detectArtifactContent } from '@/lib/tools/artifact-tool';
import { checkArtifactWorthiness } from '@/lib/artifact-worthiness';

// Tab types for artifact sidebar
export type ArtifactTabView = 'content' | 'history' | 'comments';

// Artifact suggestion - detected content that could be saved as an artifact
export interface ArtifactSuggestion {
  kind: 'email' | 'flow' | 'campaign' | 'template' | 'subject_lines' | 'content_brief';
  messageId: string;
  confidence: 'high' | 'medium';
  content: string;
  suggestedTitle?: string;
}

// ===== Context Interface =====
interface ArtifactContextValue {
  // ===== State =====
  artifacts: EmailArtifactWithContent[];
  activeArtifact: EmailArtifactWithContent | null;
  isLoading: boolean;
  error: string | null;
  
  // ===== Sidebar State =====
  isSidebarOpen: boolean;
  isSidebarPinned: boolean;
  activeTab: ArtifactTabView;
  openSidebar: () => void;
  openSidebarToTab: (tab: ArtifactTabView) => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  toggleSidebarPin: () => void;
  setActiveTab: (tab: ArtifactTabView) => void;
  
  // ===== Active Artifact Management =====
  setActiveArtifact: (artifactId: string | null) => void;
  focusArtifact: (artifactId: string) => void;
  
  // ===== CRUD Operations =====
  createArtifact: (data: CreateEmailArtifact) => Promise<EmailArtifactWithContent | null>;
  updateArtifact: (artifactId: string, data: Partial<EmailArtifactWithContent>) => Promise<void>;
  deleteArtifact: (artifactId: string) => Promise<void>;
  duplicateArtifact: (artifactId: string) => Promise<EmailArtifactWithContent | null>;
  
  // ===== Version Management =====
  addVersion: (artifactId: string, content: string, changeSummary?: string) => Promise<unknown>;
  getVersionHistory: (artifactId: string) => Promise<unknown[]>;
  restoreVersion: (artifactId: string, versionId: string) => Promise<void>;
  
  // ===== Variant Selection =====
  selectVariant: (artifactId: string, variant: ArtifactVariant) => Promise<void>;
  
  // ===== Sharing =====
  shareArtifact: (artifactId: string) => Promise<string | null>;
  unshareArtifact: (artifactId: string) => Promise<void>;
  
  // ===== Streaming =====
  streamingState: ArtifactStreamingState;
  startStreaming: (artifactId: string, variant?: ArtifactVariant, kind?: ArtifactKind) => void;
  updateStreamingContent: (content: string) => void;
  finishStreaming: () => void;
  
  // ===== Message Integration =====
  processAIResponse: (messageId: string, content: string, isEdit?: boolean) => Promise<EmailArtifactWithContent | null>;
  findArtifactByMessageId: (messageId: string) => EmailArtifactWithContent | undefined;
  hasArtifactContent: (content: string) => boolean;
  
  // ===== Artifact Suggestions (User-Triggered Creation) =====
  suggestArtifact: (messageId: string, content: string) => ArtifactSuggestion | null;
  createArtifactFromSuggestion: (suggestion: ArtifactSuggestion) => Promise<EmailArtifactWithContent | null>;
  pendingSuggestions: Map<string, ArtifactSuggestion>; // messageId -> suggestion
  dismissSuggestion: (messageId: string) => void;
  
  // ===== Utilities =====
  refetch: () => Promise<void>;
  getActiveVariantContent: () => string | undefined;
}

// ===== Context =====
const ArtifactContext = createContext<ArtifactContextValue | null>(null);

// ===== Provider Props =====
interface ArtifactProviderProps {
  children: React.ReactNode;
  conversationId: string;
}

// ===== Provider Component =====
export function ArtifactProvider({ children, conversationId }: ArtifactProviderProps) {
  // Use the hook
  const {
    artifacts,
    activeArtifact: activeArtifactFromHook,
    isLoading,
    error,
    createArtifact: createArtifactHook,
    createArtifactFromMessage,
    addVersion: addVersionHook,
    selectVariant: selectVariantHook,
    updateTitle,
    setActiveArtifact: setActiveArtifactHook,
    deleteArtifact: deleteArtifactHook,
    duplicateArtifact: duplicateArtifactHook,
    shareArtifact: shareArtifactHook,
    unshareArtifact: unshareArtifactHook,
    getVersionHistory: getVersionHistoryHook,
    refetch,
  } = useEmailArtifacts({ conversationId });

  // ===== Sidebar State =====
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  const [activeTab, setActiveTabState] = useState<ArtifactTabView>('content');
  
  // ===== Streaming State =====
  const [streamingState, setStreamingState] = useState<ArtifactStreamingState>({
    isStreaming: false,
    artifactId: null,
    artifactKind: null,
    streamingVariant: null,
    partialContent: '',
  });
  
  // ===== Pending Suggestions State =====
  const [pendingSuggestions, setPendingSuggestions] = useState<Map<string, ArtifactSuggestion>>(new Map());

  // Active artifact - use hook's but allow local override
  const activeArtifact = activeArtifactFromHook;

  // ===== Sidebar Controls =====
  const openSidebar = useCallback(() => {
    setIsSidebarOpen(true);
  }, []);
  
  const openSidebarToTab = useCallback((tab: ArtifactTabView) => {
    setActiveTabState(tab);
    setIsSidebarOpen(true);
  }, []);
  
  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
    setIsSidebarPinned(false);
  }, []);
  
  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);
  
  const toggleSidebarPin = useCallback(() => {
    setIsSidebarPinned(prev => !prev);
  }, []);
  
  const setActiveTab = useCallback((tab: ArtifactTabView) => {
    setActiveTabState(tab);
  }, []);

  // ===== Active Artifact Management =====
  const setActiveArtifact = useCallback((artifactId: string | null) => {
    setActiveArtifactHook(artifactId);
    if (artifactId) {
      setIsSidebarOpen(true);
    }
  }, [setActiveArtifactHook]);

  const focusArtifact = useCallback((artifactId: string) => {
    setActiveArtifactHook(artifactId);
    setIsSidebarOpen(true);
  }, [setActiveArtifactHook]);

  // ===== CRUD Operations =====
  const createArtifact = useCallback(async (data: CreateEmailArtifact) => {
    const artifact = await createArtifactHook(data);
    if (artifact) {
      setIsSidebarOpen(true);
    }
    return artifact as EmailArtifactWithContent | null;
  }, [createArtifactHook]);

  const updateArtifact = useCallback(async (artifactId: string, data: Partial<EmailArtifactWithContent>) => {
    if (data.title) {
      await updateTitle(artifactId, data.title);
    }
  }, [updateTitle]);

  const deleteArtifact = useCallback(async (artifactId: string) => {
    await deleteArtifactHook(artifactId);
  }, [deleteArtifactHook]);

  const duplicateArtifact = useCallback(async (artifactId: string) => {
    const newArtifact = await duplicateArtifactHook(artifactId);
    if (newArtifact) {
      setIsSidebarOpen(true);
    }
    return newArtifact;
  }, [duplicateArtifactHook]);

  // ===== Version Management =====
  const addVersion = useCallback(async (artifactId: string, content: string, changeSummary?: string) => {
    const version = await addVersionHook(artifactId, content, changeSummary);
    return version;
  }, [addVersionHook]);
  
  const getVersionHistory = useCallback(async (artifactId: string) => {
    return getVersionHistoryHook(artifactId);
  }, [getVersionHistoryHook]);
  
  const restoreVersion = useCallback(async (artifactId: string, versionId: string) => {
    try {
      const history = await getVersionHistoryHook(artifactId);
      const versionToRestore = history.find((v: { id: string }) => v.id === versionId) as { id: string; content?: string; version?: number } | undefined;

      if (!versionToRestore) {
        console.error('[ArtifactContext] Version not found:', versionId);
        return;
      }

      const content = versionToRestore.content || '';
      await addVersionHook(artifactId, content, `Restored from version ${versionToRestore.version || 'previous'}`);
    } catch (error) {
      console.error('[ArtifactContext] Error restoring version:', error);
      throw error;
    }
  }, [getVersionHistoryHook, addVersionHook]);

  // ===== Variant Selection =====
  const selectVariant = useCallback(async (artifactId: string, variant: ArtifactVariant) => {
    await selectVariantHook(artifactId, variant);
  }, [selectVariantHook]);

  // ===== Sharing =====
  const shareArtifact = useCallback(async (artifactId: string) => {
    return shareArtifactHook(artifactId);
  }, [shareArtifactHook]);

  const unshareArtifact = useCallback(async (artifactId: string) => {
    await unshareArtifactHook(artifactId);
  }, [unshareArtifactHook]);

  // ===== Streaming =====
  const startStreaming = useCallback((artifactId: string, variant?: ArtifactVariant, kind?: ArtifactKind) => {
    setStreamingState({
      isStreaming: true,
      artifactId,
      artifactKind: kind || 'email',
      streamingVariant: variant || 'a',
      partialContent: '',
    });
    setIsSidebarOpen(true);
  }, []);
  
  const updateStreamingContent = useCallback((content: string) => {
    setStreamingState(prev => ({
      ...prev,
      partialContent: content,
    }));
  }, []);
  
  const finishStreaming = useCallback(() => {
    setStreamingState({
      isStreaming: false,
      artifactId: null,
      artifactKind: null,
      streamingVariant: null,
      partialContent: '',
    });
  }, []);

  // ===== Message Integration =====
  /**
   * Check if content contains artifact-worthy structured content.
   * Uses centralized detection AND worthiness checks for consistency with backend.
   */
  const hasArtifactContent = useCallback((content: string): boolean => {
    // First check if content has artifact structure
    const detection = detectArtifactContent(content);
    if (!detection.isArtifact || detection.confidence === 'low') {
      return false;
    }

    // Then check if content is worthy (not conversational, not questions)
    const worthiness = checkArtifactWorthiness(content, {
      hasStructuredContent: true,
    });

    return worthiness.isWorthy;
  }, []);
  
  const processAIResponse = useCallback(async (
    messageId: string, 
    content: string, 
    isEdit = false
  ): Promise<EmailArtifactWithContent | null> => {
    console.log('[ArtifactContext] Processing AI response', { 
      messageId, 
      conversationId, 
      hasContent: hasArtifactContent(content),
      isEdit 
    });
    
    if (!hasArtifactContent(content)) {
      console.log('[ArtifactContext] No artifact content detected');
      return null;
    }
    
    const existingArtifactId = activeArtifact?.source_message_id === messageId 
      ? activeArtifact.id 
      : null;
    
    const existingArtifact = existingArtifactId 
      ? artifacts.find(a => a.id === existingArtifactId)
      : null;
    
    if (isEdit && activeArtifact) {
      console.log('[ArtifactContext] Updating existing artifact version');
      await addVersion(activeArtifact.id, content, 'Updated based on feedback');
      await refetch();
      return activeArtifact;
    } else {
      console.log('[ArtifactContext] Creating new artifact from message');
      const artifact = await createArtifactFromMessage(messageId, content);
      if (artifact) {
        console.log('[ArtifactContext] Artifact created successfully:', artifact.id);
        setIsSidebarOpen(true);
      } else {
        console.warn('[ArtifactContext] Artifact creation returned null');
      }
      return artifact as EmailArtifactWithContent | null;
    }
  }, [hasArtifactContent, activeArtifact, artifacts, addVersion, refetch, createArtifactFromMessage, conversationId]);

  const findArtifactByMessageId = useCallback((messageId: string) => {
    return artifacts.find(a => a.source_message_id === messageId);
  }, [artifacts]);

  // ===== Artifact Suggestions (User-Triggered Creation) =====

  /**
   * Detect if content should be suggested as an artifact.
   * Uses centralized detectArtifactContent for consistent detection.
   */
  const suggestArtifact = useCallback((messageId: string, content: string): ArtifactSuggestion | null => {
    // Don't suggest if an artifact already exists for this message
    if (artifacts.find(a => a.source_message_id === messageId)) {
      return null;
    }

    // Use centralized detection
    const detection = detectArtifactContent(content);
    if (!detection.isArtifact || detection.confidence === 'low') {
      return null;
    }

    // Map detected kind to suggestion kind (filter to allowed types)
    const allowedKinds: ArtifactSuggestion['kind'][] = ['email', 'flow', 'campaign', 'template', 'subject_lines', 'content_brief'];
    const kind = allowedKinds.includes(detection.kind as ArtifactSuggestion['kind'])
      ? (detection.kind as ArtifactSuggestion['kind'])
      : 'email'; // Default to email for other types

    const suggestion: ArtifactSuggestion = {
      kind,
      messageId,
      confidence: detection.confidence as 'high' | 'medium',
      content,
      suggestedTitle: detection.suggestedTitle || 'Email Copy',
    };

    // Store the suggestion
    setPendingSuggestions(prev => {
      const newMap = new Map(prev);
      newMap.set(messageId, suggestion);
      return newMap;
    });

    return suggestion;
  }, [artifacts]);
  
  /**
   * Create an artifact from a previously suggested content
   * This is the user-triggered action
   */
  const createArtifactFromSuggestion = useCallback(async (
    suggestion: ArtifactSuggestion
  ): Promise<EmailArtifactWithContent | null> => {
    console.log('[ArtifactContext] Creating artifact from suggestion', { messageId: suggestion.messageId });
    
    const artifact = await createArtifactFromMessage(suggestion.messageId, suggestion.content);
    
    if (artifact) {
      // Remove from pending suggestions
      setPendingSuggestions(prev => {
        const newMap = new Map(prev);
        newMap.delete(suggestion.messageId);
        return newMap;
      });
      setIsSidebarOpen(true);
      console.log('[ArtifactContext] Artifact created from suggestion:', artifact.id);
    }
    
    return artifact as EmailArtifactWithContent | null;
  }, [createArtifactFromMessage]);
  
  /**
   * Dismiss a suggestion without creating an artifact
   */
  const dismissSuggestion = useCallback((messageId: string) => {
    setPendingSuggestions(prev => {
      const newMap = new Map(prev);
      newMap.delete(messageId);
      return newMap;
    });
    console.log('[ArtifactContext] Suggestion dismissed', { messageId });
  }, []);

  // ===== Utilities =====
  const getActiveVariantContent = useCallback(() => {
    if (!activeArtifact) return undefined;
    const variant = activeArtifact.selected_variant || 'a';
    switch (variant) {
      case 'a': return activeArtifact.version_a_content;
      case 'b': return activeArtifact.version_b_content;
      case 'c': return activeArtifact.version_c_content;
      default: return activeArtifact.version_a_content;
    }
  }, [activeArtifact]);

  // ===== Context Value =====
  const value = useMemo<ArtifactContextValue>(() => ({
    artifacts,
    activeArtifact,
    isLoading,
    error,
    
    isSidebarOpen,
    isSidebarPinned,
    activeTab,
    openSidebar,
    openSidebarToTab,
    closeSidebar,
    toggleSidebar,
    toggleSidebarPin,
    setActiveTab,
    setActiveArtifact,
    focusArtifact,
    
    createArtifact,
    updateArtifact,
    deleteArtifact,
    duplicateArtifact,

    addVersion,
    getVersionHistory,
    restoreVersion,
    
    selectVariant,
    
    shareArtifact,
    unshareArtifact,
    
    streamingState,
    startStreaming,
    updateStreamingContent,
    finishStreaming,
    
    processAIResponse,
    findArtifactByMessageId,
    hasArtifactContent,
    
    suggestArtifact,
    createArtifactFromSuggestion,
    pendingSuggestions,
    dismissSuggestion,
    
    refetch,
    getActiveVariantContent,
  }), [
    artifacts,
    activeArtifact,
    isLoading,
    error,
    isSidebarOpen,
    isSidebarPinned,
    activeTab,
    openSidebar,
    openSidebarToTab,
    closeSidebar,
    toggleSidebar,
    toggleSidebarPin,
    setActiveTab,
    setActiveArtifact,
    focusArtifact,
    createArtifact,
    updateArtifact,
    deleteArtifact,
    duplicateArtifact,
    addVersion,
    getVersionHistory,
    restoreVersion,
    selectVariant,
    shareArtifact,
    unshareArtifact,
    streamingState,
    startStreaming,
    updateStreamingContent,
    finishStreaming,
    processAIResponse,
    findArtifactByMessageId,
    hasArtifactContent,
    suggestArtifact,
    createArtifactFromSuggestion,
    pendingSuggestions,
    dismissSuggestion,
    refetch,
    getActiveVariantContent,
  ]);

  return (
    <ArtifactContext.Provider value={value}>
      {children}
    </ArtifactContext.Provider>
  );
}

// ===== Hooks =====
export function useArtifactContext(): ArtifactContextValue {
  const context = useContext(ArtifactContext);
  if (!context) {
    throw new Error('useArtifactContext must be used within an ArtifactProvider');
  }
  return context;
}

export function useOptionalArtifactContext(): ArtifactContextValue | null {
  return useContext(ArtifactContext);
}
