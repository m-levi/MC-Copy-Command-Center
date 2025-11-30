'use client';

import { useState, memo, useMemo } from 'react';
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtStep,
} from '@/components/ai-elements/chain-of-thought';
import { AIStatus } from '@/types';
import {
  BrainIcon,
  SearchIcon,
  SparklesIcon,
  FileTextIcon,
  CheckCircleIcon,
  GlobeIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Loader2Icon,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AIReasoningProps {
  thinking?: string;
  isStreaming?: boolean;
  aiStatus?: AIStatus;
  className?: string;
  defaultOpen?: boolean;
}

// Keyframes for breathing animation
const breatheKeyframes = `
  @keyframes breathe {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
`;

// Parse thinking content for web search indicators and strategy sections
function parseThinkingContent(content: string) {
  const sections: {
    type: 'text' | 'web-search-start' | 'web-search-end' | 'strategy';
    content: string;
  }[] = [];
  
  // Split by web search markers
  const parts = content.split(/(\[Using web search to find information\.\.\.\]|\[Web search complete\]|<email_strategy>[\s\S]*?<\/email_strategy>)/g);
  
  for (const part of parts) {
    if (!part.trim()) continue;
    
    if (part === '[Using web search to find information...]') {
      sections.push({ type: 'web-search-start', content: part });
    } else if (part === '[Web search complete]') {
      sections.push({ type: 'web-search-end', content: part });
    } else if (part.startsWith('<email_strategy>')) {
      const strategyMatch = part.match(/<email_strategy>([\s\S]*?)<\/email_strategy>/);
      if (strategyMatch) {
        sections.push({ type: 'strategy', content: strategyMatch[1].trim() });
      }
    } else {
      sections.push({ type: 'text', content: part.trim() });
    }
  }
  
  return sections;
}

// Get status label for display
function getStatusLabel(status: AIStatus, isStreaming: boolean): string {
  if (!isStreaming) return 'Thought Process';
  
  switch (status) {
    case 'thinking': return 'Thinking...';
    case 'searching_web': return 'Searching web...';
    case 'analyzing_brand': return 'Analyzing brand...';
    case 'crafting_subject': return 'Crafting subject...';
    case 'writing_hero': return 'Writing hero...';
    case 'developing_body': return 'Writing body...';
    case 'creating_cta': return 'Creating CTA...';
    case 'finalizing': return 'Finalizing...';
    default: return 'Processing...';
  }
}

// Get icon for status
function getStatusIcon(status: AIStatus) {
  switch (status) {
    case 'searching_web': return GlobeIcon;
    case 'analyzing_brand': return SparklesIcon;
    case 'crafting_subject':
    case 'writing_hero':
    case 'developing_body':
    case 'creating_cta': return FileTextIcon;
    case 'finalizing': return CheckCircleIcon;
    default: return BrainIcon;
  }
}

const AIReasoningBase = function AIReasoning({
  thinking,
  isStreaming = false,
  aiStatus = 'idle',
  className,
  defaultOpen = false,
}: AIReasoningProps) {
  // ALWAYS start closed - user must manually open to view thinking
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Parse thinking content into sections
  const sections = useMemo(() => {
    if (!thinking) return [];
    return parseThinkingContent(thinking);
  }, [thinking]);
  
  // Don't render if no content and not streaming
  if (!thinking && !isStreaming) return null;
  
  const StatusIcon = getStatusIcon(aiStatus);
  const statusLabel = getStatusLabel(aiStatus, isStreaming);
  
  // Generate preview text based on the current state of thinking
  const previewContent = useMemo(() => {
    if (sections.length === 0) return null;

    // Only show text preview if streaming is active
    if (isStreaming) {
        // Get the last relevant text section
        const lastTextSection = [...sections].reverse().find(s => s.type === 'text');
        
        if (lastTextSection) {
        // Clean up text for preview (remove markdown markers but keep some structure)
        const cleanText = lastTextSection.content
            .replace(/[#*`]/g, '') // Remove markdown characters
            .replace(/\n+/g, ' ')   // Collapse newlines
            .trim();
            
        if (cleanText) {
            // Show the tail end of the text (last ~80 chars) to simulate streaming
            const snippet = cleanText.length > 80 
            ? '...' + cleanText.slice(-80) 
            : cleanText;
            
            return (
            <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400 overflow-hidden">
                <span className="truncate italic opacity-80">
                {snippet}
                </span>
            </div>
            );
        }
        }
    }

    // Fallback to summary items if no text is streaming yet or streaming is done
    const summaryItems: string[] = [];
    
    if (sections.some(s => s.type === 'web-search-start')) {
      summaryItems.push("Searched web");
    }
    
    if (sections.some(s => s.type === 'strategy')) {
      summaryItems.push("Developed strategy");
    }

    if (summaryItems.length === 0) {
        if (!isStreaming) return null;
        return null; 
    }

    return (
      <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400 overflow-hidden">
        {summaryItems.map((item, idx) => (
          <span key={idx} className="flex items-center whitespace-nowrap">
            {idx > 0 && <span className="mx-1.5 opacity-50">•</span>}
            {item}
          </span>
        ))}
      </div>
    );
  }, [sections, isStreaming]);

  return (
    <>
      <style>{breatheKeyframes}</style>
      <div 
        className={`w-full mb-6 rounded-xl border overflow-hidden transition-all duration-300 ${
          isStreaming 
            ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/50' 
            : 'bg-gray-50/50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700'
        } ${className || ''}`}
        style={isStreaming ? { animation: 'breathe 2.5s ease-in-out infinite' } : undefined}
      >
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-3 overflow-hidden w-full mr-2">
            <div className="shrink-0 flex items-center justify-center">
              {isStreaming ? (
                <div className="flex gap-0.5 h-3 items-end pb-0.5">
                   <span className="w-1 h-2 bg-blue-500 rounded-full animate-[bounce_1s_infinite_0ms]"></span>
                   <span className="w-1 h-2 bg-blue-500 rounded-full animate-[bounce_1s_infinite_200ms]"></span>
                   <span className="w-1 h-2 bg-blue-500 rounded-full animate-[bounce_1s_infinite_400ms]"></span>
                </div>
              ) : (
                <BrainIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              )}
            </div>
            
            <div className="flex flex-col items-start text-left overflow-hidden min-w-0 flex-1">
               <span className={`text-xs font-medium uppercase tracking-wider transition-colors ${
                 isStreaming 
                   ? 'text-blue-600 dark:text-blue-400' 
                   : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
               }`}>
                 {statusLabel}
               </span>
               
               {/* Enhanced Preview - Show when collapsed */}
               {!isExpanded && (
                 <div className="w-full mt-0.5 animate-in fade-in slide-in-from-left-1">
                   {previewContent || (
                     !isStreaming && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 italic">
                            Click to view reasoning details
                        </span>
                     )
                   )}
                 </div>
               )}
            </div>
          </div>
          
          <div className="shrink-0">
            {isExpanded ? (
              <ChevronDownIcon className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors" />
            )}
          </div>
        </button>

        {isExpanded && (
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-4 bg-white/50 dark:bg-transparent w-full">
             <ChainOfThought open={true}>
                <ChainOfThoughtContent>
                  {/* Show initial loader if streaming but no content yet */}
                  {sections.length === 0 && isStreaming && (
                    <ChainOfThoughtStep
                      icon={Loader2Icon}
                      label="Initializing..."
                      status="active"
                      className="animate-pulse"
                    />
                  )}

                  {sections.map((section, index) => {
                    switch (section.type) {
                      case 'web-search-start':
                        return (
                          <ChainOfThoughtStep
                            key={index}
                            icon={SearchIcon}
                            label="Searching the web..."
                            status={isStreaming ? 'active' : 'complete'}
                            className="text-blue-600 dark:text-blue-400"
                          />
                        );
                      
                      case 'web-search-end':
                        return (
                          <ChainOfThoughtStep
                            key={index}
                            icon={CheckCircleIcon}
                            label="Web search complete"
                            status="complete"
                            className="text-green-600 dark:text-green-400"
                          />
                        );
                      
                      case 'strategy':
                        return (
                          <ChainOfThoughtStep
                            key={index}
                            icon={SparklesIcon}
                            label="Email Strategy"
                            status="complete"
                          >
                            <div className="mt-2 prose prose-sm dark:prose-invert max-w-none text-xs bg-white/50 dark:bg-black/20 p-3 rounded-md border border-gray-100 dark:border-gray-800">
                              <ReactMarkdown>{section.content}</ReactMarkdown>
                            </div>
                          </ChainOfThoughtStep>
                        );
                      
                      case 'text':
                        return (
                          <ChainOfThoughtStep
                            key={index}
                            icon={BrainIcon}
                            label="Reasoning"
                            status="complete"
                          >
                            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                              <ReactMarkdown>{section.content}</ReactMarkdown>
                            </div>
                          </ChainOfThoughtStep>
                        );
                      
                      default:
                        return null;
                    }
                  })}
                  
                  {/* Show current status indicator at the end if still processing */}
                  {isStreaming && sections.length > 0 && (
                    <ChainOfThoughtStep
                      icon={StatusIcon}
                      label={statusLabel}
                      status="active"
                      className="animate-pulse opacity-70"
                    />
                  )}
                </ChainOfThoughtContent>
             </ChainOfThought>
          </div>
        )}
      </div>
    </>
  );
};

export const AIReasoning = memo(AIReasoningBase);

AIReasoning.displayName = 'AIReasoning';

export default AIReasoning;
