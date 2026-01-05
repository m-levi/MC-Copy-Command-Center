import { useState, useEffect, useCallback, useRef } from 'react';
import { SidebarViewMode, UserPreferences, ConversationWithStatus, ConversationQuickAction } from '@/types';
import { getUserPreferences, upsertUserPreferences, getDefaultPreferences } from '@/lib/user-preferences';
import { togglePinConversation, toggleArchiveConversation, duplicateConversation, exportConversation, exportConversationAsMarkdown, deleteConversation, toggleConversationVisibility } from '@/lib/conversation-actions';
import { Conversation } from '@/types';
import toast from 'react-hot-toast';

// Debounce delay for saving sidebar width (ms)
const SIDEBAR_WIDTH_SAVE_DELAY = 500;

interface UseSidebarStateProps {
  userId: string;
  userName: string;
  conversations: Conversation[];
  onConversationUpdate: () => void;
}

interface UseSidebarStateReturn {
  viewMode: SidebarViewMode;
  pinnedConversationIds: string[];
  sidebarWidth: number;
  conversationsWithStatus: ConversationWithStatus[];
  activeConversationIds: Set<string>;
  setViewMode: (mode: SidebarViewMode) => void;
  setSidebarWidth: (width: number) => void;
  handleQuickAction: (conversationId: string, action: ConversationQuickAction) => Promise<void>;
  markConversationActive: (conversationId: string, isActive: boolean) => void;
  updateConversationStatus: (conversationId: string, status: 'idle' | 'loading' | 'ai_responding' | 'error', progress?: number) => void;
}

