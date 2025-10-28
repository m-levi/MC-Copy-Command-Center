'use client';

import { Conversation, OrganizationMember } from '@/types';
import { useState, useRef, useEffect } from 'react';
import ConversationFilterDropdown, { FilterType } from './ConversationFilterDropdown';

interface ChatSidebarProps {
  brandName: string;
  brandId?: string;
  conversations: Conversation[];
  currentConversationId: string | null;
  teamMembers: OrganizationMember[];
  currentFilter: FilterType;
  selectedPersonId: string | null;
  onFilterChange: (filter: FilterType, personId?: string) => void;
  onNewConversation: () => void;
  onSelectConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
  onRenameConversation: (conversationId: string, newTitle: string) => void;
  onPrefetchConversation?: (conversationId: string) => void;
}

export default function ChatSidebar({
  brandName,
  brandId,
  conversations,
  currentConversationId,
  teamMembers,
  currentFilter,
  selectedPersonId,
  onFilterChange,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
  onPrefetchConversation,
}: ChatSidebarProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [sidebarWidth, setSidebarWidth] = useState(398);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const handleDelete = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this conversation?')) {
      onDeleteConversation(conversationId);
    }
  };

  const handleStartRename = (e: React.MouseEvent, conversation: Conversation) => {
    e.stopPropagation();
    setEditingId(conversation.id);
    setEditingTitle(conversation.title || 'New Conversation');
  };

  const handleSaveRename = (e: React.FormEvent, conversationId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const trimmedTitle = editingTitle.trim();
    if (trimmedTitle && trimmedTitle !== '') {
      onRenameConversation(conversationId, trimmedTitle);
    }
    setEditingId(null);
    setEditingTitle('');
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setEditingTitle('');
  };

  // Resize handlers
  const startResizing = () => {
    setIsResizing(true);
  };

  const stopResizing = () => {
    setIsResizing(false);
  };

  const resize = (e: MouseEvent) => {
    if (isResizing && sidebarRef.current) {
      const newWidth = e.clientX;
      if (newWidth >= 280 && newWidth <= 600) {
        setSidebarWidth(newWidth);
      }
    }
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', resize);
      document.addEventListener('mouseup', stopResizing);
      return () => {
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResizing);
      };
    }
  }, [isResizing]);

  return (
    <div 
      ref={sidebarRef}
      className="bg-[#f0f0f0] dark:bg-gray-900 text-black dark:text-white flex flex-col h-screen border-r border-[#d8d8d8] dark:border-gray-700 relative"
      style={{ width: `${sidebarWidth}px` }}
    >
      {/* Brand header */}
      <div className="px-4 py-4 border-b border-[#d8d8d8] dark:border-gray-700">
        <h2 className="text-base font-semibold truncate">{brandName}</h2>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Email Copywriter</p>
      </div>

      {/* New conversation button */}
      <div className="p-3">
        <button
          onClick={onNewConversation}
          className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 cursor-pointer text-white group"
        >
          <svg
            className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span>New Conversation</span>
        </button>
      </div>

      {/* Filter dropdown */}
      <div className="px-3 pb-3">
        <ConversationFilterDropdown
          currentFilter={currentFilter}
          selectedPersonId={selectedPersonId}
          teamMembers={teamMembers}
          onFilterChange={onFilterChange}
        />
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="px-3 py-4 text-center text-gray-500 dark:text-gray-400 text-xs">
            No conversations yet
          </div>
        ) : (
          <div className="space-y-0.5 px-2">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => editingId !== conversation.id && onSelectConversation(conversation.id)}
                onMouseEnter={() => onPrefetchConversation?.(conversation.id)}
                className={`
                  group relative px-2.5 py-2 rounded-md transition-all
                  ${editingId === conversation.id ? 'cursor-default' : 'cursor-pointer'}
                  ${
                    currentConversationId === conversation.id
                      ? 'bg-white dark:bg-gray-700 shadow-sm'
                      : 'hover:bg-[#e5e5e5] dark:hover:bg-gray-800'
                  }
                `}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {editingId === conversation.id ? (
                      // Editing mode
                      <form onSubmit={(e) => handleSaveRename(e, conversation.id)} className="mb-1">
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onBlur={(e) => handleSaveRename(e as any, conversation.id)}
                          autoFocus
                          className="w-full px-1.5 py-0.5 text-xs font-medium bg-white dark:bg-gray-600 border border-blue-500 dark:border-blue-400 rounded text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              handleCancelRename(e as any);
                            }
                          }}
                        />
                      </form>
                    ) : (
                      // Display mode
                      <h3 
                        className="text-xs font-medium truncate leading-tight text-black dark:text-white"
                        onDoubleClick={(e) => handleStartRename(e, conversation)}
                        title="Double-click to rename"
                      >
                        {conversation.title || 'New Conversation'}
                      </h3>
                    )}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {conversation.created_by_name && (
                        <span className="text-xs text-gray-600 dark:text-gray-500 truncate">
                          {conversation.created_by_name}
                        </span>
                      )}
                      <span className="text-xs text-gray-500 dark:text-gray-500">•</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(conversation.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                  {editingId !== conversation.id && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                      {/* Rename button */}
                      <button
                        onClick={(e) => handleStartRename(e, conversation)}
                        className="p-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-opacity flex-shrink-0"
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
                        onClick={(e) => handleDelete(e, conversation.id)}
                        className="p-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-opacity flex-shrink-0"
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
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Back to brands - Enhanced */}
      <div className="px-3 py-3 border-t border-[#d8d8d8] dark:border-gray-700 space-y-2">
        <a
          href="/"
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-150 cursor-pointer hover:scale-105 group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>All Brands</span>
        </a>
      </div>

      {/* Resize handle */}
      <div
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 dark:hover:bg-blue-400 transition-colors z-10 group"
        onMouseDown={startResizing}
      >
        <div className="absolute top-1/2 right-0 transform -translate-y-1/2 w-1 h-12 bg-gray-300 dark:bg-gray-600 group-hover:bg-blue-500 dark:group-hover:bg-blue-400 transition-colors rounded-full"></div>
      </div>
    </div>
  );
}


