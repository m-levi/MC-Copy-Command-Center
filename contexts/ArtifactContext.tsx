'use client';

import React, { createContext, useContext, useCallback, useState, useMemo } from 'react';
import { useEmailArtifacts } from '@/hooks/useEmailArtifacts';
import {
  EmailArtifactWithContent,
  ArtifactVariant,
  ArtifactStreamingState,
  CreateEmailArtifact,
  ArtifactKind,
  ARTIFACT_KIND_REGISTRY,
  ArtifactKindConfig,
} from '@/types/artifacts';

// =====================================================
// ARTIFACT CONTEXT
// Provides artifact management throughout the app
// Currently focused on email, extensible for other types
// =====================================================

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
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  toggleSidebarPin: () => void;
  
  // ===== Active Artifact Management =====
  setActiveArtifact: (artifactId: string | null) => void;
  focusArtifact: (artifactId: string) => void;
  
  // ===== CRUD Operations =====
  createArtifact: (data: CreateEmailArtifact) => Promise<EmailArtifactWithContent | null>;
  updateArtifact: (artifactId: string, data: Partial<EmailArtifactWithContent>) => Promise<void>;
  deleteArtifact: (artifactId: string) => Promise<void>;
  
  // ===== Version Management =====
  addVersion: (artifactId: string, content: string, changeSummary?: string) => Promise<unknown>;
  getVersionHistory: (artifactId: string) => Promise<unknown[]>;
  restoreVersion: (artifactId: string, versionId: string) => Promise<void>;
  
  // ===== Variant Selection (Email-specific) =====
  selectVariant: (artifactId: string, variant: ArtifactVariant) => Promise<void>;
  
  // ===== Sharing =====
  shareArtifact: (artifactId: string) => Promise<string | null>;
  unshareArtifact: (artifactId: string) => Promise<void>;
  
  // ===== Streaming =====
  streamingState: ArtifactStreamingState;
  startStreaming: (artifactId: string, variant?: ArtifactVariant) => void;
  updateStreamingContent: (content: string) => void;
  finishStreaming: () => void;
  
  // ===== Message Integration =====
  processAIResponse: (messageId: string, content: string, isEdit?: boolean) => Promise<EmailArtifactWithContent | null>;
  findArtifactByMessageId: (messageId: string) => EmailArtifactWithContent | undefined;
  hasArtifactContent: (content: string) => boolean;
  
  // ===== Utilities =====
  refetch: () => Promise<void>;
  getActiveVariantContent: () => string | undefined;
  
  // ===== Extensibility =====
  currentArtifactKind: ArtifactKind;
  getKindConfig: (kind: ArtifactKind) => ArtifactKindConfig;
  supportedKinds: ArtifactKind[];
}

// ===== Context =====
const ArtifactContext = createContext<ArtifactContextValue | null>(null);

// ===== Provider Props =====
interface ArtifactProviderProps {
  children: React.ReactNode;
  conversationId: string;
  defaultKind?: ArtifactKind;
}

