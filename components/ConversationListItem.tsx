'use client';

import { ConversationWithStatus, Conversation } from '@/types';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface ConversationListItemProps {
  conversation: ConversationWithStatus;
  isActive: boolean;
  isPinned: boolean;
  currentConversationId?: string | null;
  onSelect: () => void;
  onSelectChild?: (childId: string) => void;
}

export default function ConversationListItem({
  conversation,
  isActive,
  isPinned,
  currentConversationId = null,
  onSelect,
  onSelectChild
}: ConversationListItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [flowChildren, setFlowChildren] = useState<Conversation[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const supabase = createClient();

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

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (conversation.is_flow) {
      setIsExpanded(!isExpanded);
    }
  };

  const formatDate = (dateString: string) => {
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
  };

  return (
    <div>
      {/* Main conversation item */}
      <div
        onClick={onSelect}
        className={`
          group relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all
          ${isActive 
            ? 'bg-blue-600 dark:bg-blue-700 text-white' 
            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100'
          }
        `}
      >
        {/* Icon/Badge */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
          isActive 
            ? 'bg-blue-500 dark:bg-blue-600 text-white' 
            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
        }`}>
          {conversation.is_flow ? '🔄' : conversation.mode === 'planning' ? '📋' : '✉️'}
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
          
          {/* Meta info */}
          <div className={`flex items-center gap-2 text-xs ${
            isActive ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
          }`}>
            {conversation.is_flow && (
              <>
                <span className="font-medium">{conversation.flow_type?.replace(/_/g, ' ')}</span>
                <span>•</span>
              </>
            )}
            {conversation.created_by_name && (
              <>
                <span className="truncate max-w-[80px]">{conversation.created_by_name}</span>
                <span>•</span>
              </>
            )}
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
            <span>{flowChildren.length || 0}</span>
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
      </div>

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

