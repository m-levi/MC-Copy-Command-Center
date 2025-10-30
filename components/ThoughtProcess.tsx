'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface ThoughtProcessProps {
  thinking: string;
  isStreaming?: boolean;
}

export default function ThoughtProcess({ thinking, isStreaming = false }: ThoughtProcessProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!thinking) return null;

  return (
    <div className="mb-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors group"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300">
            {isStreaming ? 'Thinking...' : 'Thought Process'}
          </span>
          {isStreaming && (
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse"></div>
              <div 
                className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse" 
                style={{ animationDelay: '0.2s' }}
              ></div>
              <div 
                className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse" 
                style={{ animationDelay: '0.4s' }}
              ></div>
            </div>
          )}
        </div>
        {isExpanded ? (
          <ChevronDownIcon className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors" />
        ) : (
          <ChevronRightIcon className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-4 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
            {thinking}
          </div>
        </div>
      )}
    </div>
  );
}


