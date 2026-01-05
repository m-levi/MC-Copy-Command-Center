'use client';

import { ConversationWithStatus, ConversationQuickAction } from '@/types';
import { useState, useCallback, memo } from 'react';
import ConversationContextMenu from './ConversationContextMenu';
import { GeneratingDot } from './GeneratingBadge';
import { useFlowChildren } from '@/hooks/useFlowChildren';

interface ConversationListItemProps {
  conversation: ConversationWithStatus;
  isActive: boolean;
  isPinned: boolean;
  currentConversationId?: string | null;
  currentUserId?: string;
  onSelect: () => void;
  onSelectChild?: (childId: string) => void;
  onAction?: (action: ConversationQuickAction) => void;
  bulkSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (event?: React.MouseEvent) => void;
}

function ConversationListItem({
  conversation,
  isActive,
  isPinned,
  currentConversationId = null,
  currentUserId,
  onSelect,
  onSelectChild,
  onAction,
  bulkSelectMode = false,
  isSelected = false,
  onToggleSelect
}: ConversationListItemProps) {
  const isOwner = conversation.user_id === currentUserId;
  const isTeamVisible = conversation.visibility === 'team';
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [showThreeDotMenu, setShowThreeDotMenu] = useState(false);

  // Use shared hook for flow children management
  const {
    flowChildren,
    flowChildrenCount,
    isExpanded,
    loadingChildren,
    toggleExpand: handleToggleExpand,
  } = useFlowChildren({
    conversationId: conversation.id,
    isFlow: conversation.is_flow || false,
    isActive,
    currentConversationId,
  });

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowThreeDotMenu(false);
  }, []);

  const handleThreeDotClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setContextMenuPosition({ x: rect.left, y: rect.bottom + 4 });
    setShowThreeDotMenu(true);
  }, []);

  const handleAction = useCallback((action: ConversationQuickAction) => {
    if (onAction) {
      onAction(action);
    }
  }, [onAction]);

  const handleClick = useCallback((event: React.MouseEvent) => {
    if (bulkSelectMode && onToggleSelect) {
      onToggleSelect(event);
    } else {
      onSelect();
    }
  }, [bulkSelectMode, onToggleSelect, onSelect]);

  // Close context menu when clicking outside is handled by the menu itself,
  // but we need to sync the state here
  const handleCloseContextMenu = useCallback(() => {
    setContextMenuPosition(null);
    setShowThreeDotMenu(false);
  }, []);

  return (
    <div className="relative">
      {/* Main conversation item */}
      <div
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        className={`
          group relative flex items-center gap-2 px-2.5 py-2 sm:py-1 rounded-md cursor-pointer border
          touch-feedback-subtle touch-action-manipulation
          ${isSelected
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
            : isActive
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
              : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-900 dark:text-gray-100 border-transparent'
          }
        `}
      >
        {/* Bulk selection checkbox */}
        {bulkSelectMode && (
          <div 
            className="flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.(e);
            }}
          >
            <div className={`
              w-3.5 h-3.5 rounded flex items-center justify-center transition-all cursor-pointer
              ${isSelected 
                ? 'bg-blue-600 dark:bg-blue-500 scale-100' 
                : 'border-[1.5px] border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 scale-95'
              }
            `}>
              {isSelected && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {/* Tiny type icon for non-active items */}
            {!isActive && !isSelected && (
              <span className={`flex-shrink-0 ${
                conversation.is_flow 
                  ? 'text-purple-400 dark:text-purple-500' 
                  : 'text-gray-400 dark:text-gray-500'
              }`}>
                {conversation.is_flow ? (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                )}
              </span>
            )}
            <h3 className={`text-sm font-medium truncate flex items-center ${
              isActive || isSelected
                ? 'text-gray-900 dark:text-gray-50' 
                : 'text-gray-700 dark:text-gray-200'
            }`}>
              <span className="truncate">{conversation.title || 'New Conversation'}</span>
              <GeneratingDot conversationId={conversation.id} currentConversationId={currentConversationId || undefined} />
            </h3>
            {isPinned && (
              <svg className="w-2.5 h-2.5 text-yellow-500 dark:text-yellow-400 transform rotate-45 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" />
              </svg>
            )}
            {/* Visibility indicator */}
            {isTeamVisible ? (
              <span title="Shared with team">
                <svg className="w-2.5 h-2.5 text-blue-500 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </span>
            ) : !isOwner ? (
              // Show "shared with me" indicator for conversations user doesn't own
              <span title="Shared with me">
                <svg className="w-2.5 h-2.5 text-green-500 dark:text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </span>
            ) : null}
          </div>
          
          {/* Meta info - only shown for active/selected items */}
          {(isActive || isSelected) && (
            <div className="flex items-center gap-1 text-[10px] text-blue-700/70 dark:text-blue-300/60 mt-0.5">
              {/* Type tag */}
              <span className={`px-1 py-px rounded text-[9px] font-semibold uppercase tracking-wider ${
                conversation.is_flow
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              }`}>
                {conversation.is_flow ? 'Flow' : 'Email'}
              </span>
              {conversation.created_by_name && (
                <>
                  <span className="opacity-40">•</span>
                  <span className="truncate max-w-[70px]">{conversation.created_by_name}</span>
                </>
              )}
              <span className="opacity-40">•</span>
              <span>{formatDate(conversation.last_message_at || conversation.created_at)}</span>
            </div>
          )}
        </div>

        {/* Flow expand button */}
        {conversation.is_flow && (
          <button
            onClick={handleToggleExpand}
            className={`flex-shrink-0 flex items-center gap-0.5 px-1 py-0.5 rounded transition-all ${
              isActive 
                ? 'text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40' 
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <span className="text-[9px] font-medium">{flowChildren.length || flowChildrenCount}</span>
            <svg 
              className={`w-2.5 h-2.5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Three-dot menu button - visible on hover or touch, or when menu is open */}
        {!bulkSelectMode && (
          <button
            onClick={handleThreeDotClick}
            className={`
              flex-shrink-0 p-2 sm:p-1 rounded transition-all duration-150 cursor-pointer
              touch-target touch-action-manipulation
              ${showThreeDotMenu || contextMenuPosition
                ? 'opacity-100 bg-gray-100 dark:bg-gray-800'
                : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100'
              }
              ${isActive
                ? 'text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }
            `}
            aria-label="More options"
          >
            <svg className="w-5 h-5 sm:w-3.5 sm:h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </button>
        )}
      </div>

      {/* Context Menu */}
      <ConversationContextMenu
        conversationId={conversation.id}
        isPinned={isPinned}
        isArchived={conversation.is_archived}
        visibility={conversation.visibility}
        isOwner={isOwner}
        position={contextMenuPosition}
        onAction={handleAction}
        onClose={handleCloseContextMenu}
        bulkSelectMode={bulkSelectMode}
      />

      {/* Child emails */}
      {isExpanded && conversation.is_flow && (
        <div className="ml-6 mt-0.5">
          {loadingChildren ? (
            <div className="px-2 py-1 text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <svg className="animate-spin h-2.5 w-2.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading...
            </div>
          ) : flowChildren.length === 0 ? (
            <div className="px-2 py-1 text-[10px] text-gray-500 dark:text-gray-400 italic">
              No emails yet
            </div>
          ) : (
            flowChildren.map((child) => (
              <button
                key={child.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectChild?.(child.id);
                }}
                className={`
                  w-full text-left flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] transition-all
                  ${child.id === currentConversationId
                    ? 'bg-blue-600 dark:bg-blue-700 text-white'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }
                `}
              >
                <div className={`flex-shrink-0 w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold ${
                  child.id === currentConversationId 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                }`}>
                  {child.flow_sequence_order}
                </div>
                <span className="flex-1 truncate">
                  {child.flow_email_title || `Email ${child.flow_sequence_order}`}
                </span>
                <svg className="w-2.5 h-2.5 flex-shrink-0 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Memoize component to prevent unnecessary re-renders
// Only re-render if conversation data, active state, or selection changes
export default memo(ConversationListItem, (prevProps, nextProps) => {
  return (
    prevProps.conversation.id === nextProps.conversation.id &&
    prevProps.conversation.title === nextProps.conversation.title &&
    prevProps.conversation.last_message_at === nextProps.conversation.last_message_at &&
    prevProps.conversation.last_message_preview === nextProps.conversation.last_message_preview &&
    prevProps.conversation.is_flow === nextProps.conversation.is_flow &&
    prevProps.conversation.visibility === nextProps.conversation.visibility &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.isPinned === nextProps.isPinned &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.bulkSelectMode === nextProps.bulkSelectMode &&
    prevProps.currentConversationId === nextProps.currentConversationId &&
    prevProps.currentUserId === nextProps.currentUserId
  );
});
