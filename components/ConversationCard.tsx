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

  // Get status display
  const getStatusDisplay = () => {
    if (!conversation.status || conversation.status === 'idle') {
      // Default: Show creator avatar/name
      return conversation.created_by_name ? (
        <div className="flex items-center gap-1 text-[10px] text-gray-400">
          <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[8px] font-medium text-gray-600 dark:text-gray-400">
            {conversation.created_by_name.charAt(0).toUpperCase()}
          </div>
        </div>
      ) : null;
    }

    const statusConfig = {
      loading: {
        text: 'Loading...',
        color: 'text-blue-600 dark:text-blue-400',
        icon: (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
        )
      },
      ai_responding: {
        text: 'Generating...',
        color: 'text-blue-600 dark:text-blue-400',
        icon: (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
        )
      },
      error: {
        text: 'Error',
        color: 'text-red-600 dark:text-red-400',
        icon: (
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
        )
      }
    };

    const config = statusConfig[conversation.status as keyof typeof statusConfig];
    if (!config) return null;

    return (
      <div className={`flex items-center gap-1.5 text-[10px] font-medium ${config.color}`}>
        {config.icon}
        {config.text}
      </div>
    );
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
        rounded-lg
        transition-all duration-200
        cursor-pointer overflow-hidden border
        ${isSelected
          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
          : isActive 
            ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-md ring-1 ring-black/5 dark:ring-white/5 border-l-4 border-l-blue-600 dark:border-l-blue-500' 
            : 'bg-white dark:bg-gray-900 border-transparent hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800'
        }
      `}
    >

      {/* Bulk selection checkbox */}
      {bulkSelectMode && (
        <div 
          className="absolute top-3 left-3 z-10"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.(e);
          }}
        >
          <div className={`
            w-4 h-4 rounded flex items-center justify-center transition-all cursor-pointer border
            ${isSelected 
              ? 'bg-blue-600 border-blue-600' 
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-blue-500'
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
      <div className={`p-3 ${bulkSelectMode ? 'pl-9' : ''}`}>
        {/* Header: Title & Date */}
        <div className="flex justify-between items-start gap-2 mb-1">
          <h3 className={`text-sm font-medium line-clamp-1 ${
            isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'
          }`}>
            {conversation.title || 'New Conversation'}
          </h3>
          <span className="text-[10px] text-gray-400 flex-shrink-0 whitespace-nowrap pt-0.5">
            {new Date(conversation.last_message_at || conversation.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            })}
          </span>
        </div>

        {/* Preview */}
        {conversation.last_message_preview && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2 leading-relaxed">
            {conversation.last_message_preview}
          </p>
        )}

        {/* Footer: Badges & Info */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2 overflow-hidden">
            {/* Type Badge */}
            <span className={`
              text-[10px] px-1.5 py-0.5 rounded-md font-medium uppercase tracking-wider flex-shrink-0
              ${conversation.is_flow 
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' 
                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}
            `}>
               {conversation.is_flow ? 'Flow' : 'Email'}
            </span>

            {/* Pin Indicator */}
            {isPinned && (
              <svg className="w-3 h-3 text-gray-400 dark:text-gray-500 transform rotate-45" fill="currentColor" viewBox="0 0 24 24">
                 <path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" />
              </svg>
            )}
          </div>

          {/* Status / Progress */}
           <div className="flex items-center gap-2">
            {getStatusDisplay()}
           </div>
        </div>
        
        {/* Flow Info (if expanded) */}
        {conversation.is_flow && (
             <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                 <div className="flex items-center gap-1 text-[10px] text-gray-500">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>{flowChildren.length || flowChildrenCount} emails</span>
                 </div>
                 <button
                    onClick={handleToggleExpand}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 transition-colors"
                  >
                    <svg 
                      className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                 </button>
             </div>
        )}
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
                <span className="text-sm font-medium flex-1 truncate">
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



