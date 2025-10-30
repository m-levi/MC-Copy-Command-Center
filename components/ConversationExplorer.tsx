'use client';

import { ConversationWithStatus, ConversationQuickAction, OrganizationMember } from '@/types';
import { useState, useEffect } from 'react';
import ConversationCard from './ConversationCard';
import ConversationSearch from './ConversationSearch';
import { FilterType } from './ConversationFilterDropdown';

interface ConversationExplorerProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: ConversationWithStatus[];
  currentConversationId: string | null;
  pinnedConversationIds: string[];
  onSelectConversation: (conversationId: string) => void;
  onAction: (conversationId: string, action: ConversationQuickAction) => void;
  onPrefetch?: (conversationId: string) => void;
  teamMembers: OrganizationMember[];
  currentFilter: FilterType;
  selectedPersonId: string | null;
  onFilterChange: (filter: FilterType, personId?: string) => void;
}

export default function ConversationExplorer({
  isOpen,
  onClose,
  conversations,
  currentConversationId,
  pinnedConversationIds,
  onSelectConversation,
  onAction,
  onPrefetch,
  teamMembers,
  currentFilter,
  selectedPersonId,
  onFilterChange
}: ConversationExplorerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [localFilter, setLocalFilter] = useState<FilterType>(currentFilter);
  const [localPersonId, setLocalPersonId] = useState<string | null>(selectedPersonId);
  
  // Sync local filter state with props
  useEffect(() => {
    setLocalFilter(currentFilter);
    setLocalPersonId(selectedPersonId);
  }, [currentFilter, selectedPersonId]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Filter conversations based on search
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = !searchQuery || 
      conv.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.last_message_preview?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.created_by_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  // Separate pinned and unpinned
  const pinnedConversations = filteredConversations.filter(c => pinnedConversationIds.includes(c.id));
  const unpinnedConversations = filteredConversations.filter(c => !pinnedConversationIds.includes(c.id));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Explorer Panel */}
      <div className="relative w-full h-full max-w-7xl bg-white dark:bg-gray-900 shadow-2xl transform transition-all duration-300 ease-out overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">All Conversations</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {filteredConversations.length} conversation{filteredConversations.length !== 1 ? 's' : ''}
                {searchQuery && ' matching your search'}
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 dark:hover:bg-gray-700 rounded-full transition-colors group"
              title="Close (Esc)"
            >
              <svg
                className="w-6 h-6 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <ConversationSearch
                value={searchQuery}
                onChange={setSearchQuery}
                onClear={() => setSearchQuery('')}
                placeholder="Search by title, content, or creator..."
              />
            </div>

            {/* Quick Filter Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setLocalFilter('all');
                  onFilterChange('all');
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  localFilter === 'all'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                All Team
              </button>
              <button
                onClick={() => {
                  setLocalFilter('mine');
                  onFilterChange('mine');
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  localFilter === 'mine'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                Just Mine
              </button>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-950">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <svg className="w-24 h-24 text-gray-400 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                No conversations found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery ? 'Try adjusting your search terms' : 'Start a new conversation to get started'}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Pinned Section */}
              {pinnedConversations.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <svg className="w-5 h-5 text-yellow-500 fill-current" viewBox="0 0 24 24">
                      <path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Pinned ({pinnedConversations.length})
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pinnedConversations.map(conversation => (
                      <ConversationCard
                        key={conversation.id}
                        conversation={conversation}
                        isActive={conversation.id === currentConversationId}
                        isPinned={true}
                        onSelect={() => {
                          onSelectConversation(conversation.id);
                          onClose();
                        }}
                        onAction={(action) => onAction(conversation.id, action)}
                        onPrefetch={() => onPrefetch?.(conversation.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* All Conversations */}
              {unpinnedConversations.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {pinnedConversations.length > 0 ? `All Others (${unpinnedConversations.length})` : `All Conversations (${unpinnedConversations.length})`}
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {unpinnedConversations.map(conversation => (
                      <ConversationCard
                        key={conversation.id}
                        conversation={conversation}
                        isActive={conversation.id === currentConversationId}
                        isPinned={false}
                        onSelect={() => {
                          onSelectConversation(conversation.id);
                          onClose();
                        }}
                        onAction={(action) => onAction(conversation.id, action)}
                        onPrefetch={() => onPrefetch?.(conversation.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


