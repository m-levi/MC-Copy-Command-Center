'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon, MagnifyingGlassIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { AIStatus } from '@/types';
import ReactMarkdown from 'react-markdown';

interface ThoughtProcessProps {
  thinking?: string;
  emailStrategy?: string;
  isStreaming?: boolean;
  aiStatus?: AIStatus;
}

// Keyframes for subtle breathing animation (like skeleton loader)
const breatheKeyframes = `
  @keyframes breathe {
    0%, 100% { 
      opacity: 1;
    }
    50% { 
      opacity: 0.7;
    }
  }
`;

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

  // Helper to capitalize label
  const capitalizeLabel = (label: string) => {
    if (!label) return '';
    return label
      .split(' ')
      .map(word => word && word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <>
      <style>{breatheKeyframes}</style>
      <div 
        className={`mb-4 rounded-lg border bg-white dark:bg-gray-800 overflow-hidden transition-all duration-300 ${
          isStreaming 
            ? 'border-blue-200 dark:border-blue-800/50' 
            : 'border-gray-200 dark:border-gray-700'
        }`}
        style={isStreaming ? { animation: 'breathe 2.5s ease-in-out infinite' } : undefined}
      >
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <span className={`text-sm transition-colors ${
              isStreaming 
                ? 'text-blue-600 dark:text-blue-400 font-medium' 
                : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
            }`}>
              {capitalizeLabel(getDisplayLabel())}
            </span>
          </div>
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors" />
          ) : (
            <ChevronRightIcon className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors" />
          )}
        </button>
      
      {/* Mini peek during streaming - show most recent content */}
      {isStreaming && !isExpanded && (parsedThinking || parsedEmailStrategy) && (
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50/30 dark:bg-gray-900/30">
          <div className="relative overflow-hidden h-12">
            <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed transition-all duration-300 ease-out">
              {(() => {
                // Show the LATEST content (tail end) with smooth word boundaries
                const fullText = parsedThinking || parsedEmailStrategy;
                
                // Get last ~200 chars for better context
                const tailLength = 200;
                let tail = fullText.length > tailLength 
                  ? fullText.substring(fullText.length - tailLength)
                  : fullText;
                
                // Find the first complete sentence or phrase
                // Look for sentence breaks (. ! ? :) or line breaks
                const sentenceBreak = tail.search(/[.!?:]\s+/);
                if (sentenceBreak > 0 && sentenceBreak < 50) {
                  // Start after the sentence break for cleaner display
                  tail = tail.substring(sentenceBreak + 2);
                } else {
                  // Otherwise, start at first word boundary
                  const firstSpace = tail.indexOf(' ');
                  if (firstSpace > 0 && firstSpace < 20) {
                    tail = tail.substring(firstSpace + 1);
                  }
                }
                
                // Trim to reasonable display length and end at word boundary
                if (tail.length > 150) {
                  tail = tail.substring(0, 150);
                  const lastSpace = tail.lastIndexOf(' ');
                  if (lastSpace > 100) {
                    tail = tail.substring(0, lastSpace);
                  }
                }
                
                return '...' + tail.trim();
              })()}
            </div>
            {/* Subtle fade effect at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-50/30 dark:from-gray-900/30 to-transparent pointer-events-none"></div>
          </div>
        </div>
      )}
      
      {isExpanded && (parsedThinking || parsedEmailStrategy) && (
        <div className="border-t border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Thought Section */}
          {parsedThinking && (
            <div className="px-4 py-4">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Thought
              </h4>
              <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400">
                <ReactMarkdown
                  components={{
                    // Preserve web search indicators as styled components
                    p: ({ children, ...props }) => {
                      const text = String(children);
                      if (text.includes('[Using web search to find information...]') || text.includes('[Web search complete]')) {
                        return formatThinkingContent(text);
                      }
                      return <p {...props}>{children}</p>;
                    },
                    // Style code blocks
                    code: ({ node, ...props }) => {
                      const className = node?.properties?.className;
                      const isInline = !className || (typeof className === 'string' && !className.includes('language'));
                      if (isInline) {
                        return <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm" {...props} />;
                      }
                      return <code className="block bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm overflow-x-auto" {...props} />;
                    },
                    // Style lists
                    ul: ({ ...props }) => <ul className="list-disc pl-5 space-y-1" {...props} />,
                    ol: ({ ...props }) => <ol className="list-decimal pl-5 space-y-1" {...props} />,
                    // Style headings
                    h1: ({ ...props }) => <h1 className="text-lg font-bold mt-4 mb-2" {...props} />,
                    h2: ({ ...props }) => <h2 className="text-base font-bold mt-3 mb-2" {...props} />,
                    h3: ({ ...props }) => <h3 className="text-sm font-semibold mt-2 mb-1" {...props} />,
                    // Style blockquotes
                    blockquote: ({ ...props }) => <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic my-2" {...props} />,
                    // Style links
                    a: ({ ...props }) => <a className="text-blue-600 dark:text-blue-400 hover:underline" {...props} />,
                  }}
                >
                  {parsedThinking}
                </ReactMarkdown>
              </div>
            </div>
          )}
          
          {/* Email Strategy Section */}
          {parsedEmailStrategy && (
            <div className={`px-4 py-4 ${parsedThinking ? 'border-t border-gray-200 dark:border-gray-700' : ''}`}>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Email Strategy
              </h4>
              <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400">
                <ReactMarkdown
                  components={{
                    // Preserve web search indicators as styled components
                    p: ({ children, ...props }) => {
                      const text = String(children);
                      if (text.includes('[Using web search to find information...]') || text.includes('[Web search complete]')) {
                        return formatThinkingContent(text);
                      }
                      return <p {...props}>{children}</p>;
                    },
                    // Style code blocks
                    code: ({ node, ...props }) => {
                      const className = node?.properties?.className;
                      const isInline = !className || (typeof className === 'string' && !className.includes('language'));
                      if (isInline) {
                        return <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm" {...props} />;
                      }
                      return <code className="block bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm overflow-x-auto" {...props} />;
                    },
                    // Style lists
                    ul: ({ ...props }) => <ul className="list-disc pl-5 space-y-1" {...props} />,
                    ol: ({ ...props }) => <ol className="list-decimal pl-5 space-y-1" {...props} />,
                    // Style headings
                    h1: ({ ...props }) => <h1 className="text-lg font-bold mt-4 mb-2" {...props} />,
                    h2: ({ ...props }) => <h2 className="text-base font-bold mt-3 mb-2" {...props} />,
                    h3: ({ ...props }) => <h3 className="text-sm font-semibold mt-2 mb-1" {...props} />,
                    // Style blockquotes
                    blockquote: ({ ...props }) => <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic my-2" {...props} />,
                    // Style links
                    a: ({ ...props }) => <a className="text-blue-600 dark:text-blue-400 hover:underline" {...props} />,
                  }}
                >
                  {parsedEmailStrategy}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </>
  );
}


