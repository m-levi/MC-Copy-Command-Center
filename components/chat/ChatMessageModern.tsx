'use client';

import { Message as MessageType, ConversationMode, AIStatus } from '@/types';
import { useState, useEffect, memo, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { stripCampaignTags } from '@/lib/campaign-parser';
import { logger } from '@/lib/logger';
import { cleanMessageContent } from '@/lib/chat-utils';
import { cn } from '@/lib/utils';
import { CopyIcon, RefreshCwIcon, ThumbsUpIcon, ThumbsDownIcon, CheckIcon, MessageSquareIcon, ChevronLeftIcon, ChevronRightIcon, Quote } from 'lucide-react';

// AI Elements imports
import {
  Message,
  MessageContent,
  MessageActions,
  MessageAction,
  MessageToolbar,
  MessageBranch,
  MessageBranchContent,
  MessageBranchSelector,
  MessageBranchPrevious,
  MessageBranchNext,
  MessageBranchPage,
} from '@/components/ai-elements/message';
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from '@/components/ai-elements/reasoning';

// Existing components
import InlineCommentBox from '../InlineCommentBox';
import { ChatMessageUser, ProductLinksSection } from '@/components/chat';
import SubjectLineGeneratorInline from '../SubjectLineGeneratorInline';

// Type for message versions (branches)
export interface MessageVersion {
  content: string;
  thinking?: string;
  timestamp: Date;
  metadata?: MessageType['metadata'];
}

interface ChatMessageModernProps {
  message: MessageType;
  brandId?: string;
  mode?: ConversationMode;
  onRegenerate?: () => void;
  onRegenerateSection?: (sectionType: string, sectionTitle: string) => void;
  onEdit?: (newContent: string) => void;
  onReaction?: (reaction: 'thumbs_up' | 'thumbs_down') => void;
  isRegenerating?: boolean;
  isStreaming?: boolean;
  aiStatus?: AIStatus;
  isStarred?: boolean;
  commentCount?: number;
  onCommentClick?: (highlightedText?: string) => void;
  commentedRanges?: Array<{ text: string; commentCount: number }>;
  conversationId?: string;
  commentsData?: Array<{ id: string; quoted_text?: string; content: string }>;
  /** Previous versions of this message (for branching) */
  previousVersions?: MessageVersion[];
  /** Callback when a branch is selected */
  onBranchSelect?: (version: MessageVersion) => void;
  /** Callback when user wants to quote selected text */
  onQuote?: (quotedText: string) => void;
}

type CommentHighlight = {
  text: string;
  count: number;
};

const ChatMessageModern = memo(function ChatMessageModern({
  message,
  brandId,
  mode = 'email_copy',
  onRegenerate,
  onRegenerateSection,
  onEdit,
  onReaction,
  isRegenerating = false,
  isStreaming = false,
  aiStatus = 'idle',
  isStarred: isStarredProp = false,
  commentCount = 0,
  onCommentClick,
  commentedRanges = [],
  conversationId,
  commentsData = [],
  previousVersions = [],
  onBranchSelect,
  onQuote,
}: ChatMessageModernProps) {
  const [copied, setCopied] = useState(false);
  const [reaction, setReaction] = useState<'thumbs_up' | 'thumbs_down' | null>(null);
  const [isStarred, setIsStarred] = useState(isStarredProp);
  const [isStarring, setIsStarring] = useState(false);
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionPosition, setSelectionPosition] = useState<{ x: number; y: number } | null>(null);
  const [showInlineCommentBox, setShowInlineCommentBox] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const supabase = createClient();

  // Ensure component is mounted for portal
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update local state when prop changes
  useEffect(() => {
    setIsStarred(isStarredProp);
  }, [isStarredProp]);

  const isUser = message.role === 'user';
  // Clean message content to handle any corrupted JSON streaming data
  // This fixes messages that were incorrectly saved with raw API response
  const messageContent = useMemo(() => {
    return cleanMessageContent(message.content);
  }, [message.content]);
  const productLinks = message.metadata?.productLinks || [];
  const formattedTimestamp = new Date(message.created_at).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  // Build inline highlights from comments
  const inlineHighlights = useMemo(() => {
    if (!commentsData || commentsData.length === 0) return [];

    const highlightMap = new Map<string, { text: string; count: number }>();

    commentsData.forEach((comment) => {
      let snippet = comment.quoted_text?.trim();
      if (!snippet) return;

      // Strip common prefixes
      const prefixesToStrip = [
        'Headline:',
        'Sub-headline:',
        'Section Title:',
        'Call to Action Button:',
        'CTA:',
      ];
      
      for (const prefix of prefixesToStrip) {
        if (snippet.toLowerCase().startsWith(prefix.toLowerCase())) {
          snippet = snippet.substring(prefix.length).trim();
          break;
        }
      }

      const key = snippet.toLowerCase();
      const existing = highlightMap.get(key);

      if (existing) {
        existing.count += 1;
      } else {
        highlightMap.set(key, { text: snippet, count: 1 });
      }
    });

    return Array.from(highlightMap.values());
  }, [commentsData]);

  // Handle copy
  const handleCopy = useCallback(async () => {
    const cleanContent = messageContent
      .replace(/^```\n?/gm, '')
      .replace(/\n?```$/gm, '')
      .trim();
    
    await navigator.clipboard.writeText(cleanContent);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  }, [messageContent]);

  // Handle text selection for commenting or quoting
  const handleTextSelection = useCallback((e: React.MouseEvent) => {
    if (!onCommentClick && !onQuote) return;
    
    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      
      if (text && text.length >= 2) {
        setSelectedText(text);
        
        try {
          const range = selection?.getRangeAt(0);
          const rect = range?.getBoundingClientRect();
          
          if (rect && rect.width > 0 && rect.height > 0) {
            const menuWidth = 200;
            const padding = 16;
            
            let x = rect.left + rect.width / 2;
            x = Math.max(padding + menuWidth / 2, Math.min(window.innerWidth - padding - menuWidth / 2, x));
            const y = Math.max(rect.top - 10, 80);
            
            setSelectionPosition({ x, y });
          }
        } catch (err) {
          // Silently fail
        }
      } else {
        setSelectedText('');
        setSelectionPosition(null);
      }
    }, 50);
  }, [onCommentClick, onQuote]);

  const handleCommentOnHighlight = useCallback(() => {
    if (selectedText) {
      setShowInlineCommentBox(true);
    }
  }, [selectedText]);

  const handleCommentPosted = useCallback(() => {
    setShowInlineCommentBox(false);
    setSelectedText('');
    setSelectionPosition(null);
    window.getSelection()?.removeAllRanges();
    setTimeout(() => {
      onCommentClick?.();
    }, 500);
  }, [onCommentClick]);

  // Close floating button when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.floating-comment-btn')) return;
      
      if (selectedText) {
        setSelectedText('');
        setSelectionPosition(null);
      }
    };

    const handleScroll = () => {
      if (selectedText) {
        setSelectedText('');
        setSelectionPosition(null);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [selectedText]);

  const handleReaction = useCallback((reactionType: 'thumbs_up' | 'thumbs_down') => {
    setReaction(reactionType);
    onReaction?.(reactionType);
    
    if (reactionType === 'thumbs_up') {
      toast.success('👍 Thanks for the feedback! This helps improve responses.');
    } else {
      toast('👎 Feedback noted. Try regenerating for a better result.', { icon: '💡' });
    }
  }, [onReaction]);

  // For user messages, use the existing split component
  if (isUser) {
    return <ChatMessageUser message={message} onEdit={onEdit} />;
  }

  // Render floating elements via portal
  const floatingElements = isMounted && typeof window !== 'undefined' ? createPortal(
    <>
      {/* Inline comment box */}
      {showInlineCommentBox && selectedText && selectionPosition && conversationId && (
        <InlineCommentBox
          position={{
            x: Math.min(selectionPosition.x + 150, window.innerWidth - 340),
            y: selectionPosition.y
          }}
          quotedText={selectedText}
          messageId={message.id}
          conversationId={conversationId}
          onClose={() => {
            setShowInlineCommentBox(false);
            setSelectedText('');
            setSelectionPosition(null);
            window.getSelection()?.removeAllRanges();
          }}
          onCommentAdded={handleCommentPosted}
        />
      )}

      {/* Floating selection menu */}
      {!showInlineCommentBox && selectionPosition && selectedText && (onCommentClick || onQuote) && (
        <div
          className="floating-comment-btn fixed"
          style={{
            left: `${selectionPosition.x}px`,
            top: `${selectionPosition.y}px`,
            transform: 'translate(-50%, -100%)',
            zIndex: 100000,
            pointerEvents: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            className="animate-in fade-in zoom-in-95 slide-in-from-bottom-3 duration-200"
            style={{ animationTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 to-orange-400/20 rounded-full blur-lg" />
              
              <div className="relative bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-stone-200/80 dark:border-gray-700/80 rounded-full shadow-xl shadow-stone-200/50 dark:shadow-gray-900/50 flex items-center p-1 gap-0.5">
                {onQuote && (
                  <button
                    onClick={() => {
                      onQuote(selectedText);
                      setSelectedText('');
                      setSelectionPosition(null);
                      window.getSelection()?.removeAllRanges();
                      toast.success('Text quoted - type your follow-up!');
                    }}
                    className="group flex items-center gap-2 pl-3 pr-4 py-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 transition-all duration-200 text-white font-medium text-sm shadow-sm hover:shadow-md"
                    title="Quote in chat"
                  >
                    <Quote className="w-4 h-4 transition-transform group-hover:scale-110" />
                    <span>Quote</span>
                  </button>
                )}
                
                {onCommentClick && (
                  <button
                    onClick={handleCommentOnHighlight}
                    className={`group flex items-center gap-2 pl-3 pr-4 py-2 rounded-full transition-all duration-200 font-medium text-sm ${
                      onQuote 
                        ? 'text-stone-600 dark:text-gray-300 hover:bg-stone-100 dark:hover:bg-gray-700'
                        : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm hover:shadow-md'
                    }`}
                    title="Add comment"
                  >
                    <MessageSquareIcon className="w-4 h-4 transition-transform group-hover:scale-110" />
                    <span>Comment</span>
                  </button>
                )}
                
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(selectedText);
                    toast.success('Copied!');
                    setSelectedText('');
                    setSelectionPosition(null);
                  }}
                  className="group flex items-center gap-1.5 px-3 py-2 rounded-full text-stone-600 dark:text-gray-300 hover:bg-stone-100 dark:hover:bg-gray-700 transition-all duration-200 text-sm font-medium"
                  title="Copy text"
                >
                  <CopyIcon className="w-4 h-4 transition-transform group-hover:scale-110" />
                  <span>Copy</span>
                </button>
              </div>
              
              <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-white dark:bg-gray-800 border-b border-r border-stone-200/80 dark:border-gray-700/80 rotate-45" />
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  ) : null;

  // Render content with inline highlights
  const renderContent = () => {
    const content = stripCampaignTags(messageContent || 'No content');
    
    // If we have highlights, wrap them
    if (inlineHighlights.length > 0) {
      let processedContent = content;
      
      inlineHighlights.forEach((highlight, idx) => {
        const regex = new RegExp(
          highlight.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
          'gi'
        );
        processedContent = processedContent.replace(regex, (match) => {
          return `{{HIGHLIGHT_${idx}_START}}${match}{{HIGHLIGHT_${idx}_END}}`;
        });
      });

      // Parse and render
      const parts: React.ReactNode[] = [];
      let remaining = processedContent;
      let key = 0;

      while (remaining.length > 0) {
        let earliestMatch: { index: number; highlightIdx: number; isStart: boolean } | null = null;

        inlineHighlights.forEach((_, idx) => {
          const startMarker = `{{HIGHLIGHT_${idx}_START}}`;
          const endMarker = `{{HIGHLIGHT_${idx}_END}}`;
          
          const startIdx = remaining.indexOf(startMarker);
          const endIdx = remaining.indexOf(endMarker);

          if (startIdx !== -1 && (!earliestMatch || startIdx < earliestMatch.index)) {
            earliestMatch = { index: startIdx, highlightIdx: idx, isStart: true };
          }
          if (endIdx !== -1 && (!earliestMatch || endIdx < earliestMatch.index)) {
            earliestMatch = { index: endIdx, highlightIdx: idx, isStart: false };
          }
        });

        if (!earliestMatch) {
          parts.push(<ReactMarkdown key={key++} components={{
            a: ({ node, ...props }: any) => (
              <a 
                {...props} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                {props.children}
              </a>
            )
          }}>{remaining}</ReactMarkdown>);
          break;
        }

        const match = earliestMatch as { index: number; highlightIdx: number; isStart: boolean };

        if (match.index > 0) {
          parts.push(<ReactMarkdown key={key++} components={{
            a: ({ node, ...props }: any) => (
              <a 
                {...props} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                {props.children}
              </a>
            )
          }}>{remaining.substring(0, match.index)}</ReactMarkdown>);
        }

        const marker = match.isStart
          ? `{{HIGHLIGHT_${match.highlightIdx}_START}}`
          : `{{HIGHLIGHT_${match.highlightIdx}_END}}`;

        if (match.isStart) {
          const endMarker = `{{HIGHLIGHT_${match.highlightIdx}_END}}`;
          const endIdx = remaining.indexOf(endMarker, match.index + marker.length);
          
          if (endIdx !== -1) {
            const highlightedText = remaining.substring(match.index + marker.length, endIdx);
            const highlight = inlineHighlights[match.highlightIdx];
            
            parts.push(
              <button
                key={key++}
                type="button"
                onClick={() => onCommentClick?.()}
                className="group/highlight inline text-inherit underline decoration-amber-400/60 dark:decoration-amber-500/50 decoration-dotted decoration-2 underline-offset-4 hover:decoration-amber-500 dark:hover:decoration-amber-400 hover:decoration-solid transition-all duration-150 cursor-pointer relative"
                title={`${highlight.count} comment${highlight.count > 1 ? 's' : ''} - Click to view`}
              >
                {highlightedText}
                <sup className="ml-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 opacity-70 group-hover/highlight:opacity-100 transition-opacity">
                  {highlight.count}
                </sup>
              </button>
            );
            
            remaining = remaining.substring(endIdx + endMarker.length);
            continue;
          }
        }

        remaining = remaining.substring(match.index + marker.length);
      }

      return <>{parts}</>;
    }

    return <ReactMarkdown components={{
      a: ({ node, ...props }: any) => (
        <a 
          {...props} 
          target="_blank" 
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          {props.children}
        </a>
      )
    }}>{content}</ReactMarkdown>;
  };

  return (
    <>
      {floatingElements}
      
      {/* Use AI Elements Message container - customized for full width minimal look */}
      <Message 
        from="assistant" 
        className="max-w-none w-full mb-6 sm:mb-8 animate-in fade-in slide-in-from-bottom-2 duration-300"
      >
        {/* Reasoning section using AI Elements */}
        {(message.thinking || isStreaming) && (
          <div className="px-4 sm:px-6 mb-4">
            <Reasoning 
              isStreaming={isStreaming}
              defaultOpen={isStreaming}
            >
              <ReasoningTrigger />
              <ReasoningContent>
                {message.thinking || ''}
              </ReasoningContent>
            </Reasoning>
          </div>
        )}

        {/* Message content - minimal styling */}
        <MessageContent 
          className="w-full bg-transparent p-0"
          onMouseUp={handleTextSelection}
        >
          {isStreaming && !messageContent ? (
            <div className="px-4 sm:px-6">
              <div className="space-y-3 animate-pulse">
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-full" />
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-5/6" />
              </div>
            </div>
          ) : (
            <div className="px-4 sm:px-6">
              <div className="relative group/content">
                {/* Floating action bar on hover */}
                {messageContent && !isStreaming && (
                  <div className="absolute top-2 right-2 z-10 opacity-0 group-hover/content:opacity-100 transition-opacity duration-200">
                    <MessageActions className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-1">
                      <MessageAction
                        tooltip="Copy"
                        onClick={handleCopy}
                      >
                        {copied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4" />}
                      </MessageAction>
                      {onRegenerate && (
                        <MessageAction
                          tooltip="Regenerate"
                          onClick={onRegenerate}
                          disabled={isRegenerating}
                        >
                          <RefreshCwIcon className={cn("w-4 h-4", isRegenerating && "animate-spin")} />
                        </MessageAction>
                      )}
                    </MessageActions>
                  </div>
                )}

                {/* Content wrapper - preserves existing email styling */}
                <div className={cn(
                  messageContent.includes('```') 
                    ? `bg-white dark:bg-gray-800 rounded-xl border shadow-sm overflow-hidden ${isStarred ? 'border-yellow-400 dark:border-yellow-500 ring-1 ring-yellow-200 dark:ring-yellow-900/30' : 'border-gray-200 dark:border-gray-700'}`
                    : 'bg-transparent border-0 shadow-none p-0',
                  'text-gray-900 dark:text-gray-100 transition-colors relative'
                )}>
                  <div className={cn(messageContent.includes('```') ? 'px-6 sm:px-8 py-6' : 'py-1')}>
                    <div 
                      className={cn(
                        "prose dark:prose-invert max-w-none select-text cursor-text",
                        "prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-gray-100",
                        "prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg",
                        "prose-p:text-[15px] sm:prose-p:text-base prose-p:leading-7 prose-p:text-gray-800 dark:prose-p:text-gray-200",
                        "prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-strong:font-semibold",
                        "prose-ul:list-disc prose-ul:ml-4 prose-ol:list-decimal prose-ol:ml-4",
                        "prose-li:text-gray-800 dark:prose-li:text-gray-200 prose-li:my-1.5",
                        "prose-code:text-[13px] prose-code:text-gray-800 dark:prose-code:text-gray-200",
                        "prose-pre:bg-gray-50 dark:prose-pre:bg-gray-900/50 prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-700 prose-pre:rounded-lg prose-pre:p-4",
                        "prose-blockquote:border-l-4 prose-blockquote:border-gray-300 dark:prose-blockquote:border-gray-600 prose-blockquote:pl-4 prose-blockquote:italic",
                        "prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline",
                        !messageContent.includes('```') && 'prose-p:my-2 prose-headings:mt-4 prose-headings:mb-2',
                        "text-gray-900 dark:text-gray-100"
                      )}
                      style={{
                        userSelect: 'text',
                        WebkitUserSelect: 'text',
                        MozUserSelect: 'text' as any,
                      }}
                    >
                      {renderContent()}
                    </div>
                  </div>

                  {/* Product Links */}
                  <ProductLinksSection productLinks={productLinks} />

                  {/* Subject Line Generator */}
                  {(messageContent.includes('```') || mode === 'email_copy') && (
                    <SubjectLineGeneratorInline emailContent={messageContent} />
                  )}
                </div>
              </div>
            </div>
          )}
        </MessageContent>

        {/* Footer toolbar with timestamp, branch selector, and reactions */}
        <MessageToolbar className="px-4 sm:px-6 mt-1 pt-2">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {formattedTimestamp}
            </span>
            
            {/* Branch selector - only show if there are previous versions */}
            {previousVersions.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <button
                  onClick={() => {
                    const prevIndex = previousVersions.length - 1;
                    if (prevIndex >= 0) {
                      onBranchSelect?.(previousVersions[prevIndex]);
                    }
                  }}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Previous version"
                >
                  <ChevronLeftIcon className="w-3.5 h-3.5" />
                </button>
                <span className="font-medium tabular-nums">
                  {previousVersions.length + 1} of {previousVersions.length + 1}
                </span>
                <button
                  disabled
                  className="p-1 rounded text-gray-300 dark:text-gray-600 cursor-not-allowed"
                  title="Latest version"
                >
                  <ChevronRightIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          
          <MessageActions className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {onReaction && (
              <>
                <MessageAction
                  tooltip="Helpful"
                  onClick={() => handleReaction('thumbs_up')}
                  className={cn(reaction === 'thumbs_up' && 'bg-gray-100 dark:bg-gray-800')}
                >
                  <ThumbsUpIcon 
                    className={cn("w-4 h-4", reaction === 'thumbs_up' ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400')} 
                    fill={reaction === 'thumbs_up' ? 'currentColor' : 'none'}
                  />
                </MessageAction>
                <MessageAction
                  tooltip="Not helpful"
                  onClick={() => handleReaction('thumbs_down')}
                  className={cn(reaction === 'thumbs_down' && 'bg-gray-100 dark:bg-gray-800')}
                >
                  <ThumbsDownIcon 
                    className={cn("w-4 h-4", reaction === 'thumbs_down' ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400')} 
                    fill={reaction === 'thumbs_down' ? 'currentColor' : 'none'}
                  />
                </MessageAction>
              </>
            )}
          </MessageActions>
        </MessageToolbar>

        {/* Comment count badge */}
        {onCommentClick && commentCount > 0 && (
          <div className="px-4 sm:px-6 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => onCommentClick()}
              className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
            >
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30">
                <MessageSquareIcon className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                <span className="font-bold text-blue-700 dark:text-blue-300">{commentCount}</span>
              </div>
              <span className="font-medium">{commentCount === 1 ? '1 comment' : `${commentCount} comments`}</span>
            </button>
          </div>
        )}
      </Message>
    </>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.thinking === nextProps.message.thinking &&
    JSON.stringify(prevProps.message.metadata) === JSON.stringify(nextProps.message.metadata) &&
    prevProps.isRegenerating === nextProps.isRegenerating &&
    prevProps.isStreaming === nextProps.isStreaming &&
    prevProps.mode === nextProps.mode &&
    prevProps.brandId === nextProps.brandId &&
    prevProps.commentCount === nextProps.commentCount &&
    prevProps.commentsData?.length === nextProps.commentsData?.length &&
    prevProps.onCommentClick === nextProps.onCommentClick &&
    prevProps.previousVersions?.length === nextProps.previousVersions?.length
  );
});

export default ChatMessageModern;
