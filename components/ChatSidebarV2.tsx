'use client';

import { ConversationWithMetadata, OrganizationMember, SidebarViewMode, ConversationQuickAction, ConversationSortOption, ConversationTag } from '@/types';
import { useState, useRef, useEffect } from 'react';
import ConversationFilterDropdown, { FilterType } from './ConversationFilterDropdown';
import ConversationSearch from './ConversationSearch';
import ConversationCard from './ConversationCard';
import VirtualizedConversationList from './VirtualizedConversationList';
import ConversationExplorer from './ConversationExplorer';
import AdvancedSearchPanel, { AdvancedSearchFilters } from './AdvancedSearchPanel';
import ConversationTags from './ConversationTags';
import ConversationAnalyticsBadge from './ConversationAnalyticsBadge';

interface ChatSidebarV2Props {
  brandName: string;
  brandId?: string;
  conversations: ConversationWithMetadata[];
  currentConversationId: string | null;
  teamMembers: OrganizationMember[];
  currentFilter: FilterType;
  selectedPersonId: string | null;
  pinnedConversationIds: string[];
  viewMode: SidebarViewMode;
  sortBy: ConversationSortOption;
  onFilterChange: (filter: FilterType, personId?: string) => void;
  onNewConversation: () => void;
  onSelectConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
  onRenameConversation: (conversationId: string, newTitle: string) => void;
  onPrefetchConversation?: (conversationId: string) => void;
  onQuickAction: (conversationId: string, action: ConversationQuickAction) => void;
  onViewModeChange: (mode: SidebarViewMode) => void;
  onSidebarWidthChange: (width: number) => void;
  onSortChange: (sort: ConversationSortOption) => void;
  onAddTag?: (conversationId: string, tag: ConversationTag) => void;
  onRemoveTag?: (conversationId: string, tagId: string) => void;
  onBulkAction?: (conversationIds: string[], action: ConversationQuickAction) => void;
  initialWidth?: number;
}

