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
  Loader2Icon,
  BotIcon,
  ZapIcon,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AgentInvocation {
  id: string;
  agent_id: string;
  agent_name: string;
  agent_icon: string;
  task: string;
  status: 'invoking' | 'completed' | 'failed';
  response?: string;
  duration_ms?: number;
}

interface AIReasoningProps {
  thinking?: string;
  isStreaming?: boolean;
  aiStatus?: AIStatus;
  className?: string;
  defaultOpen?: boolean;
  agentInvocations?: AgentInvocation[];
}

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
  if (!isStreaming) return 'Reasoning';
  
  switch (status) {
    case 'thinking': return 'Thinking';
    case 'searching_web': return 'Searching web';
    case 'analyzing_brand': return 'Analyzing brand';
    case 'crafting_subject': return 'Crafting subject';
    case 'writing_hero': return 'Writing hero';
    case 'developing_body': return 'Writing body';
    case 'creating_cta': return 'Creating CTA';
    case 'finalizing': return 'Finalizing';
    default: return 'Processing';
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
  agentInvocations = [],
}: AIReasoningProps) {
  // ALWAYS start closed - user must manually open to view thinking
  const [isExpanded, setIsExpanded] = useState(false);

  // Check if any agents are currently being invoked
  const hasActiveAgents = agentInvocations.some(a => a.status === 'invoking');
  
  // Parse thinking content into sections
  const sections = useMemo(() => {
    if (!thinking) return [];
    return parseThinkingContent(thinking);
  }, [thinking]);
  
  // Don't render if no content, not streaming, and no agent invocations
  if (!thinking && !isStreaming && agentInvocations.length === 0) return null;
  
  const StatusIcon = getStatusIcon(aiStatus);
  const statusLabel = getStatusLabel(aiStatus, isStreaming);
  
  // Generate summary badges based on completed activities
  const summaryBadges = useMemo(() => {
    const badges: { label: string; icon: typeof SearchIcon }[] = [];

    if (agentInvocations.length > 0) {
      badges.push({ label: `${agentInvocations.length} Agent${agentInvocations.length > 1 ? 's' : ''}`, icon: BotIcon });
    }

    if (sections.some(s => s.type === 'web-search-start' || s.type === 'web-search-end')) {
      badges.push({ label: 'Web search', icon: GlobeIcon });
    }

    if (sections.some(s => s.type === 'strategy')) {
      badges.push({ label: 'Strategy', icon: SparklesIcon });
    }

    if (sections.some(s => s.type === 'text')) {
      badges.push({ label: 'Analysis', icon: BrainIcon });
    }

    return badges;
  }, [sections, agentInvocations]);

  // Generate streaming preview text
  const streamingPreview = useMemo(() => {
    if (!isStreaming || isExpanded) return null;
    
    // Get the last text section for preview
    const lastTextSection = [...sections].reverse().find(s => s.type === 'text');
    if (!lastTextSection) return null;
    
    // Clean and truncate the text
    const cleanText = lastTextSection.content
      .replace(/[#*`]/g, '')  // Remove markdown
      .replace(/\n+/g, ' ')   // Collapse newlines
      .trim();
    
    if (!cleanText || cleanText.length < 10) return null;
    
    // Show the tail end to simulate streaming effect
    const maxLen = 60;
    return cleanText.length > maxLen 
      ? '...' + cleanText.slice(-maxLen) 
      : cleanText;
  }, [sections, isStreaming, isExpanded]);

  return (
    <div className={`w-full mb-4 ${className || ''}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
          transition-all duration-200 cursor-pointer
          ${isStreaming 
            ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/50' 
            : 'bg-gray-100 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 hover:bg-gray-150 dark:hover:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-700'
          }
        `}
      >
        {/* Icon */}
        <span className="flex items-center justify-center">
          {isStreaming ? (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
            </span>
          ) : (
            <BrainIcon className="w-3.5 h-3.5" />
          )}
        </span>
        
        {/* Label */}
        <span>{statusLabel}</span>
        
        {/* Summary badges - only when collapsed and not streaming */}
        {!isExpanded && !isStreaming && summaryBadges.length > 0 && (
          <span className="flex items-center gap-1 ml-1 pl-2 border-l border-gray-300 dark:border-gray-600">
            {summaryBadges.slice(0, 2).map((badge, idx) => (
              <span 
                key={idx}
                className="inline-flex items-center gap-0.5 text-[10px] text-gray-500 dark:text-gray-400"
              >
                <badge.icon className="w-2.5 h-2.5" />
              </span>
            ))}
            {summaryBadges.length > 2 && (
              <span className="text-[10px] text-gray-400">+{summaryBadges.length - 2}</span>
            )}
          </span>
        )}
        
        {/* Expand indicator */}
        <ChevronDownIcon 
          className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Streaming text preview - shows below pill when streaming */}
      {streamingPreview && (
        <div className="mt-2 ml-1 overflow-hidden">
          <p className="text-[11px] text-gray-500 dark:text-gray-400 italic truncate max-w-md animate-in fade-in slide-in-from-left-2 duration-300">
            <span className="opacity-60">"</span>
            {streamingPreview}
            <span className="inline-block w-1.5 h-3 ml-0.5 bg-violet-400 dark:bg-violet-500 animate-pulse rounded-sm align-middle" />
            <span className="opacity-60">"</span>
          </p>
        </div>
      )}

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-3 ml-1 pl-4 border-l-2 border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-top-2 duration-200">
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
                        <div className="mt-2 prose prose-sm dark:prose-invert max-w-none text-xs bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
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

              {/* Agent Invocations - show when agents are called */}
              {agentInvocations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                    <ZapIcon className="w-3.5 h-3.5" />
                    <span>Agent Activity</span>
                  </div>
                  {agentInvocations.map((agent) => (
                    <ChainOfThoughtStep
                      key={agent.id}
                      icon={BotIcon}
                      label={
                        <span className="flex items-center gap-2">
                          <span>{agent.agent_icon}</span>
                          <span className="font-medium">{agent.agent_name}</span>
                          {agent.duration_ms && (
                            <span className="text-[10px] text-gray-400">
                              ({(agent.duration_ms / 1000).toFixed(1)}s)
                            </span>
                          )}
                        </span>
                      }
                      status={agent.status === 'invoking' ? 'active' : agent.status === 'completed' ? 'complete' : 'pending'}
                      className={
                        agent.status === 'invoking'
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : agent.status === 'completed'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }
                    >
                      <div className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <div className="italic mb-1">Task: {agent.task}</div>
                        {agent.response && (
                          <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded text-gray-600 dark:text-gray-300 max-h-32 overflow-y-auto">
                            <ReactMarkdown>
                              {agent.response.length > 300
                                ? agent.response.slice(0, 300) + '...'
                                : agent.response}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </ChainOfThoughtStep>
                  ))}
                </div>
              )}

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
  );
};

export const AIReasoning = memo(AIReasoningBase);

AIReasoning.displayName = 'AIReasoning';

export default AIReasoning;
