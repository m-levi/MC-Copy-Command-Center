'use client';

import { ConversationWithStatus, ConversationQuickAction } from '@/types';
import { useEffect, useRef, useMemo } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);

  // Scroll to active conversation when it changes
  useEffect(() => {
    if (currentConversationId && activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentConversationId]);

  // Memoize isPinned check for performance - MUST be before early return
  const pinnedSet = useMemo(() => new Set(pinnedConversationIds), [pinnedConversationIds]);
  
  // Memoize grouped conversations for performance - MUST be before early return
  const groupedConversations = useMemo(() => {
    // Separate pinned and unpinned
    const pinned = conversations.filter(c => pinnedSet.has(c.id));
    const unpinned = conversations.filter(c => !pinnedSet.has(c.id));
    
    const groups: { label: string; items: ConversationWithStatus[] }[] = [];

    // Pinned Group
    if (pinned.length > 0) {
      groups.push({ label: 'Pinned', items: pinned });
    }

    // Date grouping for unpinned
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const todayItems: ConversationWithStatus[] = [];
    const yesterdayItems: ConversationWithStatus[] = [];
    const lastWeekItems: ConversationWithStatus[] = [];
    const olderItems: ConversationWithStatus[] = [];

    unpinned.forEach(c => {
      const date = new Date(c.last_message_at || c.created_at);
      if (date >= today) {
        todayItems.push(c);
      } else if (date >= yesterday) {
        yesterdayItems.push(c);
      } else if (date >= lastWeek) {
        lastWeekItems.push(c);
      } else {
        olderItems.push(c);
      }
    });

    if (todayItems.length > 0) groups.push({ label: 'Today', items: todayItems });
    if (yesterdayItems.length > 0) groups.push({ label: 'Yesterday', items: yesterdayItems });
    if (lastWeekItems.length > 0) groups.push({ label: 'Previous 7 Days', items: lastWeekItems });
    if (olderItems.length > 0) groups.push({ label: 'Older', items: olderItems });

    return groups;
  }, [conversations, pinnedSet]);

  const isPinned = (conversationId: string) => pinnedSet.has(conversationId);

  const handleQuickAction = (conversationId: string, action: ConversationQuickAction) => {
    if (onQuickAction) {
      onQuickAction(conversationId, action);
    }
  };

  if (groupedConversations.length === 0) {
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
      ref={containerRef} 
      className="w-full h-full overflow-y-auto overflow-x-hidden"
      style={{ maxHeight: `${height}px` }}
    >
      <div className="pb-2 space-y-4 pr-1">
        {groupedConversations.map((group) => (
          <div key={group.label}>
            <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm py-2 pl-3 pr-2 mb-2 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <span>{group.label}</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800"></div>
            </div>
            <div className="space-y-1 pl-2 pr-1">
              {group.items.map((conversation) => (
                <div key={conversation.id} ref={conversation.id === currentConversationId ? activeItemRef : null}>
                  <ConversationListItem
                    conversation={conversation}
                    isActive={conversation.id === currentConversationId}
                    isPinned={isPinned(conversation.id)}
                    currentConversationId={currentConversationId}
                    onSelect={() => onSelect(conversation.id)}
                    onSelectChild={onSelectChild}
                    onAction={(action) => handleQuickAction(conversation.id, action)}
                    bulkSelectMode={bulkSelectMode}
                    isSelected={selectedConversationIds.has(conversation.id)}
                    onToggleSelect={(event) => onToggleSelect?.(conversation.id, event)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

