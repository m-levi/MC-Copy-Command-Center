'use client';

import { useState, useRef, useEffect } from 'react';
import { Conversation, ConversationQuickAction } from '@/types';

interface FlowConversationCardProps {
  conversation: Conversation;
  children?: Conversation[];
  isActive: boolean;
  isPinned: boolean;
  onSelect: () => void;
  onSelectChild: (childId: string) => void;
  onAction: (action: ConversationQuickAction) => void;
  onPrefetch?: () => void;
}

export default function FlowConversationCard({
  conversation,
  children = [],
  isActive,
  isPinned,
  onSelect,
  onSelectChild,
  onAction,
  onPrefetch
}: FlowConversationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Auto-expand if this flow is active
  useEffect(() => {
    if (isActive) {
      setIsExpanded(true);
    }
  }, [isActive]);

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const sortedChildren = [...children].sort((a, b) => 
    (a.flow_sequence_order || 0) - (b.flow_sequence_order || 0)
  );

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => {
        setShowActions(true);
        onPrefetch?.();
      }}
      onMouseLeave={() => setShowActions(false)}
      className="group"
    >
      {/* Parent Flow Card */}
      <div
        onClick={onSelect}
        className={`
          relative rounded-lg transition-all duration-150 cursor-pointer
          ${isActive && !isExpanded
            ? 'bg-blue-600 dark:bg-blue-700 shadow-md ring-2 ring-blue-400 dark:ring-blue-500' 
            : 'bg-white dark:bg-gray-800 shadow-sm hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-750'
          }
        `}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Flow Icon */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
              isActive && !isExpanded
                ? 'bg-blue-500 dark:bg-blue-600'
                : 'bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30'
            }`}>
              <svg className={`w-4 h-4 ${isActive && !isExpanded ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Title */}
              <h3 className={`text-sm font-semibold truncate mb-1 ${
                isActive && !isExpanded ? 'text-white' : 'text-gray-900 dark:text-gray-100'
              }`}>
                {conversation.title || 'New Flow'}
              </h3>

              {/* Flow Type */}
              <div className={`text-xs flex items-center gap-1.5 mb-1 ${
                isActive && !isExpanded ? 'text-blue-100' : 'text-gray-600 dark:text-gray-400'
              }`}>
                <span className="font-medium">
                  {conversation.flow_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
                <span>•</span>
                <span>{children.length} emails</span>
              </div>

              {/* Preview */}
              {conversation.last_message_preview && !isExpanded && (
                <p className={`text-xs line-clamp-1 ${
                  isActive && !isExpanded ? 'text-blue-100' : 'text-gray-500 dark:text-gray-500'
                }`}>
                  {conversation.last_message_preview}
                </p>
              )}
            </div>

            {/* Expand/Collapse Button */}
            <button
              onClick={handleToggleExpand}
              className={`flex-shrink-0 p-1 rounded transition-colors ${
                isActive && !isExpanded
                  ? 'hover:bg-blue-500/50'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <svg 
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''} ${
                  isActive && !isExpanded ? 'text-white' : 'text-gray-500 dark:text-gray-400'
                }`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Pin indicator */}
        {isPinned && (
          <div className="absolute top-2 right-2 p-1 bg-white/90 dark:bg-gray-900/90 rounded-full">
            <svg className="w-3 h-3 text-yellow-500 fill-current" viewBox="0 0 24 24">
              <path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" />
            </svg>
          </div>
        )}
      </div>

      {/* Child Emails - Expandable */}
      {isExpanded && sortedChildren.length > 0 && (
        <div className="ml-6 mt-1 space-y-1 border-l-2 border-gray-200 dark:border-gray-700 pl-3">
          {sortedChildren.map((child) => (
            <button
              key={child.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectChild(child.id);
              }}
              className={`
                w-full text-left p-3 rounded-lg transition-all duration-150
                ${isActive && child.id === conversation.id
                  ? 'bg-blue-600 dark:bg-blue-700 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 border border-gray-200 dark:border-gray-700'
                }
              `}
            >
              <div className="flex items-center gap-2">
                {/* Email icon */}
                <svg className={`w-3.5 h-3.5 flex-shrink-0 ${
                  isActive && child.id === conversation.id ? 'text-blue-100' : 'text-gray-400'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                
                {/* Email info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold ${
                      isActive && child.id === conversation.id ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      #{child.flow_sequence_order}
                    </span>
                    <span className={`text-xs font-medium truncate ${
                      isActive && child.id === conversation.id ? 'text-white' : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {child.flow_email_title || child.title}
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <svg className={`w-3 h-3 flex-shrink-0 ${
                  isActive && child.id === conversation.id ? 'text-white' : 'text-gray-400'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


