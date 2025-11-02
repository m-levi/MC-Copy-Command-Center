'use client';

import { ConversationWithStatus, Conversation, ConversationQuickAction } from '@/types';
import { useState, useEffect, useCallback, memo } from 'react';
import { createClient } from '@/lib/supabase/client';
import ConversationContextMenu from './ConversationContextMenu';

interface ConversationListItemProps {
  conversation: ConversationWithStatus;
  isActive: boolean;
  isPinned: boolean;
  currentConversationId?: string | null;
  onSelect: () => void;
  onSelectChild?: (childId: string) => void;
  onAction?: (action: ConversationQuickAction) => void;
  bulkSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

function ConversationListItem({
  conversation,
  isActive,
  isPinned,
  currentConversationId = null,
  onSelect,
  onSelectChild,
  onAction,
  bulkSelectMode = false,
  isSelected = false,
  onToggleSelect
}: ConversationListItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [flowChildren, setFlowChildren] = useState<Conversation[]>([]);
  const [flowChildrenCount, setFlowChildrenCount] = useState<number>(0);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [showThreeDotMenu, setShowThreeDotMenu] = useState(false);
  const supabase = createClient();

  // Load flow children count on mount for flows
  useEffect(() => {
    if (conversation.is_flow && flowChildrenCount === 0) {
      loadFlowChildrenCount();
    }
  }, [conversation.is_flow]);

  const loadFlowChildrenCount = async () => {
    if (!conversation.is_flow) return;
    
    try {
      const { count } = await supabase
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .eq('parent_conversation_id', conversation.id);

      if (count !== null) {
        setFlowChildrenCount(count);
      }
    } catch (error) {
      console.error('Error loading flow children count:', error);
    }
  };

  // Auto-expand if active flow or if a child is active
  useEffect(() => {
    const isChildActive = flowChildren.some(c => c.id === currentConversationId);
    if ((isActive || isChildActive) && conversation.is_flow) {
      setIsExpanded(true);
    }
  }, [isActive, conversation.is_flow, currentConversationId, flowChildren]);

  // Load children when expanded
  useEffect(() => {
    if (isExpanded && conversation.is_flow && flowChildren.length === 0 && !loadingChildren) {
      loadFlowChildren();
    }
  }, [isExpanded, conversation.is_flow]);

  const loadFlowChildren = async () => {
    if (!conversation.is_flow) return;
    
    setLoadingChildren(true);
    try {
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .eq('parent_conversation_id', conversation.id)
        .order('flow_sequence_order', { ascending: true });

      if (data) {
        setFlowChildren(data);
      }
    } catch (error) {
      console.error('Error loading flow children:', error);
    } finally {
      setLoadingChildren(false);
    }
  };

  const handleToggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (conversation.is_flow) {
      setIsExpanded(prev => !prev);
    }
  }, [conversation.is_flow]);

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

  const handleClick = useCallback(() => {
    if (bulkSelectMode && onToggleSelect) {
      onToggleSelect();
    } else {
      onSelect();
    }
  }, [bulkSelectMode, onToggleSelect, onSelect]);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenuPosition(null);
  }, []);

  return (
    <div>
      {/* Main conversation item */}
      <div
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        className={`
          group relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all
          ${isSelected
            ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500 dark:ring-blue-400'
            : isActive 
              ? 'bg-blue-600 dark:bg-blue-700 text-white' 
              : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100'
          }
        `}
      >
        {/* Bulk selection checkbox */}
        {bulkSelectMode && (
          <div 
            className="flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.();
            }}
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${
              isSelected 
                ? 'bg-blue-600 border-blue-600' 
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-500'
            }`}>
              {isSelected && (
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
        )}

        {/* Icon/Badge */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
          isSelected
            ? 'bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300'
            : isActive 
              ? 'bg-blue-500 dark:bg-blue-600 text-white' 
              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
        }`}>
          {conversation.is_flow 
            ? conversation.flow_type === 'abandoned_cart' ? '🛒'
            : conversation.flow_type === 'welcome_series' ? '👋'
            : conversation.flow_type === 'post_purchase' ? '🎁'
            : conversation.flow_type === 'winback' ? '💌'
            : conversation.flow_type === 'product_launch' ? '🚀'
            : conversation.flow_type === 'educational_series' ? '📚'
            : '🔄'
            : conversation.mode === 'planning' ? '📋' 
            : '✉️'}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className={`text-sm font-medium truncate ${
              isActive ? 'text-white' : 'text-gray-900 dark:text-gray-100'
            }`}>
              {conversation.title || 'New Conversation'}
            </h3>
            {isPinned && (
              <svg className="w-3 h-3 text-yellow-500 fill-current flex-shrink-0" viewBox="0 0 24 24">
                <path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" />
              </svg>
            )}
          </div>
          
          {/* Meta info with type tag */}
          <div className={`flex items-center gap-2 text-xs ${
            isActive ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
          }`}>
            {/* Type tag */}
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
              isActive 
                ? 'bg-blue-500/30 text-blue-100' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}>
              {conversation.is_flow 
                ? conversation.flow_type === 'abandoned_cart' ? 'Cart'
                : conversation.flow_type === 'welcome_series' ? 'Welcome'
                : conversation.flow_type === 'post_purchase' ? 'Post-Purchase'
                : conversation.flow_type === 'winback' ? 'Winback'
                : conversation.flow_type === 'product_launch' ? 'Launch'
                : conversation.flow_type === 'educational_series' ? 'Education'
                : 'Flow'
                : conversation.mode === 'planning' ? 'Planning'
                : 'Email'}
            </span>
            {conversation.created_by_name && (
              <>
                <span>•</span>
                <span className="truncate max-w-[80px]">{conversation.created_by_name}</span>
              </>
            )}
            <span>•</span>
            <span>{formatDate(conversation.last_message_at || conversation.created_at)}</span>
          </div>
        </div>

        {/* Flow expand button */}
        {conversation.is_flow && (
          <button
            onClick={handleToggleExpand}
            className={`flex-shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold transition-all ${
              isActive 
                ? 'bg-blue-500/30 text-white hover:bg-blue-500/50' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <span>{flowChildren.length || flowChildrenCount}</span>
            <svg 
              className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Three-dot menu button - Always visible on hover or when menu is open */}
        {!bulkSelectMode && (
          <button
            onClick={handleThreeDotClick}
            className={`flex-shrink-0 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${
              showThreeDotMenu ? 'opacity-100' : ''
            } ${
              isActive 
                ? 'hover:bg-blue-500/30 text-white' 
                : 'hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400'
            }`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
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
        position={contextMenuPosition}
        onAction={handleAction}
        onClose={handleCloseContextMenu}
        bulkSelectMode={bulkSelectMode}
      />

      {/* Child emails */}
      {isExpanded && conversation.is_flow && (
        <div className="ml-8 mt-1 space-y-1">
          {loadingChildren ? (
            <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Loading...
            </div>
          ) : flowChildren.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 italic">
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
                  w-full text-left flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-all
                  ${child.id === currentConversationId
                    ? 'bg-blue-600 dark:bg-blue-700 text-white'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }
                `}
              >
                <div className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                  child.id === currentConversationId 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                }`}>
                  {child.flow_sequence_order}
                </div>
                <span className="flex-1 truncate font-medium">
                  {child.flow_email_title || `Email ${child.flow_sequence_order}`}
                </span>
                <svg className="w-3 h-3 flex-shrink-0 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    prevProps.isActive === nextProps.isActive &&
    prevProps.isPinned === nextProps.isPinned &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.bulkSelectMode === nextProps.bulkSelectMode &&
    prevProps.currentConversationId === nextProps.currentConversationId
  );
});
