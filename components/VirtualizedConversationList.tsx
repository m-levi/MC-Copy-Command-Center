'use client';

import { ConversationWithStatus, ConversationQuickAction } from '@/types';
import { useEffect, useRef, useMemo, useCallback } from 'react';
import ConversationListItem from './ConversationListItem';

interface VirtualizedConversationListProps {
  conversations: ConversationWithStatus[];
  currentConversationId: string | null;
  pinnedConversationIds: string[];
  editingId: string | null;
  editingTitle: string;
  onSelect: (conversationId: string) => void;
  onSelectChild?: (childId: string) => void;
  onPrefetch?: (conversationId: string) => void;
  onStartRename: (e: React.MouseEvent, conversation: ConversationWithStatus) => void;
  onSaveRename: (e: React.FormEvent, conversationId: string) => void;
  onCancelRename: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent, conversationId: string) => void;
  onQuickAction?: (conversationId: string, action: ConversationQuickAction) => void;
  setEditingTitle: (title: string) => void;
  height: number;
  bulkSelectMode?: boolean;
  selectedConversationIds?: Set<string>;
  onToggleSelect?: (conversationId: string, event?: React.MouseEvent) => void;
}

// Group conversations by date
interface GroupedConversations {
  pinned: ConversationWithStatus[];
  today: ConversationWithStatus[];
  yesterday: ConversationWithStatus[];
  lastWeek: ConversationWithStatus[];
  older: ConversationWithStatus[];
}

export default function VirtualizedConversationList({
  conversations,
  currentConversationId,
  pinnedConversationIds,
  editingId,
  editingTitle,
  onSelect,
  onSelectChild,
  onPrefetch,
  onStartRename,
  onSaveRename,
  onCancelRename,
  onDelete,
  onQuickAction,
  setEditingTitle,
  height,
  bulkSelectMode = false,
  selectedConversationIds = new Set(),
  onToggleSelect
}: VirtualizedConversationListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Memoize isPinned check for performance
  const pinnedSet = useMemo(() => new Set(pinnedConversationIds), [pinnedConversationIds]);
  
  // Group conversations by date
  const groupedConversations = useMemo((): GroupedConversations => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const result: GroupedConversations = {
      pinned: [],
      today: [],
      yesterday: [],
      lastWeek: [],
      older: []
    };

    conversations.forEach(c => {
      if (pinnedSet.has(c.id)) {
        result.pinned.push(c);
        return;
      }

      const date = new Date(c.last_message_at || c.created_at);
      if (date >= today) {
        result.today.push(c);
      } else if (date >= yesterday) {
        result.yesterday.push(c);
      } else if (date >= lastWeek) {
        result.lastWeek.push(c);
      } else {
        result.older.push(c);
      }
    });

    return result;
  }, [conversations, pinnedSet]);

  // Scroll to active conversation when it changes
  useEffect(() => {
    if (currentConversationId && listRef.current) {
      const activeElement = listRef.current.querySelector(`[data-conversation-id="${currentConversationId}"]`);
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [currentConversationId]);

  const handleQuickAction = useCallback((conversationId: string, action: ConversationQuickAction) => {
    if (onQuickAction) {
      onQuickAction(conversationId, action);
    }
  }, [onQuickAction]);

  // Render a group header
  const renderHeader = (label: string) => (
    <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm py-2 pl-3 pr-2 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2 sticky top-0 z-10">
      <span>{label}</span>
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800"></div>
    </div>
  );

  // Render a conversation item
  const renderConversation = (conversation: ConversationWithStatus) => (
    <div 
      key={conversation.id} 
      className="pl-2 pr-1"
      data-conversation-id={conversation.id}
    >
      <ConversationListItem
        conversation={conversation}
        isActive={conversation.id === currentConversationId}
        isPinned={pinnedSet.has(conversation.id)}
        currentConversationId={currentConversationId}
        onSelect={() => onSelect(conversation.id)}
        onSelectChild={onSelectChild}
        onAction={(action) => handleQuickAction(conversation.id, action)}
        bulkSelectMode={bulkSelectMode}
        isSelected={selectedConversationIds.has(conversation.id)}
        onToggleSelect={(event) => onToggleSelect?.(conversation.id, event)}
      />
    </div>
  );

  if (conversations.length === 0) {
    return (
      <div className="px-3 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
        <svg className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        <p>No conversations yet</p>
        <p className="text-xs mt-1">Start a new conversation to get started</p>
      </div>
    );
  }

  return (
    <div 
      ref={listRef}
      className="overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700"
      style={{ height }}
    >
      {/* Pinned */}
      {groupedConversations.pinned.length > 0 && (
        <>
          {renderHeader('Pinned')}
          {groupedConversations.pinned.map(renderConversation)}
        </>
      )}

      {/* Today */}
      {groupedConversations.today.length > 0 && (
        <>
          {renderHeader('Today')}
          {groupedConversations.today.map(renderConversation)}
        </>
      )}

      {/* Yesterday */}
      {groupedConversations.yesterday.length > 0 && (
        <>
          {renderHeader('Yesterday')}
          {groupedConversations.yesterday.map(renderConversation)}
        </>
      )}

      {/* Previous 7 Days */}
      {groupedConversations.lastWeek.length > 0 && (
        <>
          {renderHeader('Previous 7 Days')}
          {groupedConversations.lastWeek.map(renderConversation)}
        </>
      )}

      {/* Older */}
      {groupedConversations.older.length > 0 && (
        <>
          {renderHeader('Older')}
          {groupedConversations.older.map(renderConversation)}
        </>
      )}
    </div>
  );
}
