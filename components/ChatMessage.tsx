'use client';

import { Message, ConversationMode, AIStatus } from '@/types';
import { useState, useEffect, memo, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AIReasoning } from './chat/AIReasoning';
import InlineCommentBox from './InlineCommentBox';
import { ChatMessageUser, ChatMessageActions, ProductLinksSection, EmailVersionRenderer, StructuredEmailRenderer, isStructuredEmailCopy } from './chat';
// Note: FlowUIRenderer temporarily removed - needs reconnection when flow feature is re-enabled
import SubjectLineGeneratorInline from './SubjectLineGeneratorInline';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { stripCampaignTags } from '@/lib/campaign-parser';
import { hasFlowMarkers, FlowPlan } from '@/lib/flow-ui-parser';
import { hasEmailVersionMarkers } from '@/lib/email-version-parser';
import { logger } from '@/lib/logger';
import { visit } from 'unist-util-visit';

interface ChatMessageProps {
  message: Message;
  brandId?: string;
  mode?: ConversationMode;
  onRegenerate?: () => void;
  onRegenerateSection?: (sectionType: string, sectionTitle: string) => void;
  onEdit?: (newContent: string) => void;
  onReaction?: (reaction: 'thumbs_up' | 'thumbs_down') => void;
  isRegenerating?: boolean;
  isStreaming?: boolean;
  aiStatus?: AIStatus;
  isStarred?: boolean; // Passed from parent to avoid DB query per message
  commentCount?: number;
  onCommentClick?: (highlightedText?: string) => void;
  commentedRanges?: Array<{ text: string; commentCount: number }>; // Text ranges that have comments
  conversationId?: string;
  commentsData?: Array<{ id: string; quoted_text?: string; content: string }>; // Actual comment data for inline display
  // Flow-related props
  onFlowSuggestionClick?: (suggestion: string) => void;
  onFlowApprove?: (plan: FlowPlan) => void;
  onFlowModify?: (plan: FlowPlan) => void;
  isGeneratingFlow?: boolean;
  flowApprovalState?: 'pending' | 'approved' | 'rejected';
  // Reference in chat - allows users to quote selected text in their next message
  onReferenceInChat?: (selectedText: string) => void;
  // Message grouping - for consecutive messages from same user
  isGrouped?: boolean;
}

// Memoized component to prevent unnecessary re-renders
type CommentHighlight = {
  text: string;
  count: number;
};

const createCommentHighlightPlugin = (highlights: CommentHighlight[]) => {
  const normalized = highlights.map((highlight) => ({
    ...highlight,
    textLower: highlight.text.toLowerCase(),
  }));

  return () => (tree: any) => {
    if (!normalized.length) {
      return;
    }

    let matchCount = 0;

    visit(tree, 'text', (node: any, index: number | undefined, parent: any) => {
      if (!parent || typeof node.value !== 'string') return;

      const originalValue = node.value as string;
      const lowerValue = originalValue.toLowerCase();
      
      const newNodes: any[] = [];
      let cursor = 0;

      while (cursor < originalValue.length) {
        let nextMatch: { start: number; highlight: typeof normalized[number] } | null = null;

        for (const highlight of normalized) {
          const matchIndex = lowerValue.indexOf(highlight.textLower, cursor);
          
          if (matchIndex === -1) continue;

          if (!nextMatch || matchIndex < nextMatch.start) {
            nextMatch = { start: matchIndex, highlight };
          }
        }

        if (!nextMatch) {
          newNodes.push({ type: 'text', value: originalValue.slice(cursor) });
          break;
        }

        if (nextMatch.start > cursor) {
          newNodes.push({
            type: 'text',
            value: originalValue.slice(cursor, nextMatch.start),
          });
        }

        const highlightText = originalValue.slice(
          nextMatch.start,
          nextMatch.start + nextMatch.highlight.text.length
        );

        newNodes.push({
          type: 'highlight',
          data: {
            hName: 'mark',
            hProperties: {
              'data-count': nextMatch.highlight.count,
              'data-text': nextMatch.highlight.text,
            },
          },
          children: [{ type: 'text', value: highlightText }],
        });

        matchCount++;
        cursor = nextMatch.start + nextMatch.highlight.text.length;
      }

      if (newNodes.length > 1) {
        parent.children.splice(index as number, 1, ...newNodes);
        return (index as number) + newNodes.length;
      }
    });
  };
};