export function useSidebarState({
  userId,
  userName,
  conversations,
  onConversationUpdate
}: UseSidebarStateProps): UseSidebarStateReturn {
  const [viewMode, setViewModeState] = useState<SidebarViewMode>('list');
  const [pinnedConversationIds, setPinnedConversationIds] = useState<string[]>([]);
  const [sidebarWidth, setSidebarWidthState] = useState(398);
  const [activeConversationIds, setActiveConversationIds] = useState<Set<string>>(new Set());
  const [conversationStatuses, setConversationStatuses] = useState<Map<string, { status: 'idle' | 'loading' | 'ai_responding' | 'error', progress?: number }>>(new Map());

  // Ref for debouncing sidebar width saves
  const sidebarWidthSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Refs for status timeout cleanup
  const statusTimeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (sidebarWidthSaveTimerRef.current) {
        clearTimeout(sidebarWidthSaveTimerRef.current);
      }
      statusTimeoutRefs.current.forEach(timer => clearTimeout(timer));
      statusTimeoutRefs.current.clear();
    };
  }, []);

  // Load user preferences on mount
  useEffect(() => {
    loadPreferences();
  }, [userId]);

  const loadPreferences = async () => {
    if (!userId) return;

    const prefs = await getUserPreferences(userId);
    if (prefs) {
      setViewModeState(prefs.sidebar_view_mode);
      setPinnedConversationIds(prefs.pinned_conversations || []);
      setSidebarWidthState(prefs.sidebar_width);
    } else {
      // Create default preferences
      const defaults = getDefaultPreferences(userId);
      await upsertUserPreferences(userId, {
        sidebar_view_mode: defaults.sidebar_view_mode,
        sidebar_width: defaults.sidebar_width,
        pinned_conversations: defaults.pinned_conversations
      });
    }
  };

  // Update pinned IDs from conversations
  useEffect(() => {
    const pinned = conversations
      .filter(c => c.is_pinned)
      .map(c => c.id);
    setPinnedConversationIds(pinned);
  }, [conversations]);

  const setViewMode = useCallback(async (mode: SidebarViewMode) => {
    setViewModeState(mode);
    if (userId) {
      await upsertUserPreferences(userId, { sidebar_view_mode: mode });
    }
  }, [userId]);

  const setSidebarWidth = useCallback((width: number) => {
    // Immediately update local state for responsive UI
    setSidebarWidthState(width);

    // Debounce the database save to prevent 50+ API calls per drag
    if (userId) {
      if (sidebarWidthSaveTimerRef.current) {
        clearTimeout(sidebarWidthSaveTimerRef.current);
      }
      sidebarWidthSaveTimerRef.current = setTimeout(() => {
        upsertUserPreferences(userId, { sidebar_width: width });
      }, SIDEBAR_WIDTH_SAVE_DELAY);
    }
  }, [userId]);

  const handleQuickAction = useCallback(async (conversationId: string, action: ConversationQuickAction) => {
    const isPinned = pinnedConversationIds.includes(conversationId);

    switch (action) {
      case 'pin':
        await togglePinConversation(conversationId, true);
        break;
      case 'unpin':
        await togglePinConversation(conversationId, false);
        break;
      case 'archive':
        await toggleArchiveConversation(conversationId, true);
        break;
      case 'unarchive':
        await toggleArchiveConversation(conversationId, false);
        break;
      case 'duplicate':
        const newConv = await duplicateConversation(conversationId, userId, userName);
        if (newConv) {
          onConversationUpdate();
        }
        break;
      case 'export':
        // Show dialog to choose format
        const format = confirm('Export as Markdown? (Cancel for JSON)');
        if (format) {
          await exportConversationAsMarkdown(conversationId);
        } else {
          await exportConversation(conversationId);
        }
        break;
      case 'delete':
        // Confirm before deleting
        if (confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
          const success = await deleteConversation(conversationId);
          if (success) {
            onConversationUpdate();
          }
        }
        break;
      case 'rename':
        // Rename is handled separately in the UI
        break;
      case 'share_with_team':
        const sharedResult = await toggleConversationVisibility(conversationId, 'team');
        if (sharedResult) {
          toast.success('Conversation shared with team');
        }
        break;
      case 'make_private':
        const privateResult = await toggleConversationVisibility(conversationId, 'private');
        if (privateResult) {
          toast.success('Conversation is now private');
        }
        break;
    }

    // Reload preferences and conversations
    await loadPreferences();
    onConversationUpdate();
  }, [userId, userName, pinnedConversationIds, onConversationUpdate]);

  const markConversationActive = useCallback((conversationId: string, isActive: boolean) => {
    setActiveConversationIds(prev => {
      const newSet = new Set(prev);
      if (isActive) {
        newSet.add(conversationId);
      } else {
        newSet.delete(conversationId);
      }
      return newSet;
    });
  }, []);

  const updateConversationStatus = useCallback((
    conversationId: string,
    status: 'idle' | 'loading' | 'ai_responding' | 'error',
    progress?: number
  ) => {
    setConversationStatuses(prev => {
      const newMap = new Map(prev);
      newMap.set(conversationId, { status, progress });
      return newMap;
    });

    // Clear any existing timeout for this conversation
    const existingTimeout = statusTimeoutRefs.current.get(conversationId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      statusTimeoutRefs.current.delete(conversationId);
    }

    // Auto-clear status after some time for non-active states
    if (status === 'idle' || status === 'error') {
      const timeout = setTimeout(() => {
        setConversationStatuses(prev => {
          const newMap = new Map(prev);
          newMap.delete(conversationId);
          return newMap;
        });
        statusTimeoutRefs.current.delete(conversationId);
      }, status === 'error' ? 5000 : 1000);
      statusTimeoutRefs.current.set(conversationId, timeout);
    }
  }, []);

  // Merge conversations with their statuses
  const conversationsWithStatus: ConversationWithStatus[] = conversations.map(conv => {
    const statusData = conversationStatuses.get(conv.id);
    return {
      ...conv,
      status: statusData?.status || 'idle',
      aiProgress: statusData?.progress
    };
  });

  return {
    viewMode,
    pinnedConversationIds,
    sidebarWidth,
    conversationsWithStatus,
    activeConversationIds,
    setViewMode,
    setSidebarWidth,
    handleQuickAction,
    markConversationActive,
    updateConversationStatus
  };
}










