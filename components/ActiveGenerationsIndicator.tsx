'use client';

import { useBackgroundGenerationOptional } from '@/contexts/BackgroundGenerationContext';
import { useState, useEffect } from 'react';

interface ActiveGenerationsIndicatorProps {
  onNavigateToConversation?: (conversationId: string, brandId: string) => void;
  compact?: boolean;
}

export default function ActiveGenerationsIndicator({
  onNavigateToConversation,
  compact = false,
}: ActiveGenerationsIndicatorProps) {
  const bgGeneration = useBackgroundGenerationOptional();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  
  // Get active generations
  const activeGenerations = bgGeneration?.activeGenerations;
  const generatingIds = bgGeneration?.getGeneratingConversationIds() || [];
  
  // Reset dismissed state when new generations start
  useEffect(() => {
    if (generatingIds.length > 0) {
      setIsDismissed(false);
    }
  }, [generatingIds.length]);
  
  // Close expanded view when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-generations-indicator]')) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isExpanded]);

  if (!bgGeneration || generatingIds.length === 0 || isDismissed) {
    return null;
  }

  const handleStopGeneration = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    bgGeneration.stopGeneration(conversationId);
  };

  const handleNavigate = (conversationId: string, brandId: string) => {
    setIsExpanded(false);
    onNavigateToConversation?.(conversationId, brandId);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
    setIsExpanded(false);
  };

  if (compact) {
    // Compact badge version for sidebar header
    return (
      <div className="relative" data-generations-indicator>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="relative flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20 border border-blue-200/50 dark:border-blue-700/50 transition-all cursor-pointer"
        >
          {/* Animated generating icon */}
          <div className="relative">
            <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24">
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="3"
              />
              <path 
                className="opacity-75 animate-spin origin-center" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                style={{ transformOrigin: '12px 12px' }}
              />
            </svg>
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-30" />
          </div>
          
          <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
            {generatingIds.length}
          </span>
        </button>

        {/* Expanded dropdown */}
        {isExpanded && (
          <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                {generatingIds.length} generating
              </span>
              <button
                onClick={handleDismiss}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="Dismiss"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {generatingIds.map((id) => {
                const state = activeGenerations?.get(id);
                if (!state) return null;
                
                return (
                  <div
                    key={id}
                    className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                    onClick={() => handleNavigate(id, state.brandId)}
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-3 h-3 text-blue-500 flex-shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate flex-1">
                        {state.conversationTitle || 'Generating...'}
                      </p>
                      
                      <button
                        onClick={(e) => handleStopGeneration(e, id)}
                        className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors"
                        title="Stop"
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <rect x="6" y="6" width="12" height="12" rx="1" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Minimal floating pill indicator
  return (
    <div 
      className="fixed bottom-3 right-3 z-50"
      data-generations-indicator
    >
      {!isExpanded ? (
        // Collapsed pill - use div with role="button" to allow nested interactive elements
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsExpanded(true)}
          onKeyDown={(e) => e.key === 'Enter' && setIsExpanded(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-900/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full shadow-lg border border-gray-700/50 hover:bg-gray-800 dark:hover:bg-gray-700 transition-all cursor-pointer group"
        >
          <div className="relative">
            <svg className="w-3.5 h-3.5 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <span className="text-xs font-medium text-gray-200">
            {generatingIds.length} generating
          </span>
          <button
            onClick={handleDismiss}
            className="p-0.5 rounded-full hover:bg-gray-600 text-gray-400 hover:text-gray-200 transition-colors opacity-0 group-hover:opacity-100"
            title="Dismiss"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        // Expanded view
        <div className="bg-gray-900/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700/50 overflow-hidden w-56">
          <div className="px-3 py-2 border-b border-gray-700/50 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-300">
              {generatingIds.length} generating
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
                title="Collapse"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <button
                onClick={handleDismiss}
                className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
                title="Dismiss"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="max-h-40 overflow-y-auto">
            {generatingIds.map((id) => {
              const state = activeGenerations?.get(id);
              if (!state) return null;
              
              return (
                <div
                  key={id}
                  className="px-3 py-2 hover:bg-gray-800/50 transition-colors cursor-pointer border-b border-gray-700/30 last:border-b-0"
                  onClick={() => handleNavigate(id, state.brandId)}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-3 h-3 text-blue-400 flex-shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    
                    <p className="text-xs text-gray-300 truncate flex-1">
                      {state.conversationTitle || 'Untitled'}
                    </p>
                    
                    <button
                      onClick={(e) => handleStopGeneration(e, id)}
                      className="p-1 rounded hover:bg-red-900/50 text-gray-500 hover:text-red-400 transition-colors"
                      title="Stop"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <rect x="6" y="6" width="12" height="12" rx="1" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

