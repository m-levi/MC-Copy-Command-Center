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
    <div className="mb-4 rounded-lg border border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 overflow-hidden shadow-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-purple-100/50 dark:hover:bg-purple-900/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/50">
            <svg 
              className="w-5 h-5 text-purple-600 dark:text-purple-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" 
              />
            </svg>
          </div>
          <div className="flex flex-col items-start">
            <span className="font-semibold text-purple-900 dark:text-purple-100">
              Thought Process
            </span>
            <span className="text-xs text-purple-600 dark:text-purple-400">
              {isStreaming ? 'Thinking...' : 'Click to view extended reasoning'}
            </span>
          </div>
          {isStreaming && (
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-purple-600 dark:bg-purple-400 rounded-full animate-pulse"></div>
              <div 
                className="w-2 h-2 bg-purple-600 dark:bg-purple-400 rounded-full animate-pulse" 
                style={{ animationDelay: '0.2s' }}
              ></div>
              <div 
                className="w-2 h-2 bg-purple-600 dark:bg-purple-400 rounded-full animate-pulse" 
                style={{ animationDelay: '0.4s' }}
              ></div>
            </div>
          )}
        </div>
        {isExpanded ? (
          <ChevronDownIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        ) : (
          <ChevronRightIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-purple-200 dark:border-purple-800">
          <div className="mt-4 prose prose-sm dark:prose-invert max-w-none">
            <div className="p-4 bg-white/50 dark:bg-black/20 rounded-lg text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono text-sm leading-relaxed">
              {thinking}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>This shows the AI's internal reasoning process before generating the response</span>
          </div>
        </div>
      )}
    </div>
  );
}