// ===== Provider Component =====
export function ArtifactProvider({ 
  children, 
  conversationId,
  defaultKind = 'email',
}: ArtifactProviderProps) {
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
    shareArtifact: shareArtifactHook,
    unshareArtifact: unshareArtifactHook,
    getVersionHistory: getVersionHistoryHook,
    refetch,
  } = useEmailArtifacts({ conversationId });

  // ===== Sidebar State =====
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  
  // ===== Streaming State =====
  const [streamingState, setStreamingState] = useState<ArtifactStreamingState>({
    isStreaming: false,
    artifactId: null,
    artifactKind: null,
    streamingVariant: null,
    partialContent: '',
  });

  // Active artifact - use hook's but allow local override
  const activeArtifact = activeArtifactFromHook;

  // ===== Sidebar Controls =====
  const openSidebar = useCallback(() => {
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

  // ===== Version Management =====
  const addVersion = useCallback(async (artifactId: string, content: string, changeSummary?: string) => {
    const version = await addVersionHook(artifactId, content, changeSummary);
    return version;
  }, [addVersionHook]);
  
  const getVersionHistory = useCallback(async (artifactId: string) => {
    return getVersionHistoryHook(artifactId);
  }, [getVersionHistoryHook]);
  
  const restoreVersion = useCallback(async (artifactId: string, versionId: string) => {
    const history = await getVersionHistoryHook(artifactId);
    const versionToRestore = history.find((v: any) => v.id === versionId);
    if (versionToRestore) {
      const content = (versionToRestore as any).content || '';
      await addVersionHook(artifactId, content, `Restored from version ${(versionToRestore as any).version || 'previous'}`);
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
  const startStreaming = useCallback((messageIdOrArtifactId: string, variant?: ArtifactVariant) => {
    setStreamingState({
      isStreaming: true,
      artifactId: messageIdOrArtifactId,
      artifactKind: 'email',
      streamingVariant: variant || 'a',
      partialContent: '',
    });
    // Open sidebar immediately when streaming starts
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
  const hasArtifactContent = useCallback((content: string): boolean => {
    // Check for version tags from AI (primary format)
    if (/<version_[abc]>/i.test(content)) return true;
    // Check for markdown version headers
    if (/## Version [ABC]/i.test(content)) return true;
    if (/\*\*Version [ABC]\*\*/i.test(content)) return true;
    // Check for structured email markers
    if (/\*\*(HERO|SUBJECT|TEXT|CTA|BUTTON)\*\*/i.test(content)) return true;
    // Check for email section markers
    if (/\[(HERO|SUBJECT|TEXT|CTA|BUTTON)\]/i.test(content)) return true;
    return false;
  }, []);
  
  const processAIResponse = useCallback(async (
    messageId: string,
    content: string,
    isEdit = false
  ): Promise<EmailArtifactWithContent | null> => {
    if (!hasArtifactContent(content)) return null;

    // IMPORTANT: Check if an artifact already exists for this message
    // This prevents duplicates when the page is refreshed
    const existingArtifact = artifacts.find(a => a.source_message_id === messageId);
    if (existingArtifact) {
      // Artifact already exists for this message - don't create duplicate
      return existingArtifact;
    }

    if (isEdit && activeArtifact) {
      await addVersion(activeArtifact.id, content, 'Updated based on feedback');
      await refetch();
      return activeArtifact;
    } else {
      const artifact = await createArtifactFromMessage(messageId, content);
      if (artifact) {
        setIsSidebarOpen(true);
      }
      return artifact as EmailArtifactWithContent | null;
    }
  }, [hasArtifactContent, activeArtifact, artifacts, addVersion, refetch, createArtifactFromMessage]);

  const findArtifactByMessageId = useCallback((messageId: string) => {
    return artifacts.find(a => a.source_message_id === messageId);
  }, [artifacts]);

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

  // ===== Extensibility =====
  const getKindConfig = useCallback((kind: ArtifactKind) => {
    return ARTIFACT_KIND_REGISTRY[kind];
  }, []);

  const supportedKinds = useMemo<ArtifactKind[]>(() => {
    return Object.keys(ARTIFACT_KIND_REGISTRY) as ArtifactKind[];
  }, []);

  // ===== Context Value =====
  const value = useMemo<ArtifactContextValue>(() => ({
    artifacts,
    activeArtifact,
    isLoading,
    error,
    
    isSidebarOpen,
    isSidebarPinned,
    openSidebar,
    closeSidebar,
    toggleSidebar,
    toggleSidebarPin,
    setActiveArtifact,
    focusArtifact,
    
    createArtifact,
    updateArtifact,
    deleteArtifact,
    
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
    
    refetch,
    getActiveVariantContent,
    
    // Extensibility
    currentArtifactKind: defaultKind,
    getKindConfig,
    supportedKinds,
  }), [
    artifacts,
    activeArtifact,
    isLoading,
    error,
    isSidebarOpen,
    isSidebarPinned,
    openSidebar,
    closeSidebar,
    toggleSidebar,
    toggleSidebarPin,
    setActiveArtifact,
    focusArtifact,
    createArtifact,
    updateArtifact,
    deleteArtifact,
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
    refetch,
    getActiveVariantContent,
    defaultKind,
    getKindConfig,
    supportedKinds,
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
