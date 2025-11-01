'use client';

import { ConversationWithStatus, OrganizationMember, SidebarViewMode, ConversationQuickAction } from '@/types';
import { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import ConversationFilterDropdown, { FilterType } from './ConversationFilterDropdown';
import ConversationSearch from './ConversationSearch';
import ConversationCard from './ConversationCard';
import VirtualizedConversationList from './VirtualizedConversationList';
import ConversationExplorer from './ConversationExplorer';

interface ChatSidebarEnhancedProps {
  brandName: string;
  brandId?: string;
  conversations: ConversationWithStatus[];
  currentConversationId: string | null;
  teamMembers: OrganizationMember[];
  currentFilter: FilterType;
  selectedPersonId: string | null;
  pinnedConversationIds: string[];
  viewMode: SidebarViewMode;
  isMobileOpen?: boolean;
  onMobileToggle?: (isOpen: boolean) => void;
  onFilterChange: (filter: FilterType, personId?: string) => void;
  onNewConversation: () => void;
  onSelectConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
  onRenameConversation: (conversationId: string, newTitle: string) => void;
  onPrefetchConversation?: (conversationId: string) => void;
  onQuickAction: (conversationId: string, action: ConversationQuickAction) => void;
  onViewModeChange: (mode: SidebarViewMode) => void;
  onSidebarWidthChange: (width: number) => void;
  initialWidth?: number;
}

export default function ChatSidebarEnhanced({
  brandName,
  brandId,
  conversations,
  currentConversationId,
  teamMembers,
  currentFilter,
  selectedPersonId,
  pinnedConversationIds,
  viewMode,
  isMobileOpen = false,
  onMobileToggle,
  onFilterChange,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
  onPrefetchConversation,
  onQuickAction,
  onViewModeChange,
  onSidebarWidthChange,
  initialWidth = 398
}: ChatSidebarEnhancedProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [sidebarWidth, setSidebarWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(600);

  const handleDelete = useCallback((e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this conversation?')) {
      onDeleteConversation(conversationId);
    }
  }, [onDeleteConversation]);

  const handleStartRename = useCallback((e: React.MouseEvent, conversation: ConversationWithStatus) => {
    e.stopPropagation();
    setEditingId(conversation.id);
    setEditingTitle(conversation.title || 'New Conversation');
  }, []);

  const handleSaveRename = useCallback((e: React.FormEvent, conversationId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const trimmedTitle = editingTitle.trim();
    if (trimmedTitle && trimmedTitle !== '') {
      onRenameConversation(conversationId, trimmedTitle);
    }
    setEditingId(null);
    setEditingTitle('');
  }, [editingTitle, onRenameConversation]);

  const handleCancelRename = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setEditingTitle('');
  }, []);

  // Resize handlers
  const startResizing = () => {
    setIsResizing(true);
  };

  const stopResizing = () => {
    setIsResizing(false);
    // Notify parent of width change
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
        // Total height minus header, button, filter, search, and footer
        const totalHeight = sidebarRef.current.clientHeight;
        const usedHeight = 220 + (searchQuery ? 80 : 60); // Approximate header + controls
        setListHeight(Math.max(totalHeight - usedHeight, 400));
      }
    };

    calculateHeight();
    window.addEventListener('resize', calculateHeight);
    return () => window.removeEventListener('resize', calculateHeight);
  }, [searchQuery]);

  // Memoize filtered conversations to avoid unnecessary re-filters
  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        conv.title?.toLowerCase().includes(query) ||
        conv.last_message_preview?.toLowerCase().includes(query) ||
        conv.created_by_name?.toLowerCase().includes(query)
      );
    });
  }, [conversations, searchQuery]);

  // Memoize ordered conversations
  const orderedConversations = useMemo(() => {
    const pinnedConversations = filteredConversations.filter(c => pinnedConversationIds.includes(c.id));
    const unpinnedConversations = filteredConversations.filter(c => !pinnedConversationIds.includes(c.id));
    return [...pinnedConversations, ...unpinnedConversations];
  }, [filteredConversations, pinnedConversationIds]);

  // Close mobile sidebar when conversation is selected on mobile
  const handleMobileSelectConversation = useCallback((conversationId: string) => {
    onSelectConversation(conversationId);
    if (onMobileToggle && window.innerWidth < 1024) {
      onMobileToggle(false);
    }
  }, [onSelectConversation, onMobileToggle]);

  // Close mobile sidebar on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMobileOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        window.innerWidth < 1024
      ) {
        onMobileToggle?.(false);
      }
    };

    if (isMobileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMobileOpen, onMobileToggle]);

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-200"
          onClick={() => onMobileToggle?.(false)}
        />
      )}

      <aside 
        ref={sidebarRef}
        className={`
          bg-[#f0f0f0] dark:bg-gray-900 text-black dark:text-white 
          flex flex-col h-screen border-r border-[#d8d8d8] dark:border-gray-700 
          transition-all duration-200
          
          /* Mobile: Fixed overlay sidebar (removed from flow) */
          fixed lg:relative
          top-0 left-0 bottom-0
          z-50 lg:z-auto
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          
          /* Responsive width */
          w-[85vw] sm:w-80 lg:w-auto
        `}
        style={{ 
          width: window.innerWidth >= 1024 ? `${sidebarWidth}px` : undefined 
        }}
      >
        {/* Brand header with view controls */}
        <div className="px-4 py-4 border-b border-[#d8d8d8] dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            {/* Mobile close button */}
            <button
              onClick={() => onMobileToggle?.(false)}
              className="lg:hidden mr-3 p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Close sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

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

        {/* Filter dropdown */}
        <div className="px-3 pb-3">
          <ConversationFilterDropdown
            currentFilter={currentFilter}
            selectedPersonId={selectedPersonId}
            teamMembers={teamMembers}
            onFilterChange={onFilterChange}
          />
        </div>

        {/* Search bar */}
        <div className="px-3 pb-3">
          <ConversationSearch
            value={searchQuery}
            onChange={setSearchQuery}
            onClear={() => setSearchQuery('')}
          />
        </div>

        {/* Conversations list/grid */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {viewMode === 'list' ? (
            <VirtualizedConversationList
              conversations={orderedConversations}
              currentConversationId={currentConversationId}
              pinnedConversationIds={pinnedConversationIds}
              editingId={editingId}
              editingTitle={editingTitle}
              onSelect={handleMobileSelectConversation}
              onSelectChild={onSelectConversation}
              onPrefetch={onPrefetchConversation}
              onStartRename={handleStartRename}
              onSaveRename={handleSaveRename}
              onCancelRename={handleCancelRename}
              onDelete={handleDelete}
              onQuickAction={onQuickAction}
              setEditingTitle={setEditingTitle}
              height={listHeight}
            />
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
                      currentConversationId={currentConversationId}
                      onSelect={() => handleMobileSelectConversation(conversation.id)}
                      onSelectChild={onSelectConversation}
                      onAction={(action) => onQuickAction(conversation.id, action)}
                      onPrefetch={() => onPrefetchConversation?.(conversation.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>


        {/* Resize handle - Desktop only */}
        <div
          className="hidden lg:block absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 dark:hover:bg-blue-400 transition-colors z-10 group"
          onMouseDown={startResizing}
        >
          <div className="absolute top-1/2 right-0 transform -translate-y-1/2 w-1 h-12 bg-gray-300 dark:bg-gray-600 group-hover:bg-blue-500 dark:group-hover:bg-blue-400 transition-colors rounded-full"></div>
        </div>
      </aside>

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