const ChatMessage = memo(function ChatMessage({
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
  isStarred: isStarredProp = false, // Use prop instead of checking in component
  commentCount = 0,
  onCommentClick,
  commentedRanges = [],
  conversationId,
  commentsData = [],
  // Flow-related props
  onFlowSuggestionClick,
  onFlowApprove,
  onFlowModify,
  isGeneratingFlow = false,
  flowApprovalState = 'pending',
  // Reference in chat
  onReferenceInChat,
  // Message grouping
  isGrouped = false,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [reaction, setReaction] = useState<'thumbs_up' | 'thumbs_down' | null>(null);
  const [isStarred, setIsStarred] = useState(isStarredProp);
  const [isStarring, setIsStarring] = useState(false);
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionPosition, setSelectionPosition] = useState<{ x: number; y: number } | null>(null);
  const [showInlineCommentBox, setShowInlineCommentBox] = useState(false);
  const [forceRender, setForceRender] = useState(0); // Force re-render
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
  
  // Determine mode for display logic
  const isEmailMode = mode === 'email_copy';
  const isPlanningMode = mode === 'planning';
  const isFlowMode = mode === 'flow';
  const responseType = message.metadata?.responseType || (isEmailMode ? 'email_copy' : 'other');
  const productLinks = message.metadata?.productLinks || [];
  const canStar = responseType === 'email_copy';
  const messageContent = message.content ?? '';
  const showEmailPreview = responseType === 'email_copy' && !!messageContent;
  const formattedTimestamp = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  // Check if content has flow UI markers (suggestions, plan, confirm)
  const hasFlowContent = useMemo(() => {
    return isFlowMode && messageContent && hasFlowMarkers(messageContent);
  }, [isFlowMode, messageContent]);
  
  // Check if content has email version markers (version_a, version_b, version_c)
  const hasVersionedContent = useMemo(() => {
    return messageContent && hasEmailVersionMarkers(messageContent);
  }, [messageContent]);
  
  // Check if content is structured email copy (has [HERO], [TEXT], etc. markers)
  const hasStructuredEmailContent = useMemo(() => {
    return !isStreaming && messageContent && isStructuredEmailCopy(messageContent);
  }, [messageContent, isStreaming]);
  
  const inlineHighlights = useMemo(() => {
    if (!commentsData || commentsData.length === 0) return [];

    const highlightMap = new Map<string, { text: string; count: number }>();

    // Helper to strip markdown formatting
    const stripMarkdown = (text: string) => text
      .replace(/\*\*([^*]+)\*\*/g, '$1')  // **bold** -> bold
      .replace(/\*([^*]+)\*/g, '$1')      // *italic* -> italic
      .replace(/`([^`]+)`/g, '$1')        // `code` -> code
      .replace(/^#+\s+/gm, '')            // # headings -> headings
      .replace(/^[-*+]\s+/gm, '')         // - list items -> list items
      .replace(/^\d+\.\s+/gm, '')         // 1. numbered list -> numbered list
      .trim();

    // Helper to strip common prefixes
    const stripPrefixes = (text: string) => {
      const prefixesToStrip = [
        'Headline:',
        'Sub-headline:',
        'Section Title:',
        'Call to Action Button:',
        'CTA:',
        'Content:',
      ];
      
      for (const prefix of prefixesToStrip) {
        if (text.toLowerCase().startsWith(prefix.toLowerCase())) {
          return text.substring(prefix.length).trim();
        }
      }
      return text;
    };

    // Helper to add a variant to the highlight map
    const addVariant = (text: string, countIncrement: number) => {
      if (!text || text.length < 3) return;
      const key = text.toLowerCase();
      const existing = highlightMap.get(key);
      if (existing) {
        existing.count += countIncrement;
      } else {
        highlightMap.set(key, { text, count: countIncrement });
      }
    };

    commentsData.forEach((comment) => {
      const original = comment.quoted_text?.trim();
      if (!original) return;

      // Try multiple variations to maximize match chances:
      // 1. Original text as-is (for raw text content)
      addVariant(original, 1);

      // 2. With markdown stripped (for rendered markdown content)
      const withoutMarkdown = stripMarkdown(original);
      if (withoutMarkdown !== original) {
        addVariant(withoutMarkdown, 0); // Don't double count, just add variant
      }

      // 3. With prefixes stripped 
      const withoutPrefixes = stripPrefixes(withoutMarkdown);
      if (withoutPrefixes !== withoutMarkdown) {
        addVariant(withoutPrefixes, 0);
      }

      // 4. Just the main content without list markers and prefixes
      const mainContent = stripPrefixes(stripMarkdown(original.replace(/^[-*+]\s+/, '')));
      if (mainContent !== withoutPrefixes && mainContent !== withoutMarkdown) {
        addVariant(mainContent, 0);
      }
    });

    return Array.from(highlightMap.values());
  }, [commentsData]);

  const remarkPlugins = useMemo(() => {
    if (!inlineHighlights.length) {
      return [];
    }
    return [createCommentHighlightPlugin(inlineHighlights)];
  }, [inlineHighlights]);

  // Helper function to highlight text in a string
  const highlightTextInContent = useCallback((content: string): React.ReactNode => {
    if (!inlineHighlights.length || !content) return content;

    // Build a regex pattern from all highlights
    const patterns = inlineHighlights
      .map(h => h.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) // Escape regex special chars
      .filter(p => p.length >= 3) // Only match meaningful strings
      .sort((a, b) => b.length - a.length); // Longer matches first
    
    if (!patterns.length) return content;
    
    const regex = new RegExp(`(${patterns.join('|')})`, 'gi');
    const parts = content.split(regex);
    
    if (parts.length === 1) return content; // No matches
    
    return parts.map((part, index) => {
      const highlight = inlineHighlights.find(
        h => h.text.toLowerCase() === part.toLowerCase()
      );
      
      if (highlight) {
        return (
          <span
            key={index}
            role="button"
            tabIndex={0}
            onClick={() => onCommentClick?.()}
            onKeyDown={(e) => e.key === 'Enter' && onCommentClick?.()}
            className="group/highlight underline decoration-amber-400 dark:decoration-amber-500 decoration-dotted decoration-2 underline-offset-2 hover:decoration-amber-500 dark:hover:decoration-amber-400 hover:decoration-solid cursor-pointer bg-amber-100/60 dark:bg-amber-900/30 rounded-sm"
            style={{ display: 'inline', textAlign: 'inherit' }}
            title={`${highlight.count} comment${highlight.count > 1 ? 's' : ''} - Click to view`}
          >
            {part}
            <sup className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
              {highlight.count}
            </sup>
          </span>
        );
      }
      return part;
    });
  }, [inlineHighlights, onCommentClick]);

  const markdownComponents = useMemo(() => ({
    mark: ({ node, ...props }: any) => {
      const count = props['data-count'];
      
      return (
        <span
          role="button"
          tabIndex={0}
          onClick={() => onCommentClick?.()}
          onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && onCommentClick?.()}
          className="group/highlight underline decoration-amber-400 dark:decoration-amber-500 decoration-dotted decoration-2 underline-offset-2 hover:decoration-amber-500 dark:hover:decoration-amber-400 hover:decoration-solid cursor-pointer bg-amber-100/60 dark:bg-amber-900/30 rounded-sm"
          style={{ display: 'inline', textAlign: 'inherit' }}
          title={`${count} comment${count > 1 ? 's' : ''} - Click to view`}
        >
          {props.children}
          <sup className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
            {count}
          </sup>
        </span>
      );
    },
    // Custom code component to highlight text inside code blocks (email copy)
    code: ({ node, inline, className, children, ...props }: any) => {
      const content = String(children).replace(/\n$/, '');
      
      // For inline code, just render normally
      if (inline) {
        return <code className={className} {...props}>{children}</code>;
      }
      
      // For code blocks, apply highlighting to the content
      const highlightedContent = highlightTextInContent(content);
      
      // Check if any highlighting was applied
      const hasHighlights = typeof highlightedContent !== 'string';
      
      if (hasHighlights) {
        return (
          <code className={className} {...props}>
            <span style={{ whiteSpace: 'pre-wrap' }}>{highlightedContent}</span>
          </code>
        );
      }
      
      return <code className={className} {...props}>{children}</code>;
    },
    // Custom pre component to handle code blocks
    pre: ({ node, children, ...props }: any) => {
      return (
        <pre {...props} style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
          {children}
        </pre>
      );
    },
    // Add custom renderer for links to ensure they open in new tab
    a: ({ node, ...props }: any) => {
      return (
        <a 
          {...props} 
          target="_blank" 
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          {props.children}
        </a>
      );
    },
    // Custom paragraph and text handlers to apply highlighting
    p: ({ node, children, ...props }: any) => {
      // If children is a string, try to highlight it
      if (typeof children === 'string') {
        return <p {...props}>{highlightTextInContent(children)}</p>;
      }
      return <p {...props}>{children}</p>;
    },
  }), [onCommentClick, highlightTextInContent]);

  const handleCopy = async () => {
    // Strip markdown code block backticks for cleaner copying
    const cleanContent = messageContent
      .replace(/^```\n?/gm, '') // Remove opening backticks
      .replace(/\n?```$/gm, '') // Remove closing backticks
      .trim();
    
    await navigator.clipboard.writeText(cleanContent);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle text selection for highlighting, commenting, and referencing in chat
  const handleTextSelection = (e: React.MouseEvent) => {
    if (!onCommentClick && !onReferenceInChat) return;
    
    // Small delay to ensure selection is complete
    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      
      // Minimum 2 characters for selection (allows short words)
      if (text && text.length >= 2) {
        setSelectedText(text);
        
        // Get selection position for floating menu
        try {
          const range = selection?.getRangeAt(0);
          const rect = range?.getBoundingClientRect();
          
          if (rect && rect.width > 0 && rect.height > 0) {
            // Calculate position - center horizontally, above selection
            // Account for viewport edges to keep menu visible
            const menuWidth = 200; // Approximate menu width
            const padding = 16;
            
            let x = rect.left + rect.width / 2;
            // Keep within viewport
            x = Math.max(padding + menuWidth / 2, Math.min(window.innerWidth - padding - menuWidth / 2, x));
            
            // Position above selection with some padding
            // Ensure minimum distance from top of viewport
            const y = Math.max(rect.top - 10, 80);
            
            setSelectionPosition({ x, y });
            setForceRender(prev => prev + 1);
          }
        } catch (err) {
          // Silently fail - selection might be invalid
        }
      } else {
        setSelectedText('');
        setSelectionPosition(null);
      }
    }, 50); // Reduced delay for snappier response
  };

  const handleCommentOnHighlight = () => {
    if (selectedText) {
      // Show inline comment box instead of opening sidebar
      setShowInlineCommentBox(true);
    }
  };

  const handleCommentPosted = () => {
    // Clear inline comment box
    setShowInlineCommentBox(false);
    setSelectedText('');
    setSelectionPosition(null);
    window.getSelection()?.removeAllRanges();
    // Trigger parent to reload comment counts immediately
    // Realtime subscription will also catch this, but manual trigger ensures fastest update
    onCommentClick?.();
  };

  // Close floating button when clicking outside or scrolling
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Don't clear if clicking the comment button itself
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
    window.addEventListener('scroll', handleScroll, true); // Capture phase for all scrolls
    return () => {
      document.removeEventListener('click', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [selectedText]);

  const handleReaction = (reactionType: 'thumbs_up' | 'thumbs_down') => {
    setReaction(reactionType);
    onReaction?.(reactionType);
    
    // Show feedback toast
    if (reactionType === 'thumbs_up') {
      toast.success('👍 Thanks for the feedback! This helps improve responses.');
    } else {
      toast('👎 Feedback noted. Try regenerating for a better result.', {
        icon: '💡',
      });
    }
  };

  // Star status is now passed as prop from parent - no DB query needed here

  // Toggle star status with optimistic update
  const handleToggleStar = async () => {
    if (!brandId) {
      toast.error('Unable to star email');
      return;
    }

    // Store previous state for rollback
    const wasStarred = isStarred;
    
    // Optimistic update - update UI immediately
    setIsStarred(!wasStarred);
    setIsStarring(true);

    try {
      if (wasStarred) {
        // Unstar
        const { data: existingDocs } = await supabase
          .from('brand_documents')
          .select('id')
          .eq('brand_id', brandId)
          .eq('doc_type', 'example')
          .eq('content', messageContent)
          .limit(1);

        if (existingDocs && existingDocs.length > 0) {
          await supabase
            .from('brand_documents')
            .delete()
            .eq('id', existingDocs[0].id);
        }

        toast.success('Email unstarred');
      } else {
        // Check limit before starring
        const { data: starredEmails } = await supabase
          .from('brand_documents')
          .select('id')
          .eq('brand_id', brandId)
          .eq('doc_type', 'example');

        const count = starredEmails?.length || 0;
        
        if (count >= 10) {
          // Revert optimistic update
          setIsStarred(wasStarred);
          toast.error('You\'ve reached the limit of 10 starred emails. Go to Settings to remove some.', {
            duration: 5000,
          });
          setIsStarring(false);
          return;
        }

        // Star the email
        const firstLine = messageContent.split('\n')[0]
          .replace(/^#+\s*/, '')
          .replace(/EMAIL SUBJECT LINE:|SUBJECT:/gi, '')
          .trim()
          .substring(0, 100);

        const title = firstLine || 'Email Copy';

        const response = await fetch('/api/embeddings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brandId,
            docType: 'example',
            title,
            content: messageContent,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to star email');
        }

        toast.success(`Email starred! (${count + 1}/10)`);
      }
    } catch (error) {
      // Revert optimistic update on error
      setIsStarred(wasStarred);
      logger.error('Error toggling star:', error);
      toast.error('Failed to update email');
    } finally {
      setIsStarring(false);
    }
  };

  const isUser = message.role === 'user';

  // Render floating elements via portal to avoid CSS containment clipping
  const floatingElements = isMounted && typeof window !== 'undefined' ? createPortal(
    <>
      {/* Inline comment box - appears when user clicks "Comment" */}
      {showInlineCommentBox && selectedText && selectionPosition && conversationId && (
        <InlineCommentBox
          position={{
            x: Math.min(selectionPosition.x + 150, window.innerWidth - 340), // Keep on screen
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

      {/* Floating selection menu - Premium pill design */}
      {!showInlineCommentBox && selectionPosition && selectedText && (onCommentClick || onReferenceInChat) && (
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
          {/* Container with spring animation */}
          <div 
            className="animate-in fade-in zoom-in-95 slide-in-from-bottom-3 duration-200"
            style={{ animationTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          >
            {/* Pill-shaped menu with glassmorphism */}
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 to-orange-400/20 rounded-full blur-lg"></div>
              
              {/* Main pill */}
              <div className="relative bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-stone-200/80 dark:border-gray-700/80 rounded-full shadow-xl shadow-stone-200/50 dark:shadow-gray-900/50 flex items-center p-1 gap-0.5">
                {/* Reference in Chat button - Primary action */}
                {onReferenceInChat && (
                  <button
                    onClick={() => {
                      onReferenceInChat(selectedText);
                      toast.success('Quote added – type your feedback below', { 
                        icon: '💬',
                        duration: 2500 
                      });
                      setSelectedText('');
                      setSelectionPosition(null);
                      window.getSelection()?.removeAllRanges();
                    }}
                    className="group flex items-center gap-2 pl-3 pr-4 py-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 transition-all duration-200 text-white font-medium text-sm shadow-sm hover:shadow-md"
                    title="Reference this text in your next message"
                  >
                    <svg className="w-4 h-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <span>Quote</span>
                  </button>
                )}
                
                {/* Comment button */}
                {onCommentClick && (
                  <button
                    onClick={handleCommentOnHighlight}
                    className={`group flex items-center gap-1.5 px-3 py-2 rounded-full transition-all duration-200 text-sm font-medium ${
                      onReferenceInChat 
                        ? 'text-stone-600 dark:text-gray-300 hover:bg-stone-100 dark:hover:bg-gray-700' 
                        : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm hover:shadow-md pl-3 pr-4 gap-2'
                    }`}
                    title="Add comment"
                  >
                    <svg className="w-4 h-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    <span>Comment</span>
                  </button>
                )}
                
                {/* Copy button */}
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
                  <svg className="w-4 h-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Copy</span>
                </button>
              </div>
              
              {/* Arrow pointer */}
              <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-white dark:bg-gray-800 border-b border-r border-stone-200/80 dark:border-gray-700/80 rotate-45"></div>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  ) : null;

  // For user messages, use the split component
  if (isUser) {
    return (
      <ChatMessageUser 
        message={message}
        onEdit={onEdit}
        isGrouped={isGrouped}
      />
    );
  }

  return (
    <>
      {floatingElements}
      
      <div 
        className="flex w-full justify-start mb-6 sm:mb-8 group animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-backwards"
      >
      <div className="flex flex-col w-full">
        <div className="transition-all w-full">
          {(
            <div onMouseUp={handleTextSelection}>
              {/* AI Reasoning - Show thinking/reasoning content with AI Elements */}
              {(message.thinking || isStreaming) && (
                <div className="px-4 sm:px-6 mb-4">
                  <AIReasoning 
                    thinking={message.thinking} 
                    isStreaming={isStreaming}
                    aiStatus={aiStatus}
                    defaultOpen={isStreaming}
                  />
                </div>
              )}

              {/* Message Content - Unified Markdown Rendering */}
              {isStreaming && !messageContent ? (
                <div className="px-4 sm:px-6">
                  <div className="space-y-3 animate-pulse">
                    <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-full"></div>
                    <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-5/6"></div>
                  </div>
                </div>
              ) : (
                <div className="px-4 sm:px-6">
                  <div className="relative group/content">
                    {/* Floating Action Bar (Desktop: Hover, Mobile: Always visible) */}
                    {!isUser && messageContent && !isStreaming && (
                      <div className="absolute bottom-2 right-2 z-10 opacity-100 sm:opacity-0 sm:group-hover/content:opacity-100 transition-opacity duration-200 flex items-center gap-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-1">
                        <button
                          onClick={handleCopy}
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
                    )}

                    <div className={`${
                      messageContent.includes('```') 
                        ? `bg-white dark:bg-gray-800 rounded-xl border shadow-sm overflow-hidden ${isStarred ? 'border-yellow-400 dark:border-yellow-500 ring-1 ring-yellow-200 dark:ring-yellow-900/30' : 'border-gray-200 dark:border-gray-700'}`
                        : 'bg-transparent border-0 shadow-none p-0'
                    } text-gray-900 dark:text-gray-100 transition-colors relative`}>

                  {/* Detect if content is email copy (contains code blocks) */}
                  {messageContent.includes('```') && (
                    /* Removed sticky header for simpler, minimal UI */
                    <div className="sr-only">Email Draft</div>
                  )}
                  
                  {/* Content area */}
                  <div className={`${messageContent.includes('```') && !hasFlowContent && !hasVersionedContent && !hasStructuredEmailContent ? 'px-6 sm:px-8 py-6' : 'py-1'}`}>
                    {/* NOTE: FlowUIRenderer temporarily disabled - component interface was refactored
                        and needs to be reconnected when flow feature is re-enabled.
                        The component now expects flowOutline: FlowOutline instead of content string. */}
                    {hasVersionedContent ? (
                      /* Render Email Version UI for versioned email content (version_a, version_b, version_c) */
                      <div className="py-4">
                        <EmailVersionRenderer
                          content={stripCampaignTags(messageContent)}
                          remarkPlugins={remarkPlugins}
                          markdownComponents={markdownComponents}
                          isStreaming={isStreaming}
                        />
                      </div>
                    ) : hasStructuredEmailContent ? (
                      /* Render Structured Email UI for email copy with [HERO], [TEXT], etc. markers */
                      <div className="px-4 sm:px-6 py-4">
                        <StructuredEmailRenderer
                          content={stripCampaignTags(messageContent)}
                          onCopy={() => toast.success('Copied to clipboard!')}
                        />
                      </div>
                    ) : (
                      <div 
                        className={`prose dark:prose-invert max-w-none select-text cursor-text comment-selection-area
                        prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-gray-100
                        prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg 
                        prose-p:text-[15px] sm:prose-p:text-base prose-p:leading-7 prose-p:text-gray-800 dark:prose-p:text-gray-200
                        prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-strong:font-semibold
                        prose-ul:list-disc prose-ul:ml-4 prose-ol:list-decimal prose-ol:ml-4
                        prose-li:text-gray-800 dark:prose-li:text-gray-200 prose-li:my-1.5
                        prose-code:text-[13px] prose-code:text-gray-800 dark:prose-code:text-gray-200 
                        prose-pre:bg-gray-50 dark:prose-pre:bg-gray-900/50 prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-700 prose-pre:rounded-lg prose-pre:p-4
                        prose-blockquote:border-l-4 prose-blockquote:border-gray-300 dark:prose-blockquote:border-gray-600 prose-blockquote:pl-4 prose-blockquote:italic
                        prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
                        ${!messageContent.includes('```') ? 'prose-p:my-2 prose-headings:mt-4 prose-headings:mb-2' : ''}
                        text-gray-900 dark:text-gray-100`}
                        style={{
                          userSelect: 'text',
                          WebkitUserSelect: 'text',
                          MozUserSelect: 'text',
                        }}
                      >
                        <ReactMarkdown
                          remarkPlugins={remarkPlugins}
                          components={markdownComponents}
                        >
                          {stripCampaignTags(messageContent || 'No content')}
                        </ReactMarkdown>
                      </div>
                    )}
                    
                    {/* Commented text snippets removed - now shown inline as highlights */}
                  </div>
                  
                  {/* Product Links Section - Using split component */}
                  <ProductLinksSection productLinks={productLinks} />

                  {/* Inline Subject Line Generator - Only for email drafts */}
                  {!isUser && (messageContent.includes('```') || mode === 'email_copy') && (
                    <SubjectLineGeneratorInline emailContent={messageContent} />
                  )}
                  </div>
                  </div>
                </div>
              )}

              {/* Action Bar - Removed (Replaced by floating actions) */}
              <div className="px-4 sm:px-6">
                <div className={`flex items-center justify-between mt-1 pt-2`}>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {formattedTimestamp}
                </span>
                {/* Feedback only at bottom now */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {onReaction && (
                    <>
                      <button
                        onClick={() => handleReaction('thumbs_up')}
                        className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer ${reaction === 'thumbs_up' ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                        title="Helpful"
                      >
                        <svg className={`w-4 h-4 ${reaction === 'thumbs_up' ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400'}`} fill={reaction === 'thumbs_up' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleReaction('thumbs_down')}
                        className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer ${reaction === 'thumbs_down' ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                        title="Not helpful"
                      >
                        <svg className={`w-4 h-4 ${reaction === 'thumbs_down' ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400'}`} fill={reaction === 'thumbs_down' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
                </div>
              </div>

              {/* Product Links Section - Now integrated into EmailPreview component */}
            </div>
          )}

          {/* Small comment count badge at bottom - only if comments exist */}
          {onCommentClick && commentCount > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => onCommentClick()}
                className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
              >
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30">
                  <svg className="w-3 h-3 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                  <span className="font-bold text-blue-700 dark:text-blue-300">{commentCount}</span>
                </div>
                <span className="font-medium">{commentCount === 1 ? '1 comment' : `${commentCount} comments`}</span>
              </button>
            </div>
          )}
        </div>
        
        {/* USER META + ACTIONS - visible on hover (desktop), always visible on mobile */}
        {isUser && (
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
            <span>{formattedTimestamp}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                title="Copy message"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </button>
            </div>
          </div>
        )}
        
      </div>
      </div>
    </>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memo optimization
  // NOTE: We're NOT comparing internal state like selectedText - that should always trigger re-render
  
  // Deep compare commentsData to detect changes in highlighted text
  const commentsDataEqual = () => {
    const prev = prevProps.commentsData || [];
    const next = nextProps.commentsData || [];
    if (prev.length !== next.length) return false;
    // Compare by IDs and quoted_text for highlight changes
    return prev.every((p, i) => 
      p.id === next[i]?.id && p.quoted_text === next[i]?.quoted_text
    );
  };
  
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.thinking === nextProps.message.thinking &&
    JSON.stringify(prevProps.message.metadata) === JSON.stringify(nextProps.message.metadata) &&
    prevProps.isRegenerating === nextProps.isRegenerating &&
    prevProps.isGrouped === nextProps.isGrouped &&
    prevProps.mode === nextProps.mode &&
    prevProps.brandId === nextProps.brandId &&
    prevProps.commentCount === nextProps.commentCount &&
    commentsDataEqual() && // Deep compare for highlight updates
    prevProps.onCommentClick === nextProps.onCommentClick
  );
});

export default ChatMessage;
