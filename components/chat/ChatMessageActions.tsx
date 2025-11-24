'use client';

import { memo } from 'react';

interface ChatMessageActionsProps {
  onCopy: () => void;
  onRegenerate?: () => void;
  copied: boolean;
  isRegenerating: boolean;
}

export const ChatMessageActions = memo(function ChatMessageActions({
  onCopy,
  onRegenerate,
  copied,
  isRegenerating
}: ChatMessageActionsProps) {
  return (
    <div className="absolute top-2 right-2 z-10 opacity-0 group-hover/content:opacity-100 transition-opacity duration-200 flex items-center gap-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-1">
      <button
        onClick={onCopy}
        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        title="Copy"
      >
        {copied ? (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>
      {onRegenerate && (
        <button
          onClick={onRegenerate}
          disabled={isRegenerating}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Regenerate"
        >
          <svg 
            className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      )}
    </div>
  );
});