export default function ChatSidebarV2({
  brandName,
  brandId,
  conversations,
  currentConversationId,
  teamMembers,
  currentFilter,
  selectedPersonId,
  pinnedConversationIds,
  viewMode,
  sortBy,
  onFilterChange,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
  onPrefetchConversation,
  onQuickAction,
  onViewModeChange,
  onSidebarWidthChange,
  onSortChange,
  onAddTag,
  onRemoveTag,
  onBulkAction,
  initialWidth = 398
}: ChatSidebarV2Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [sidebarWidth, setSidebarWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedSearchFilters>({ query: '' });
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set());
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(600);

  const handleDelete = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this conversation?')) {
      onDeleteConversation(conversationId);
    }
  };

  const handleStartRename = (e: React.MouseEvent, conversation: ConversationWithMetadata) => {
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

  // Bulk selection handlers
  const toggleBulkSelect = (conversationId: string) => {
    setSelectedConversations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(conversationId)) {
        newSet.delete(conversationId);
      } else {
        newSet.add(conversationId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedConversations(new Set(filteredConversations.map(c => c.id)));
  };

  const deselectAll = () => {
    setSelectedConversations(new Set());
  };

  const handleBulkAction = (action: ConversationQuickAction) => {
    if (selectedConversations.size === 0) return;
    if (onBulkAction) {
      onBulkAction(Array.from(selectedConversations), action);
      setSelectedConversations(new Set());
      setBulkSelectMode(false);
    }
  };

  // Resize handlers
  const startResizing = () => {
    setIsResizing(true);
  };

  const stopResizing = () => {
    setIsResizing(false);
    onSidebarWidthChange(sidebarWidth);
  };

  const resize = (e: MouseEvent) => {
    if (isResizing && sidebarRef.current) {
      const newWidth = e.clientX;
      if (newWidth >= 320 && newWidth <= 700) {
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
  }, [isResizing, sidebarWidth]);

  // Calculate list height for virtualization
  useEffect(() => {
    const calculateHeight = () => {
      if (sidebarRef.current) {
        const totalHeight = sidebarRef.current.clientHeight;
        const usedHeight = 280 + (searchQuery ? 80 : 60);
        setListHeight(Math.max(totalHeight - usedHeight, 400));
      }
    };

    calculateHeight();
    window.addEventListener('resize', calculateHeight);
    return () => window.removeEventListener('resize', calculateHeight);
  }, [searchQuery]);

  // Apply advanced filters and search
  const filteredConversations = conversations.filter(conv => {
    // Basic search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        conv.title?.toLowerCase().includes(query) ||
        conv.last_message_preview?.toLowerCase().includes(query) ||
        conv.created_by_name?.toLowerCase().includes(query)
      );
      if (!matchesSearch) return false;
    }

    // Advanced filters
    if (advancedFilters.dateRange) {
      const convDate = new Date(conv.created_at);
      if (convDate < advancedFilters.dateRange.start || convDate > advancedFilters.dateRange.end) {
        return false;
      }
    }

    if (advancedFilters.mode && conv.mode !== advancedFilters.mode) {
      return false;
    }

    if (advancedFilters.creator && conv.user_id !== advancedFilters.creator) {
      return false;
    }

    if (advancedFilters.messageCountMin !== undefined && conv.messageCount !== undefined) {
      if (conv.messageCount < advancedFilters.messageCountMin) return false;
    }

    if (advancedFilters.messageCountMax !== undefined && conv.messageCount !== undefined) {
      if (conv.messageCount > advancedFilters.messageCountMax) return false;
    }

    if (advancedFilters.tags && advancedFilters.tags.length > 0) {
      if (!conv.tags || !advancedFilters.tags.some(tag => conv.tags?.some(t => t.id === tag))) {
        return false;
      }
    }

    return true;
  });

  // Sort conversations
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    switch (sortBy) {
      case 'last_activity':
        return new Date(b.last_message_at || b.updated_at).getTime() - 
               new Date(a.last_message_at || a.updated_at).getTime();
      case 'created_date':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'title':
        return (a.title || '').localeCompare(b.title || '');
      case 'message_count':
        return (b.messageCount || 0) - (a.messageCount || 0);
      case 'creator':
        return (a.created_by_name || '').localeCompare(b.created_by_name || '');
      default:
        return 0;
    }
  });

  // Separate pinned conversations (STICKY FEATURE)
  const pinnedConversations = sortedConversations.filter(c => pinnedConversationIds.includes(c.id));
  const unpinnedConversations = sortedConversations.filter(c => !pinnedConversationIds.includes(c.id));
  const orderedConversations = [...pinnedConversations, ...unpinnedConversations];

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (advancedFilters.dateRange) count++;
    if (advancedFilters.mode) count++;
    if (advancedFilters.creator) count++;
    if (advancedFilters.messageCountMin !== undefined || advancedFilters.messageCountMax !== undefined) count++;
    if (advancedFilters.tags && advancedFilters.tags.length > 0) count++;
    return count;
  };

  return (
    <>
      <div 
        ref={sidebarRef}
        className="bg-[#f0f0f0] dark:bg-gray-900 text-black dark:text-white flex flex-col h-screen border-r border-[#d8d8d8] dark:border-gray-700 relative transition-all duration-200"
        style={{ width: `${sidebarWidth}px` }}
      >
        {/* Brand header with view controls */}
        <div className="px-4 py-4 border-b border-[#d8d8d8] dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold truncate">{brandName}</h2>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Email Copywriter</p>
            </div>

            {/* View mode toggle */}
            <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm">
              <button
                onClick={() => onViewModeChange('list')}
                className={`p-1.5 rounded transition-all ${
                  viewMode === 'list'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title="List View"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => onViewModeChange('grid')}
                className={`p-1.5 rounded transition-all ${
                  viewMode === 'grid'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title="Grid View"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1"></div>
              <button
                onClick={() => setIsExplorerOpen(true)}
                className="p-1.5 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all group"
                title="Expand View"
              >
                <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            </div>
          </div>
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

        {/* Toolbar: Filter, Sort, Bulk */}
        <div className="px-3 pb-2 space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <ConversationFilterDropdown
                currentFilter={currentFilter}
                selectedPersonId={selectedPersonId}
                teamMembers={teamMembers}
                onFilterChange={onFilterChange}
              />
            </div>
            
            {/* Sort dropdown */}
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as ConversationSortOption)}
              className="px-2 py-2 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              title="Sort by"
            >
              <option value="last_activity">Recent</option>
              <option value="created_date">Newest</option>
              <option value="title">A-Z</option>
              <option value="message_count">Messages</option>
              <option value="creator">Creator</option>
            </select>

            {/* Bulk select toggle */}
            {onBulkAction && (
              <button
                onClick={() => {
                  setBulkSelectMode(!bulkSelectMode);
                  setSelectedConversations(new Set());
                }}
                className={`p-2 rounded-lg transition-colors ${
                  bulkSelectMode
                    ? 'bg-blue-500 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title="Bulk select"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </button>
            )}
          </div>

          {/* Bulk action bar */}
          {bulkSelectMode && selectedConversations.size > 0 && (
            <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                {selectedConversations.size} selected
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleBulkAction('pin')}
                  className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded transition-colors"
                  title="Pin all"
                >
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleBulkAction('archive')}
                  className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded transition-colors"
                  title="Archive all"
                >
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </button>
                <button
                  onClick={() => handleBulkAction('export')}
                  className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded transition-colors"
                  title="Export all"
                >
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
                <div className="w-px h-4 bg-blue-300 dark:bg-blue-700 mx-1"></div>
                <button
                  onClick={selectAll}
                  className="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded transition-colors"
                >
                  All
                </button>
                <button
                  onClick={deselectAll}
                  className="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded transition-colors"
                >
                  None
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Search bar with advanced toggle */}
        <div className="px-3 pb-3 relative">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <ConversationSearch
                value={searchQuery}
                onChange={setSearchQuery}
                onClear={() => setSearchQuery('')}
              />
            </div>
            <button
              onClick={() => setIsAdvancedSearchOpen(!isAdvancedSearchOpen)}
              className={`p-2 rounded-lg transition-all ${
                isAdvancedSearchOpen || getActiveFilterCount() > 0
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Advanced search"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              {getActiveFilterCount() > 0 && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
          </div>

          {/* Advanced search panel */}
          <AdvancedSearchPanel
            filters={advancedFilters}
            onFiltersChange={(filters) => {
              setAdvancedFilters(filters);
              setSearchQuery(filters.query);
            }}
            teamMembers={teamMembers}
            isOpen={isAdvancedSearchOpen}
            onClose={() => setIsAdvancedSearchOpen(false)}
          />
        </div>

        {/* Conversations list with sticky pinned section */}
        <div className="flex-1 overflow-hidden">
          {viewMode === 'list' ? (
            <div className="h-full flex flex-col">
              {/* Sticky Pinned Section */}
              {pinnedConversations.length > 0 && (
                <div className="border-b-2 border-yellow-200 dark:border-yellow-900/50 bg-gradient-to-b from-yellow-50/50 to-transparent dark:from-yellow-900/10 dark:to-transparent">
                  <button
                    onClick={() => toggleSection('pinned')}
                    className="w-full px-4 py-2 flex items-center justify-between text-xs font-semibold text-yellow-700 dark:text-yellow-500 hover:bg-yellow-100/50 dark:hover:bg-yellow-900/20 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                      </svg>
                      Pinned ({pinnedConversations.length})
                    </span>
                    <svg
                      className={`w-4 h-4 transition-transform ${collapsedSections.has('pinned') ? '' : 'rotate-180'}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {!collapsedSections.has('pinned') && (
                    <div className="max-h-64 overflow-y-auto">
                      {pinnedConversations.map(conversation => (
                        <div 
                          key={conversation.id}
                          className="border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                        >
                          {/* Render conversation item */}
                          <ConversationListItem
                            conversation={conversation}
                            isActive={conversation.id === currentConversationId}
                            isPinned={true}
                            isSelected={bulkSelectMode && selectedConversations.has(conversation.id)}
                            bulkSelectMode={bulkSelectMode}
                            onSelect={onSelectConversation}
                            onToggleSelect={() => toggleBulkSelect(conversation.id)}
                            onPrefetch={onPrefetchConversation}
                            onAddTag={onAddTag}
                            onRemoveTag={onRemoveTag}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Regular conversations */}
              <div className="flex-1 overflow-hidden">
                <VirtualizedConversationList
                  conversations={unpinnedConversations}
                  currentConversationId={currentConversationId}
                  pinnedConversationIds={pinnedConversationIds}
                  editingId={editingId}
                  editingTitle={editingTitle}
                  onSelect={onSelectConversation}
                  onPrefetch={onPrefetchConversation}
                  onStartRename={handleStartRename}
                  onSaveRename={handleSaveRename}
                  onCancelRename={handleCancelRename}
                  onDelete={handleDelete}
                  setEditingTitle={setEditingTitle}
                  height={listHeight - (pinnedConversations.length > 0 ? 200 : 0)}
                />
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto px-2 py-2">
              {orderedConversations.length === 0 ? (
                <div className="px-3 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <p>No conversations yet</p>
                  <p className="text-xs mt-1">Start a new conversation to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {orderedConversations.map(conversation => (
                    <ConversationCard
                      key={conversation.id}
                      conversation={conversation}
                      isActive={conversation.id === currentConversationId}
                      isPinned={pinnedConversationIds.includes(conversation.id)}
                      onSelect={() => onSelectConversation(conversation.id)}
                      onAction={(action) => onQuickAction(conversation.id, action)}
                      onPrefetch={() => onPrefetchConversation?.(conversation.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Back to brands - Enhanced */}
        <div className="px-3 py-3 border-t border-[#d8d8d8] dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <a
            href="/"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 dark:from-blue-600 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 text-white rounded-lg text-sm font-semibold transition-all duration-150 cursor-pointer hover:scale-105 hover:shadow-lg active:scale-95 group"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>All Brands</span>
          </a>
          <div className="mt-2 text-center">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Press <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">ESC</kbd> to go back
            </span>
          </div>
        </div>

        {/* Resize handle */}
        <div
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 dark:hover:bg-blue-400 transition-colors z-10 group"
          onMouseDown={startResizing}
        >
          <div className="absolute top-1/2 right-0 transform -translate-y-1/2 w-1 h-12 bg-gray-300 dark:bg-gray-600 group-hover:bg-blue-500 dark:group-hover:bg-blue-400 transition-colors rounded-full"></div>
        </div>
      </div>

      {/* Full-screen explorer */}
      <ConversationExplorer
        isOpen={isExplorerOpen}
        onClose={() => setIsExplorerOpen(false)}
        conversations={conversations}
        currentConversationId={currentConversationId}
        pinnedConversationIds={pinnedConversationIds}
        onSelectConversation={onSelectConversation}
        onAction={onQuickAction}
        onPrefetch={onPrefetchConversation}
        teamMembers={teamMembers}
        currentFilter={currentFilter}
        selectedPersonId={selectedPersonId}
        onFilterChange={onFilterChange}
      />
    </>
  );
}

// Helper component for conversation list items
interface ConversationListItemProps {
  conversation: ConversationWithMetadata;
  isActive: boolean;
  isPinned: boolean;
  isSelected: boolean;
  bulkSelectMode: boolean;
  onSelect: (id: string) => void;
  onToggleSelect: () => void;
  onPrefetch?: (id: string) => void;
  onAddTag?: (conversationId: string, tag: ConversationTag) => void;
  onRemoveTag?: (conversationId: string, tagId: string) => void;
}

function ConversationListItem({
  conversation,
  isActive,
  isPinned,
  isSelected,
  bulkSelectMode,
  onSelect,
  onToggleSelect,
  onPrefetch,
  onAddTag,
  onRemoveTag
}: ConversationListItemProps) {
  return (
    <div
      onClick={() => !bulkSelectMode && onSelect(conversation.id)}
      onMouseEnter={() => onPrefetch?.(conversation.id)}
      className={`px-4 py-3 cursor-pointer transition-colors ${
        isActive
          ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
      } ${isSelected ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}
    >
      <div className="flex items-start gap-3">
        {/* Bulk select checkbox */}
        {bulkSelectMode && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
            className="mt-1 w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
          />
        )}

        <div className="flex-1 min-w-0">
          {/* Title and pin */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate flex-1">
              {conversation.title || 'New Conversation'}
            </h3>
            {isPinned && (
              <svg className="w-4 h-4 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
            )}
          </div>

          {/* Preview */}
          {conversation.last_message_preview && (
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
              {conversation.last_message_preview}
            </p>
          )}

          {/* Tags */}
          {conversation.tags && conversation.tags.length > 0 && (
            <div className="mb-2">
              <ConversationTags
                tags={conversation.tags}
                onAddTag={onAddTag ? (tag) => onAddTag(conversation.id, tag) : undefined}
                onRemoveTag={onRemoveTag ? (tagId) => onRemoveTag(conversation.id, tagId) : undefined}
                editable={!bulkSelectMode}
                compact
                maxVisible={2}
              />
            </div>
          )}

          {/* Analytics */}
          {(conversation.messageCount || conversation.wordCount || conversation.tokensUsed) && (
            <ConversationAnalyticsBadge
              analytics={{
                messageCount: conversation.messageCount || 0,
                wordCount: conversation.wordCount,
                tokensUsed: conversation.tokensUsed,
                lastActivityMinutesAgo: conversation.lastActivityMinutesAgo
              }}
              compact
            />
          )}
        </div>
      </div>
    </div>
  );
}

