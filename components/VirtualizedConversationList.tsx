'use client';

import { ConversationWithStatus } from '@/types';
import { useEffect, useRef } from 'react';

interface VirtualizedConversationListProps {
  conversations: ConversationWithStatus[];
  currentConversationId: string | null;
  pinnedConversationIds: string[];
  editingId: string | null;
  editingTitle: string;
  onSelect: (conversationId: string) => void;
  onPrefetch?: (conversationId: string) => void;
  onStartRename: (e: React.MouseEvent, conversation: ConversationWithStatus) => void;
  onSaveRename: (e: React.FormEvent, conversationId: string) => void;
  onCancelRename: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent, conversationId: string) => void;
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
  onPrefetch,
  onStartRename,
  onSaveRename,
  onCancelRename,
  onDelete,
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

  const renderConversation = (conversation: ConversationWithStatus, index: number) => {
    const isActive = currentConversationId === conversation.id;
    const isEditing = editingId === conversation.id;
    const pinned = isPinned(conversation.id);

    // Get status indicator
    const getStatusIndicator = () => {
      if (!conversation.status || conversation.status === 'idle') return null;

      const statusConfig = {
        loading: { color: 'bg-blue-500', animate: 'animate-pulse' },
        ai_responding: { color: 'bg-gradient-to-r from-blue-500 to-purple-500', animate: 'animate-pulse' },
        error: { color: 'bg-red-500', animate: 'animate-pulse' }
      };

      const config = statusConfig[conversation.status];
      if (!config) return null;

      return (
        <div className={`absolute top-0 right-0 bottom-0 w-1 ${config.color} ${config.animate}`}></div>
      );
    };

    return (
      <div
        key={conversation.id}
        ref={isActive ? activeItemRef : null}
        className="px-2 mb-1"
      >
        <div
          onClick={() => !isEditing && onSelect(conversation.id)}
          onMouseEnter={() => onPrefetch?.(conversation.id)}
          className={`
            group relative h-full px-2.5 py-2 rounded-xl transition-all duration-200
            ${isEditing ? 'cursor-default' : 'cursor-pointer'}
            ${
              isActive
                ? 'bg-blue-600 dark:bg-blue-700 shadow-lg ring-2 ring-blue-400 dark:ring-blue-500'
                : 'bg-white/60 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm'
            }
          `}
        >
          {/* Status indicator */}
          {getStatusIndicator()}

          {/* Pin indicator */}
          {pinned && (
            <div className="absolute top-2 left-2 w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
          )}

          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0 pl-2">
              {isEditing ? (
                // Editing mode
                <form onSubmit={(e) => onSaveRename(e, conversation.id)} className="mb-1">
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={(e) => onSaveRename(e as any, conversation.id)}
                    autoFocus
                    className="w-full px-1.5 py-0.5 text-xs font-medium bg-white dark:bg-gray-600 border border-blue-500 dark:border-blue-400 rounded text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        onCancelRename(e as any);
                      }
                    }}
                  />
                </form>
              ) : (
                // Display mode
                <>
                  <h3
                    className={`text-sm font-semibold truncate leading-tight mb-1 ${
                      isActive ? 'text-white' : 'text-black dark:text-white'
                    }`}
                    onDoubleClick={(e) => onStartRename(e, conversation)}
                    title="Double-click to rename"
                  >
                    {conversation.title || 'New Conversation'}
                  </h3>
                  
                  {/* Preview snippet */}
                  {conversation.last_message_preview && (
                    <p className={`text-xs truncate mb-1 ${
                      isActive ? 'text-blue-100' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {conversation.last_message_preview}
                    </p>
                  )}
                </>
              )}
              
              <div className="flex items-center gap-1.5">
                {conversation.created_by_name && (
                  <span className={`text-xs truncate max-w-[100px] ${
                    isActive ? 'text-blue-100' : 'text-gray-600 dark:text-gray-500'
                  }`}>
                    {conversation.created_by_name}
                  </span>
                )}
                {conversation.created_by_name && <span className={`text-xs ${
                  isActive ? 'text-blue-200' : 'text-gray-500'
                }`}>•</span>}
                <span className={`text-xs ${
                  isActive ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {new Date(conversation.last_message_at || conversation.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>

            {!isEditing && (
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Rename button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartRename(e, conversation);
                  }}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors flex-shrink-0"
                  title="Rename"
                >
                  <svg
                    className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(e, conversation.id);
                  }}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors flex-shrink-0"
                  title="Delete"
                >
                  <svg
                    className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Progress bar for AI responding */}
          {conversation.status === 'ai_responding' && conversation.aiProgress !== undefined && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                style={{ width: `${conversation.aiProgress}%` }}
              ></div>
            </div>
          )}
        </div>
      </div>
    );
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
      className="w-full h-full overflow-y-auto overflow-x-hidden"
      style={{ maxHeight: `${height}px` }}
    >
      <div className="pb-2">
        {conversations.map((conversation, index) => renderConversation(conversation, index))}
      </div>
    </div>
  );
}

