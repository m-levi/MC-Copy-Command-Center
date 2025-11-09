'use client';

import { ConversationWithStatus, ConversationQuickAction, Conversation } from '@/types';
import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

interface ConversationCardProps {
  conversation: ConversationWithStatus;
  isActive: boolean;
  isPinned: boolean;
  currentConversationId?: string | null; // To check if a child is active
  onSelect: () => void;
  onSelectChild?: (childId: string) => void;
  onAction: (action: ConversationQuickAction) => void;
  onPrefetch?: () => void;
  bulkSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (event?: React.MouseEvent) => void;
}

export default function ConversationCard({
  conversation,
  isActive,
  isPinned,
  currentConversationId = null,
  onSelect,
  onSelectChild,
  onAction,
  onPrefetch,
  bulkSelectMode = false,
  isSelected = false,
  onToggleSelect
}: ConversationCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [flowChildren, setFlowChildren] = useState<Conversation[]>([]);
  const [flowChildrenCount, setFlowChildrenCount] = useState<number>(0);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
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
      logger.error('Error loading flow children count:', error);
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
    
    logger.log(`[ConversationCard] Loading children for flow:`, conversation.id);
    setLoadingChildren(true);
    try {
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .eq('parent_conversation_id', conversation.id)
        .order('flow_sequence_order', { ascending: true });

      logger.log(`[ConversationCard] Loaded ${data?.length || 0} children for flow ${conversation.id}`);
      if (data) {
        setFlowChildren(data);
      }
    } catch (error) {
      logger.error('Error loading flow children:', error);
    } finally {
      setLoadingChildren(false);
    }
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    logger.log('[ConversationCard] Toggle expand clicked for', conversation.id, 'Current:', isExpanded);
    if (conversation.is_flow) {
      setIsExpanded(!isExpanded);
      logger.log('[ConversationCard] Setting expanded to:', !isExpanded);
    }
  };

  // Get status badge
  const getStatusBadge = () => {
    if (!conversation.status || conversation.status === 'idle') return null;

    const statusConfig = {
      loading: {
        color: 'bg-blue-500',
        text: 'Loading',
        animate: 'animate-pulse'
      },
      ai_responding: {
        color: 'bg-gradient-to-r from-blue-500 to-purple-500',
        text: 'AI Responding',
        animate: 'animate-pulse'
      },
      error: {
        color: 'bg-red-500',
        text: 'Error',
        animate: 'animate-pulse'
      }
    };

    const config = statusConfig[conversation.status];
    if (!config) return null;

    return (
      <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 ${config.color} rounded-full text-white text-[10px] font-semibold ${config.animate}`}>
        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
        {config.text}
      </div>
    );
  };

  // Generate gradient background based on conversation ID
  const getGradient = () => {
    const gradients = [
      'from-blue-400 to-blue-600',
      'from-purple-400 to-purple-600',
      'from-pink-400 to-pink-600',
      'from-indigo-400 to-indigo-600',
      'from-cyan-400 to-cyan-600',
      'from-teal-400 to-teal-600',
    ];
    const index = conversation.id.charCodeAt(0) % gradients.length;
    return gradients[index];
  };

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => {
        setShowActions(true);
        onPrefetch?.();
      }}
      onMouseLeave={() => setShowActions(false)}
      onClick={(e) => {
        if (bulkSelectMode && onToggleSelect) {
          onToggleSelect(e);
        } else {
          onSelect();
        }
      }}
      className={`
        group relative
        rounded-xl
        transition-all duration-200
        cursor-pointer overflow-hidden
        ${isSelected
          ? 'bg-blue-50 dark:bg-blue-950/30 shadow-md border-2 border-blue-200 dark:border-blue-800'
          : isActive 
            ? 'bg-blue-600 dark:bg-blue-700 shadow-lg ring-2 ring-blue-400 dark:ring-blue-500' 
            : 'bg-white dark:bg-gray-800 shadow-sm hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-750'
        }
      `}
    >

      {/* Thumbnail/Header with gradient */}
      <div className={`h-20 bg-gradient-to-br ${getGradient()} relative`}>
        {/* Bulk selection checkbox */}
        {bulkSelectMode && (
          <div 
            className="absolute top-2 left-2 z-10"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.(e);
            }}
          >
            <div className={`
              w-5 h-5 rounded flex items-center justify-center transition-all cursor-pointer
              ${isSelected 
                ? 'bg-blue-600 dark:bg-blue-500 scale-100' 
                : 'bg-white/95 dark:bg-gray-900/95 border-2 border-white dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-400 scale-95'
              }
            `}>
              {isSelected && (
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
        )}
        
        {/* Pin indicator */}
        {!bulkSelectMode && isPinned && (
          <div className="absolute top-2 left-2 p-1 bg-white/90 dark:bg-gray-900/90 rounded-full">
            <svg className="w-3.5 h-3.5 text-yellow-500 fill-current" viewBox="0 0 24 24">
              <path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" />
            </svg>
          </div>
        )}

        {/* Status badge */}
        {getStatusBadge()}

        {/* Type badge */}
        <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full text-[10px] font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
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
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className={`text-sm font-semibold line-clamp-2 mb-2 min-h-[2.5rem] ${
          isActive ? 'text-white' : 'text-gray-900 dark:text-gray-100'
        }`}>
          {conversation.title || 'New Conversation'}
        </h3>

        {/* Flow info for parent flows */}
        {conversation.is_flow && (
          <div className={`text-xs mb-2 ${
            isActive ? 'text-blue-100' : 'text-gray-600 dark:text-gray-400'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="font-medium">
                  {conversation.flow_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </div>
              <button
                onClick={handleToggleExpand}
                className={`flex items-center gap-1 px-2 py-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-all ${
                  isActive ? 'text-blue-100 bg-blue-500/20' : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700'
                }`}
                title={isExpanded ? 'Collapse emails' : 'Show emails'}
              >
                <span className="font-semibold">{flowChildren.length || flowChildrenCount}</span>
                <svg 
                  className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Preview */}
        {conversation.last_message_preview && (
          <p className={`text-xs line-clamp-3 mb-3 leading-relaxed ${
            isActive ? 'text-blue-100' : 'text-gray-600 dark:text-gray-400'
          }`}>
            {conversation.last_message_preview}
          </p>
        )}

        {/* Footer */}
        <div className={`flex items-center justify-between text-xs pt-2 border-t ${
          isActive 
            ? 'text-blue-100 border-blue-500' 
            : 'text-gray-500 dark:text-gray-400 border-gray-100 dark:border-gray-700'
        }`}>
          <div className="flex items-center gap-1.5">
            {conversation.created_by_name && (
              <>
                <span className="truncate max-w-[100px]">{conversation.created_by_name}</span>
                <span>•</span>
              </>
            )}
            <span>
              {new Date(conversation.last_message_at || conversation.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })}
            </span>
          </div>

          {/* Progress indicator */}
          {conversation.status === 'ai_responding' && conversation.aiProgress !== undefined && (
            <div className="flex items-center gap-1">
              <div className="w-16 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${conversation.aiProgress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions Overlay */}
      {showActions && !isActive && !bulkSelectMode && (
        <div 
          className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end justify-center p-3 gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAction(isPinned ? 'unpin' : 'pin');
            }}
            className="p-2 bg-white dark:bg-gray-800 rounded-full hover:scale-110 transition-transform shadow-lg"
            title={isPinned ? 'Unpin' : 'Pin'}
          >
            <svg className={`w-4 h-4 ${isPinned ? 'text-yellow-500 fill-current' : 'text-gray-600 dark:text-gray-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onAction('duplicate');
            }}
            className="p-2 bg-white dark:bg-gray-800 rounded-full hover:scale-110 transition-transform shadow-lg"
            title="Duplicate"
          >
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onAction('archive');
            }}
            className="p-2 bg-white dark:bg-gray-800 rounded-full hover:scale-110 transition-transform shadow-lg"
            title="Archive"
          >
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onAction('delete');
            }}
            className="p-2 bg-white dark:bg-gray-800 rounded-full hover:scale-110 transition-transform shadow-lg"
            title="Delete"
          >
            <svg className="w-4 h-4 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}

      {/* Child Emails - Expandable List */}
      {isExpanded && conversation.is_flow && (
        <div className="px-3 pb-2 pt-1">
          <div className="ml-2 pl-3 border-l-2 border-blue-400 dark:border-blue-600 space-y-1.5 py-1">
            {loadingChildren ? (
              <div className="p-3 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <svg className="animate-spin h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Loading emails...</span>
              </div>
            ) : flowChildren.length === 0 ? (
              <div className="p-3 text-xs text-gray-500 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                No emails generated yet
              </div>
            ) : (
              flowChildren.map((child) => (
              <button
                key={child.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectChild) {
                    logger.log('[ConversationCard] Selecting child:', child.id);
                    onSelectChild(child.id);
                  }
                }}
                className={`
                  w-full text-left p-2.5 rounded-lg transition-all duration-150 flex items-center gap-2.5 border
                  ${child.id === currentConversationId
                    ? 'bg-blue-600 dark:bg-blue-700 text-white shadow-md border-blue-500 dark:border-blue-600 scale-[1.02]'
                    : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm'
                  }
                `}
              >
                {/* Sequence number badge */}
                <div className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${
                  child.id === currentConversationId 
                    ? 'bg-blue-500 dark:bg-blue-600 text-white' 
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                }`}>
                  {child.flow_sequence_order}
                </div>
                
                {/* Email title */}
                <span className="text-xs font-medium flex-1 truncate">
                  {child.flow_email_title || `Email ${child.flow_sequence_order}`}
                </span>

                {/* Indicator */}
                <svg className={`w-3.5 h-3.5 flex-shrink-0 ${
                  child.id === currentConversationId ? 'text-white' : 'text-gray-400'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}



