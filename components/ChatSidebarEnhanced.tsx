'use client';

import { ConversationWithStatus, OrganizationMember, SidebarViewMode, ConversationQuickAction, BulkActionType, Brand } from '@/types';
import { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import ConversationFilterDropdown, { FilterType } from './ConversationFilterDropdown';
import ConversationSearch from './ConversationSearch';
import ConversationCard from './ConversationCard';
import VirtualizedConversationList from './VirtualizedConversationList';
import ConversationExplorer from './ConversationExplorer';
import BulkActionBar from './BulkActionBar';

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
  onNewFlow
}: ChatSidebarEnhancedProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [sidebarWidth, setSidebarWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const [showBrandSwitcher, setShowBrandSwitcher] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Load collapsed state from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed');
      return saved === 'true';
    }
    return false;
  });
  const sidebarRef = useRef<HTMLDivElement>(null);
  const brandSwitcherRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(600);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedConversationIds, setSelectedConversationIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

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

  // Toggle collapse/expand
  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => {
      const newState = !prev;
      // Save to localStorage
      localStorage.setItem('sidebarCollapsed', String(newState));
      return newState;
    });
  }, []);

  // Optimized resize handlers with throttling
  const animationFrameRef = useRef<number | null>(null);
  
  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
    // Cancel any pending animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    // Notify parent of final width (debounced)
    setTimeout(() => {
      onSidebarWidthChange(sidebarWidth);
    }, 100);
  }, [sidebarWidth, onSidebarWidthChange]);

  const resize = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    // Throttle with requestAnimationFrame for smooth 60fps
    if (animationFrameRef.current) {
      return; // Skip if frame already scheduled
    }
    
    animationFrameRef.current = requestAnimationFrame(() => {
      if (sidebarRef.current) {
        const newWidth = e.clientX;
        if (newWidth >= 320 && newWidth <= 700) {
          setSidebarWidth(newWidth);
        }
      }
      animationFrameRef.current = null;
    });
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', resize);
      document.addEventListener('mouseup', stopResizing);
      return () => {
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResizing);
        // Cleanup animation frame on unmount
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [isResizing, resize, stopResizing]);

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

  // Close brand switcher dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showBrandSwitcher &&
        brandSwitcherRef.current &&
        !brandSwitcherRef.current.contains(event.target as Node)
      ) {
        setShowBrandSwitcher(false);
      }
    };

    if (showBrandSwitcher) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showBrandSwitcher]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl + B: Toggle collapse
      if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
        event.preventDefault();
        toggleCollapse();
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
          bg-[#f8f8f8] dark:bg-gray-900 text-black dark:text-white 
          flex flex-col h-screen border-r border-gray-200 dark:border-gray-700 
          transition-all duration-300 ease-in-out
          
          /* Mobile: Fixed overlay sidebar (removed from flow) */
          fixed lg:relative
          top-0 left-0 bottom-0
          z-50 lg:z-auto
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          
          /* Responsive width */
          w-[85vw] sm:w-80 lg:w-auto
        `}
        style={{ 
          width: window.innerWidth >= 1024 
            ? (isCollapsed ? '60px' : `${sidebarWidth}px`) 
            : undefined 
        }}
      >
        {/* Brand header with breadcrumb navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          {!isCollapsed ? (
            <>
              {/* Breadcrumb Navigation - MOVED TO TOP */}
              <div className="px-4 pt-3 pb-2">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <button
                    onClick={onNavigateHome}
                    className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span>All Brands</span>
                  </button>
                  {allBrands.length > 0 && (
                    <>
                      <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <div className="relative flex-1 min-w-0" ref={brandSwitcherRef}>
                        <button
                          onClick={() => setShowBrandSwitcher(!showBrandSwitcher)}
                          className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                        >
                          <span className="truncate">{brandName}</span>
                          <svg 
                            className={`w-3 h-3 flex-shrink-0 transition-transform duration-200 ${showBrandSwitcher ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {/* Brand Switcher Dropdown */}
                        {showBrandSwitcher && (
                          <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden min-w-[200px] max-w-[280px] z-50">
                            <div className="max-h-[300px] overflow-y-auto">
                              {allBrands.map((b) => (
                                <button
                                  key={b.id}
                                  onClick={() => {
                                    onBrandSwitch?.(b.id);
                                    setShowBrandSwitcher(false);
                                  }}
                                  className={`
                                    w-full px-3 py-2 text-sm text-left transition-colors cursor-pointer flex items-center justify-between
                                    ${b.id === brandId
                                      ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300'
                                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }
                                  `}
                                >
                                  <span className="truncate">{b.name}</span>
                                  {b.id === brandId && (
                                    <svg className="w-4 h-4 flex-shrink-0 ml-2" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Brand Title and Controls */}
              <div className="px-4 pb-3 flex items-center justify-between">
                {/* Mobile close button */}
                <button
                  onClick={() => onMobileToggle?.(false)}
                  className="lg:hidden mr-2 p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors cursor-pointer"
                  aria-label="Close sidebar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold truncate text-gray-900 dark:text-white">{brandName}</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Email Copywriter</p>
                </div>

                {/* Collapse and Explorer buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={toggleCollapse}
                    className="hidden lg:block p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors cursor-pointer"
                    title="Collapse sidebar (Cmd/Ctrl+B)"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setIsExplorerOpen(true)}
                    className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors cursor-pointer"
                    title="Expand View"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Collapsed header - just expand button */
            <div className="hidden lg:flex flex-col items-center py-3 gap-3">
              <button
                onClick={toggleCollapse}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 transition-all cursor-pointer"
                title="Expand sidebar (Cmd/Ctrl+B)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
              {/* Back home button (icon only) */}
              <button
                onClick={onNavigateHome}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-500 transition-all cursor-pointer"
                title="All Brands"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
            </div>
          )}
        </div>

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
            {/* New conversation buttons - split into Email and Flow */}
            <div className="p-3 flex gap-2">
              <button
                onClick={onNewConversation}
                className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 text-white cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>New Email</span>
              </button>
              <button
                onClick={onNewFlow || onNewConversation}
                className="flex-1 py-2.5 px-3 bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 text-white cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>New Flow</span>
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

            {/* Search bar and bulk select button */}
            <div className="px-3 pb-3 flex gap-2">
              <div className="flex-1">
                <ConversationSearch
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onClear={() => setSearchQuery('')}
                />
              </div>
              {!bulkSelectMode && (
                <button
                  onClick={handleToggleBulkSelect}
                  className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors cursor-pointer"
                  title="Bulk select mode (Shift+Click for range, Cmd/Ctrl+Click for multi-select)"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </button>
              )}
            </div>
          </>
        ) : (
          /* Collapsed: Icon-only buttons */
          <div className="hidden lg:flex flex-col items-center py-3 gap-3">
            {/* New conversation icon */}
            <button
              onClick={onNewConversation}
              className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md hover:shadow-lg cursor-pointer"
              title="New Conversation"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
            
            {/* Search icon */}
            <button
              onClick={toggleCollapse}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 transition-all cursor-pointer"
              title="Expand to search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        )}

        {/* Conversations list/grid */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {!isCollapsed ? (
            viewMode === 'list' ? (
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
                        bulkSelectMode={bulkSelectMode}
                        isSelected={selectedConversationIds.has(conversation.id)}
                        onToggleSelect={(event) => handleToggleConversationSelect(conversation.id, event)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          ) : (
            /* Collapsed: Icon-only conversation indicators */
            <div className="hidden lg:flex flex-col items-center py-2 gap-2 overflow-y-auto">
              {orderedConversations.slice(0, 10).map(conversation => (
                <button
                  key={conversation.id}
                  onClick={() => handleMobileSelectConversation(conversation.id)}
                  className={`
                    p-2 rounded-lg transition-all
                    ${conversation.id === currentConversationId
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
                    }
                  `}
                  title={conversation.title || 'Conversation'}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  {pinnedConversationIds.includes(conversation.id) && (
                    <svg className="w-3 h-3 absolute top-0 right-0" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L11 4.323V3a1 1 0 011-1z" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>


        {/* Smooth, thin resize handle - Desktop only, hidden when collapsed */}
        {!isCollapsed && (
          <div
            className={`
              hidden lg:block absolute top-0 right-0 h-full cursor-col-resize z-10 group
              transition-all duration-200 ease-out
              ${isResizing ? 'w-1 bg-blue-400 dark:bg-blue-500' : 'w-0.5 bg-gray-200 dark:bg-gray-700 hover:bg-blue-400 hover:dark:bg-blue-500 hover:w-1'}
            `}
            onMouseDown={startResizing}
            onDoubleClick={() => {
              setSidebarWidth(398);
              onSidebarWidthChange(398);
            }}
            title="Drag to resize, double-click to reset"
          >
            {/* Subtle grip indicator on hover */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-60 transition-opacity duration-200">
              <div className="flex flex-col gap-0.5">
                <div className="w-0.5 h-0.5 bg-white rounded-full"></div>
                <div className="w-0.5 h-0.5 bg-white rounded-full"></div>
                <div className="w-0.5 h-0.5 bg-white rounded-full"></div>
              </div>
            </div>
          </div>
        )}
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


