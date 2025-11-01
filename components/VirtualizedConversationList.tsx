'use client';

import { ConversationWithStatus, ConversationQuickAction } from '@/types';
import { useEffect, useRef } from 'react';
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
  height
}: VirtualizedConversationListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);

  // Scroll to active conversation when it changes
  useEffect(() => {
    if (currentConversationId && activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentConversationId]);

  const isPinned = (conversationId: string) => pinnedConversationIds.includes(conversationId);

  const handleQuickAction = (conversationId: string, action: ConversationQuickAction) => {
    if (onQuickAction) {
      onQuickAction(conversationId, action);
    } else {
      // Fallback for actions without onQuickAction prop
      if (action === 'delete') {
        const conversation = conversations.find(c => c.id === conversationId);
        if (conversation && confirm('Are you sure you want to delete this conversation?')) {
          // The parent will handle via onDelete through the conversation card
        }
      }
    }
  };

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
      ref={containerRef} 
      className="w-full h-full overflow-y-auto overflow-x-hidden px-2"
      style={{ maxHeight: `${height}px` }}
    >
      <div className="pb-2 space-y-1">
        {conversations.map((conversation, index) => (
          <div key={conversation.id} ref={conversation.id === currentConversationId ? activeItemRef : null}>
            <ConversationListItem
              conversation={conversation}
              isActive={conversation.id === currentConversationId}
              isPinned={isPinned(conversation.id)}
              currentConversationId={currentConversationId}
              onSelect={() => onSelect(conversation.id)}
              onSelectChild={onSelectChild}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

