'use client';

import { ConversationWithStatus, OrganizationMember, SidebarViewMode, ConversationQuickAction, BulkActionType, Brand } from '@/types';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import ConversationFilterDropdown, { FilterType } from './ConversationFilterDropdown';
import ConversationSearch from './ConversationSearch';
import ConversationCard from './ConversationCard';
import VirtualizedConversationList from './VirtualizedConversationList';
import ConversationExplorer from './ConversationExplorer';
import BulkActionBar from './BulkActionBar';
import { SidebarLoadingSkeleton } from './SkeletonLoader';
import { useSidebarPanel } from '@/contexts/SidebarPanelContext';
import LoadingDots from './LoadingDots';
import SidebarHeader from './SidebarHeader';
import { SectionErrorBoundary } from './ErrorBoundary';

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
  onBulkAction?: (action: BulkActionType, conversationIds: string[]) => void;
  initialWidth?: number;
  // Brand switcher props
  allBrands?: Brand[];
  onBrandSwitch?: (brandId: string) => void;
  onNavigateHome?: () => void;
  onNewFlow?: () => void;
  isLoading?: boolean; // Show loading skeleton when true
  isCreatingEmail?: boolean;
  isCreatingFlow?: boolean;
}

interface TooltipState {
  conversationId: string;
  x: number;
  y: number;
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
  onBulkAction,
  initialWidth = 398,
  allBrands = [],
  onBrandSwitch,
  onNavigateHome,
  onNewFlow,
  isLoading = false,
  isCreatingEmail = false,
  isCreatingFlow = false
}: ChatSidebarEnhancedProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(600);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedConversationIds, setSelectedConversationIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [hoveredTooltip, setHoveredTooltip] = useState<TooltipState | null>(null);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const router = useRouter();
  
  // Get collapse state from context (provided by panel wrapper on desktop)
  const panelContext = useSidebarPanel();
  const isCollapsed = panelContext?.isCollapsed ?? false;
  const toggleCollapse = panelContext?.toggleCollapse;

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

  // Bulk selection handlers
  const handleToggleBulkSelect = useCallback(() => {
    setBulkSelectMode(!bulkSelectMode);
    if (bulkSelectMode) {
      setSelectedConversationIds(new Set());
      setLastSelectedIndex(null);
    }
  }, [bulkSelectMode]);

  const handleToggleConversationSelect = useCallback((conversationId: string, event?: React.MouseEvent) => {
    const currentIndex = orderedConversations.findIndex(c => c.id === conversationId);
    
    // Shift+Click: Range selection
    if (event?.shiftKey && lastSelectedIndex !== null && currentIndex !== -1) {
      const start = Math.min(lastSelectedIndex, currentIndex);
      const end = Math.max(lastSelectedIndex, currentIndex);
      const rangeIds = orderedConversations.slice(start, end + 1).map(c => c.id);
      
      setSelectedConversationIds(prev => {
        const newSet = new Set(prev);
        rangeIds.forEach(id => newSet.add(id));
        return newSet;
      });
    }
    // Cmd/Ctrl+Click: Multi-select (toggle individual)
    else if (event?.metaKey || event?.ctrlKey) {
      setSelectedConversationIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(conversationId)) {
          newSet.delete(conversationId);
        } else {
          newSet.add(conversationId);
        }
        return newSet;
      });
      setLastSelectedIndex(currentIndex);
    }
    // Regular click in bulk mode: Toggle single
    else {
      setSelectedConversationIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(conversationId)) {
          newSet.delete(conversationId);
        } else {
          newSet.add(conversationId);
        }
        return newSet;
      });
      setLastSelectedIndex(currentIndex);
    }
  }, [orderedConversations, lastSelectedIndex]);

  const handleCancelBulkSelect = useCallback(() => {
    setBulkSelectMode(false);
    setSelectedConversationIds(new Set());
    setLastSelectedIndex(null);
  }, []);

  // Note: toggleCollapse is now provided by context from the panel wrapper

  // Calculate list height for virtualization
  useEffect(() => {
    const calculateHeight = () => {
      if (sidebarRef.current) {
        // Total height minus header, button, filter, search
        // We don't subtract footer as it doesn't exist
        const totalHeight = sidebarRef.current.clientHeight;
        
        // Measure exact used height if possible, or use a safer approximation
        // Header (~60px) + Buttons (~50px) + Filter/Search (~50px) + Padding (~20px)
        const usedHeight = 180; 
        
        setListHeight(Math.max(totalHeight - usedHeight, 200));
      }
    };

    calculateHeight();
    // Use a ResizeObserver for more robust sizing
    const resizeObserver = new ResizeObserver(calculateHeight);
    if (sidebarRef.current) {
      resizeObserver.observe(sidebarRef.current);
    }
    
    window.addEventListener('resize', calculateHeight);
    return () => {
      window.removeEventListener('resize', calculateHeight);
      resizeObserver.disconnect();
    };
  }, []);

  // Bulk action handlers that depend on orderedConversations
  const handleSelectAll = useCallback(() => {
    setSelectedConversationIds(new Set(orderedConversations.map(c => c.id)));
  }, [orderedConversations]);

  const handleBulkAction = useCallback((action: BulkActionType) => {
    if (onBulkAction && selectedConversationIds.size > 0) {
      onBulkAction(action, Array.from(selectedConversationIds));
      // Reset selection after action
      setSelectedConversationIds(new Set());
      setBulkSelectMode(false);
    }
  }, [onBulkAction, selectedConversationIds]);

  // Close mobile sidebar when conversation is selected on mobile
  const handleMobileSelectConversation = useCallback((conversationId: string) => {
    onSelectConversation(conversationId);
    if (onMobileToggle && window.innerWidth < 1024) {
      onMobileToggle(false);
    }
  }, [onSelectConversation, onMobileToggle]);

  // Close mobile sidebar when creating new conversation on mobile
  const handleMobileNewConversation = useCallback(() => {
    onNewConversation();
    if (onMobileToggle && window.innerWidth < 1024) {
      onMobileToggle(false);
    }
  }, [onNewConversation, onMobileToggle]);

  // Close mobile sidebar when creating new flow on mobile
  const handleMobileNewFlow = useCallback(() => {
    if (onNewFlow) {
      onNewFlow();
    } else {
      onNewConversation();
    }
    if (onMobileToggle && window.innerWidth < 1024) {
      onMobileToggle(false);
    }
  }, [onNewFlow, onNewConversation, onMobileToggle]);

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl + B: Toggle collapse
      if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
        event.preventDefault();
        toggleCollapse?.();
      }
      
      // Cmd/Ctrl + A: Select all (when in bulk select mode)
      if ((event.metaKey || event.ctrlKey) && event.key === 'a' && bulkSelectMode) {
        event.preventDefault();
        handleSelectAll();
      }
      
      // Escape: Cancel bulk select mode
      if (event.key === 'Escape' && bulkSelectMode) {
        event.preventDefault();
        handleCancelBulkSelect();
      }
      
      // Delete/Backspace: Delete selected conversations (with confirmation)
      if ((event.key === 'Delete' || event.key === 'Backspace') && bulkSelectMode && selectedConversationIds.size > 0) {
        // Only trigger if not focused on an input
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          event.preventDefault();
          if (confirm(`Are you sure you want to delete ${selectedConversationIds.size} conversation${selectedConversationIds.size > 1 ? 's' : ''}?`)) {
            handleBulkAction('delete');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleCollapse, bulkSelectMode, selectedConversationIds, handleSelectAll, handleCancelBulkSelect, handleBulkAction]);

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
          bg-white dark:bg-gray-900 text-black dark:text-white 
          flex flex-col border-r border-gray-200 dark:border-gray-700 
          transition-transform duration-300 ease-in-out
          
          /* Mobile: Fixed overlay sidebar */
          fixed lg:relative
          inset-y-0 left-0
          z-50 lg:z-auto
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          
          /* Responsive width - mobile to desktop */
          w-[280px] xs:w-[320px] sm:w-[360px] md:w-[380px] lg:w-full
        `}
        style={{ height: '100dvh' }}
      >
        <SidebarHeader
          brandName={brandName}
          brandId={brandId}
          allBrands={allBrands}
          isCollapsed={isCollapsed}
          toggleCollapse={toggleCollapse}
          onBrandSwitch={onBrandSwitch}
          onNavigateHome={onNavigateHome}
          onMobileToggle={onMobileToggle}
          onOpenExplorer={() => setIsExplorerOpen(true)}
        />

        {/* Bulk action bar */}
        {bulkSelectMode && selectedConversationIds.size > 0 && (
          <BulkActionBar
            selectedCount={selectedConversationIds.size}
            totalCount={orderedConversations.length}
            onAction={handleBulkAction}
            onCancel={handleCancelBulkSelect}
            onSelectAll={handleSelectAll}
          />
        )}

        {!isCollapsed ? (
          <>
            <div className="px-3 pb-3 border-b border-gray-100 dark:border-gray-800/50 space-y-3">
              {/* Prominent New Chat Button */}
              <button
                onClick={handleMobileNewConversation}
                disabled={isCreatingEmail || isCreatingFlow}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl font-semibold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none"
              >
                {isCreatingEmail || isCreatingFlow ? (
                  <div className="flex items-center gap-2">
                    <LoadingDots size="sm" color="white" />
                    <span>Creating...</span>
                  </div>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>New Chat</span>
                  </>
                )}
              </button>

              {/* Search and Filter Row */}
              <div className="flex items-stretch gap-2">
                <div className="flex-1 min-w-0">
                  <ConversationSearch
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onClear={() => setSearchQuery('')}
                  />
                </div>
                
                <div className="flex-shrink-0">
                  <ConversationFilterDropdown
                     currentFilter={currentFilter}
                     selectedPersonId={selectedPersonId}
                     teamMembers={teamMembers}
                     onFilterChange={onFilterChange}
                     compact={true} 
                  />
                </div>

                <button
                  onClick={handleToggleBulkSelect}
                  className={`p-2 rounded-lg transition-colors cursor-pointer flex-shrink-0 border ${
                    bulkSelectMode
                      ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  title={bulkSelectMode ? 'Exit selection mode' : 'Select multiple'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    {bulkSelectMode ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                  </svg>
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Collapsed: Icon-only view */
          <div className="hidden lg:flex flex-col items-center py-3 px-2 gap-2">
            {/* New Email Icon */}
            <button
              type="button"
              onClick={handleMobileNewConversation}
              disabled={isCreatingEmail || isCreatingFlow}
              className="w-11 h-11 flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              title="New Email"
            >
              {isCreatingEmail || isCreatingFlow ? (
                <LoadingDots size="md" color="gray" />
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              )}
            </button>
            
            {/* Divider */}
            <div className="w-10 h-px bg-gray-200 dark:bg-gray-700 my-1" />
            
            {/* Search Icon - Expands on click */}
            {toggleCollapse && (
              <button
                onClick={toggleCollapse}
                className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors cursor-pointer"
                title="Expand to search"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            )}
            
            {/* Divider Line for collapsed state */}
            <div className="h-px bg-gray-200 dark:bg-gray-700" />
          </div>
        )}

        {/* Conversations list/grid */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {isLoading ? (
            <SidebarLoadingSkeleton />
          ) : !isCollapsed ? (
            <SectionErrorBoundary sectionName="conversation list">
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
                bulkSelectMode={bulkSelectMode}
                selectedConversationIds={selectedConversationIds}
                onToggleSelect={handleToggleConversationSelect}
              />
            ) : (
              <div className="h-full overflow-y-auto px-2 py-2">
                {orderedConversations.length === 0 ? (
                  <div className="px-3 py-12 text-center">
                    <div className="mb-4">
                      <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      No conversations yet
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                      Start creating email copy for {brandName}
                    </p>
                    <button
                      onClick={handleMobileNewConversation}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
                    >
                      New Email
                    </button>
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
                        bulkSelectMode={bulkSelectMode}
                        isSelected={selectedConversationIds.has(conversation.id)}
                        onToggleSelect={(event) => handleToggleConversationSelect(conversation.id, event)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            </SectionErrorBoundary>
          ) : (
            /* Collapsed: Compact conversation dots with tooltips */
            <div className="hidden lg:flex flex-col items-center py-2 px-2 gap-1 overflow-y-auto overflow-x-visible relative">
              {orderedConversations.slice(0, 12).map((conversation, index) => {
                const isActive = conversation.id === currentConversationId;
                const isPinned = pinnedConversationIds.includes(conversation.id);
                const isFlow = conversation.is_flow;
                
                return (
                  <button
                    key={conversation.id}
                    onClick={() => handleMobileSelectConversation(conversation.id)}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredTooltip({
                        conversationId: conversation.id,
                        x: rect.right + 8,
                        y: rect.top + rect.height / 2
                      });
                    }}
                    onMouseLeave={() => setHoveredTooltip(null)}
                    className={`
                      relative w-8 h-8 flex items-center justify-center rounded-md transition-all flex-shrink-0
                      ${isActive
                        ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400 ring-offset-1 ring-offset-white dark:ring-offset-gray-900'
                        : isPinned
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300'
                      }
                    `}
                  >
                    {/* Show first letter of title or flow icon */}
                    {isFlow ? (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    ) : (
                      <span className="text-xs font-semibold">
                        {(conversation.title || 'C').charAt(0).toUpperCase()}
                      </span>
                    )}
                    
                    {/* Pin indicator */}
                    {isPinned && !isActive && (
                      <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-blue-500 rounded-full border border-white dark:border-gray-900" />
                    )}
                  </button>
                );
              })}
              
              {/* Overflow indicator */}
              {orderedConversations.length > 12 && (
                <div 
                  className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 rounded-md text-xs font-medium"
                  title={`${orderedConversations.length - 12} more conversations`}
                >
                  +{orderedConversations.length - 12}
                </div>
              )}
            </div>
          )}
          
          {/* Tooltip portal - rendered at body level to escape z-index stacking */}
          {hoveredTooltip && typeof document !== 'undefined' && createPortal(
            <div 
              className="fixed pointer-events-none"
              style={{
                left: `${hoveredTooltip.x}px`,
                top: `${hoveredTooltip.y}px`,
                transform: 'translateY(-50%)',
                zIndex: 99999
              }}
            >
              <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1.5 rounded shadow-lg whitespace-nowrap">
                {orderedConversations.find(c => c.id === hoveredTooltip.conversationId)?.title || 'Untitled Conversation'}
                {pinnedConversationIds.includes(hoveredTooltip.conversationId) && (
                  <span className="ml-1.5">📌</span>
                )}
              </div>
              {/* Arrow */}
              <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-4 border-transparent border-r-gray-900 dark:border-r-gray-700" />
            </div>,
            document.body
          )}
        </div>

        {/* Floating Action Button - Only show when not collapsed */}
        {/* Removed FAB in favor of prominent top button */}
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
