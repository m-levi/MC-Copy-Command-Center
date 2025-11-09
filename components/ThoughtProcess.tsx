'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon, MagnifyingGlassIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { AIStatus } from '@/types';

interface ThoughtProcessProps {
  thinking?: string;
  emailStrategy?: string;
  isStreaming?: boolean;
  aiStatus?: AIStatus;
}

// Helper function to format thinking content with styled web search indicators
function formatThinkingContent(content: string) {
  // Split by web search markers
  const parts = content.split(/(\[Using web search to find information\.\.\.\]|\[Web search complete\])/g);
  
  return parts.map((part, index) => {
    if (part === '[Using web search to find information...]') {
      return (
        <div key={index} className="flex items-center gap-2 my-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <MagnifyingGlassIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
            Searching the web for information...
          </span>
        </div>
      );
    } else if (part === '[Web search complete]') {
      return (
        <div key={index} className="flex items-center gap-2 my-3 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
          <span className="text-sm text-green-700 dark:text-green-300 font-medium">
            Web search complete
          </span>
        </div>
      );
    } else if (part) {
      return <span key={index}>{part}</span>;
    }
    return null;
  });
}

export default function ThoughtProcess({ thinking, emailStrategy, isStreaming = false, aiStatus = 'idle' }: ThoughtProcessProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Parse thinking and emailStrategy from combined thinking content if needed
  let parsedThinking = thinking || '';
  let parsedEmailStrategy = emailStrategy || '';
  
  // If emailStrategy is not provided separately, try to extract it from thinking
  if (!emailStrategy && thinking) {
    // First try to match <email_strategy> XML tags
    const xmlStrategyMatch = thinking.match(/<email_strategy>([\s\S]*?)<\/email_strategy>/i);
    if (xmlStrategyMatch) {
      parsedEmailStrategy = xmlStrategyMatch[1].trim();
      // Remove the email_strategy block from thinking
      parsedThinking = thinking.replace(/<email_strategy>[\s\S]*?<\/email_strategy>/i, '').trim();
    } else {
      // Fallback: try to match the marker format
      const markerStrategyMatch = thinking.match(/--- EMAIL STRATEGY ---\s*([\s\S]*)/);
      if (markerStrategyMatch) {
        parsedEmailStrategy = markerStrategyMatch[1].trim();
        parsedThinking = thinking.substring(0, markerStrategyMatch.index).trim();
      }
    }
  }

  // Show the block if there's any content OR if actively streaming
  if (!parsedThinking && !parsedEmailStrategy && !isStreaming) return null;

  // Get the display label based on status
  const getDisplayLabel = () => {
    if (isStreaming && aiStatus !== 'idle') {
      return aiStatus === 'thinking' ? 'thinking' :
             aiStatus === 'searching_web' ? 'searching web' :
             aiStatus === 'analyzing_brand' ? 'analyzing brand' :
             aiStatus === 'crafting_subject' ? 'crafting subject' :
             aiStatus === 'writing_hero' ? 'writing hero' :
             aiStatus === 'developing_body' ? 'writing body' :
             aiStatus === 'creating_cta' ? 'creating CTA' :
             aiStatus === 'finalizing' ? 'finalizing' : 'thinking';
    }
    return 'thought process';
  };

  return (
    <div className={`mb-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden ${isStreaming ? 'animate-pulse' : ''}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors cursor-pointer group"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300">
            {getDisplayLabel()}
          </span>
          {isStreaming && (
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0ms', animationDuration: '1.4s' }}></div>
              <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '200ms', animationDuration: '1.4s' }}></div>
              <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '400ms', animationDuration: '1.4s' }}></div>
            </div>
          )}
        </div>
        {isExpanded ? (
          <ChevronDownIcon className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors" />
        ) : (
          <ChevronRightIcon className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors" />
        )}
      </button>
      
      {isExpanded && (parsedThinking || parsedEmailStrategy) && (
        <div className="border-t border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Thought Section */}
          {parsedThinking && (
            <div className="px-4 py-4">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Thought
              </h4>
              <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words leading-relaxed max-w-full">
                {formatThinkingContent(parsedThinking)}
              </div>
            </div>
          )}
          
          {/* Email Strategy Section */}
          {parsedEmailStrategy && (
            <div className={`px-4 py-4 ${parsedThinking ? 'border-t border-gray-200 dark:border-gray-700' : ''}`}>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Email Strategy
              </h4>
              <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words leading-relaxed max-w-full">
                {formatThinkingContent(parsedEmailStrategy)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


