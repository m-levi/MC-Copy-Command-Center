'use client';

import { ConversationWithStatus, ConversationQuickAction } from '@/types';
import { useState, useRef, useEffect } from 'react';

interface ConversationCardProps {
  conversation: ConversationWithStatus;
  isActive: boolean;
  isPinned: boolean;
  onSelect: () => void;
  onAction: (action: ConversationQuickAction) => void;
  onPrefetch?: () => void;
}

export default function ConversationCard({
  conversation,
  isActive,
  isPinned,
  onSelect,
  onAction,
  onPrefetch
}: ConversationCardProps) {
  const [showActions, setShowActions] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

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
      onClick={onSelect}
      className={`
        group relative
        rounded-xl
        transition-all duration-200
        cursor-pointer overflow-hidden
        ${isActive 
          ? 'bg-blue-600 dark:bg-blue-700 shadow-lg ring-2 ring-blue-400 dark:ring-blue-500' 
          : 'bg-white dark:bg-gray-800 shadow-sm hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-750'
        }
      `}
    >

      {/* Thumbnail/Header with gradient */}
      <div className={`h-20 bg-gradient-to-br ${getGradient()} relative`}>
        {/* Pin indicator */}
        {isPinned && (
          <div className="absolute top-2 left-2 p-1 bg-white/90 dark:bg-gray-900/90 rounded-full">
            <svg className="w-3.5 h-3.5 text-yellow-500 fill-current" viewBox="0 0 24 24">
              <path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" />
            </svg>
          </div>
        )}

        {/* Status badge */}
        {getStatusBadge()}

        {/* Mode badge */}
        <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full text-[10px] font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
          {conversation.mode === 'planning' ? '📋 Plan' : '✉️ Write'}
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
      {showActions && !isActive && (
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
    </div>
  );
}



