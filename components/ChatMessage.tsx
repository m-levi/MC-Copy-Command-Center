'use client';

import { Message, ConversationMode, AIStatus } from '@/types';
import { useState, useEffect, memo, useMemo } from 'react';
import { createPortal } from 'react-dom';
import MessageEditor from './MessageEditor';
import ThoughtProcess from './ThoughtProcess';
import InlineCommentBox from './InlineCommentBox';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { stripCampaignTags } from '@/lib/campaign-parser';
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
      if (typeof window !== 'undefined') {
        console.log('[Remark Plugin] No highlights to process');
      }
      return;
    }

    if (typeof window !== 'undefined') {
      console.log('[Remark Plugin] Processing with', normalized.length, 'highlights:', normalized);
    }

    let matchCount = 0;

    visit(tree, 'text', (node: any, index: number | null, parent: any) => {
      if (!parent || typeof node.value !== 'string') return;

      const originalValue = node.value as string;
      const lowerValue = originalValue.toLowerCase();
      const newNodes: any[] = [];
      let cursor = 0;

      // Debug: Log every text node being examined
      if (typeof window !== 'undefined' && originalValue.length > 10) {
        console.log('[Remark Plugin] Examining text node:', originalValue.substring(0, 80) + '...');
      }

      while (cursor < originalValue.length) {
        let nextMatch: { start: number; highlight: typeof normalized[number] } | null = null;

        for (const highlight of normalized) {
          const matchIndex = lowerValue.indexOf(highlight.textLower, cursor);
          
          if (typeof window !== 'undefined' && matchIndex !== -1) {
            console.log('[Remark Plugin] ✅ FOUND MATCH at index', matchIndex, 'in text:', originalValue.substring(0, 80));
          }
          
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
          type: 'commentHighlight',
          value: highlightText,
          data: {
            text: nextMatch.highlight.text,
            count: nextMatch.highlight.count,
          },
        });

        matchCount++;
        cursor = nextMatch.start + nextMatch.highlight.text.length;
      }

      if (newNodes.length > 1) {
        parent.children.splice(index as number, 1, ...newNodes);
        return (index as number) + newNodes.length;
      }
    });

    if (typeof window !== 'undefined' && matchCount > 0) {
      console.log('[Remark Plugin] Created', matchCount, 'commentHighlight nodes');
    }
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
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [reaction, setReaction] = useState<'thumbs_up' | 'thumbs_down' | null>(null);
  const [isStarred, setIsStarred] = useState(isStarredProp);
  const [isStarring, setIsStarring] = useState(false);
  const [productLinksExpanded, setProductLinksExpanded] = useState(false);
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
  
  // Debug: Log state changes (comment out in production)
  // useEffect(() => {
  //   console.log('[ChatMessage State Update]', {
  //     selectedText,
  //     selectionPosition,
  //     hasHandler: !!onCommentClick,
  //     isMounted
  //   });
  // }, [selectedText, selectionPosition, onCommentClick, isMounted]);
  
  // Update local state when prop changes
  useEffect(() => {
    setIsStarred(isStarredProp);
  }, [isStarredProp]);
  
  // Determine mode for display logic
  const isEmailMode = mode === 'email_copy';
  const isPlanningMode = mode === 'planning';
  const responseType = message.metadata?.responseType || (isEmailMode ? 'email_copy' : 'other');
  const productLinks = message.metadata?.productLinks || [];
  const canStar = responseType === 'email_copy';
  const messageContent = message.content ?? '';
  const showEmailPreview = responseType === 'email_copy' && !!messageContent;
  const formattedTimestamp = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const inlineHighlights = useMemo(() => {
    if (!commentsData || commentsData.length === 0) return [];

    const highlightMap = new Map<string, { text: string; count: number }>();

    commentsData.forEach((comment) => {
      let snippet = comment.quoted_text?.trim();
      if (!snippet) return;

      // Strip common prefixes that might have been added when storing the comment
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

    const highlights = Array.from(highlightMap.values());
    
    // Debug: Log highlights (remove in production)
    if (highlights.length > 0 && typeof window !== 'undefined') {
      console.log('[ChatMessage] Inline highlights (after prefix stripping):', highlights);
    }

    return highlights;
  }, [commentsData]);

  const remarkPlugins = useMemo(() => {
    if (!inlineHighlights.length) {
      return [];
    }
    return [createCommentHighlightPlugin(inlineHighlights)];
  }, [inlineHighlights]);

  // Wrap the content with highlights using simple string replacement
  const contentWithHighlights = useMemo(() => {
    if (!inlineHighlights.length) return stripCampaignTags(messageContent || 'No content');

    let content = stripCampaignTags(messageContent || 'No content');
    
    // Replace each highlight with a marker that we'll convert to a component
    inlineHighlights.forEach((highlight, idx) => {
      const regex = new RegExp(
        highlight.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'gi'
      );
      
      // Replace with a unique marker
      content = content.replace(regex, (match) => {
        return `{{HIGHLIGHT_${idx}_START}}${match}{{HIGHLIGHT_${idx}_END}}`;
      });
    });

    if (typeof window !== 'undefined') {
      console.log('[Content Highlighting] Processed content with', inlineHighlights.length, 'highlights');
    }

    return content;
  }, [messageContent, inlineHighlights]);

  // Parse and render content with highlights as React elements
  const renderContentWithHighlights = useMemo(() => {
    if (!inlineHighlights.length) {
      return (
        <ReactMarkdown>
          {stripCampaignTags(messageContent || 'No content')}
        </ReactMarkdown>
      );
    }

    // Split content by highlight markers
    const parts: React.ReactNode[] = [];
    let remaining = contentWithHighlights;
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
        // No more markers, add remaining content as markdown
        parts.push(
          <ReactMarkdown key={key++}>
            {remaining}
          </ReactMarkdown>
        );
        break;
      }

      // Add content before marker
      if (earliestMatch.index > 0) {
        parts.push(
          <ReactMarkdown key={key++}>
            {remaining.substring(0, earliestMatch.index)}
          </ReactMarkdown>
        );
      }

      const marker = earliestMatch.isStart
        ? `{{HIGHLIGHT_${earliestMatch.highlightIdx}_START}}`
        : `{{HIGHLIGHT_${earliestMatch.highlightIdx}_END}}`;

      if (earliestMatch.isStart) {
        // Find the corresponding end marker
        const endMarker = `{{HIGHLIGHT_${earliestMatch.highlightIdx}_END}}`;
        const endIdx = remaining.indexOf(endMarker, earliestMatch.index + marker.length);
        
        if (endIdx !== -1) {
          const highlightedText = remaining.substring(
            earliestMatch.index + marker.length,
            endIdx
          );
          
          const highlight = inlineHighlights[earliestMatch.highlightIdx];
          
          parts.push(
            <button
              key={key++}
              type="button"
              onClick={() => onCommentClick?.()}
              className="inline-block relative bg-amber-50 dark:bg-amber-900/20 text-gray-900 dark:text-gray-100 border-b border-amber-400/70 dark:border-amber-500/60 hover:bg-amber-100 dark:hover:bg-amber-800/30 transition-colors cursor-pointer"
              title={`${highlight.count} comment${highlight.count > 1 ? 's' : ''} on this text`}
            >
              {highlightedText}
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[14px] h-[14px] px-0.5 text-[9px] font-bold text-white bg-amber-500 dark:bg-amber-600 rounded-full">
                {highlight.count}
              </span>
            </button>
          );
          
          remaining = remaining.substring(endIdx + endMarker.length);
          continue;
        }
      }

      // Skip this marker and continue
      remaining = remaining.substring(earliestMatch.index + marker.length);
    }

    if (typeof window !== 'undefined' && parts.length > 0) {
      console.log('[Render Highlights] Created', parts.length, 'React elements');
    }

    return <>{parts}</>;
  }, [contentWithHighlights, inlineHighlights, messageContent, onCommentClick]);

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

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = (newContent: string) => {
    setIsEditing(false);
    onEdit?.(newContent);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  // Handle text selection for highlighting and commenting
  const handleTextSelection = (e: React.MouseEvent) => {
    if (!onCommentClick) return;
    
    // Small delay to ensure selection is complete
    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      
      if (text && text.length >= 3) {
        setSelectedText(text);
        
        // Get selection position for floating menu
        try {
          const range = selection?.getRangeAt(0);
          const rect = range?.getBoundingClientRect();
          
          if (rect && rect.width > 0 && rect.height > 0) {
            const position = {
              x: rect.left + rect.width / 2,
              y: Math.max(rect.top - 55, 80)
            };
            
            setSelectionPosition(position);
            setForceRender(prev => prev + 1);
          }
        } catch (err) {
          // Silently fail
        }
      } else {
        setSelectedText('');
        setSelectionPosition(null);
      }
    }, 100);
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
    // Trigger parent to reload comment counts
    setTimeout(() => {
      onCommentClick?.(); // This will trigger comment count reload
    }, 500); // Small delay to ensure comment is saved
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

  // Toggle star status
  const handleToggleStar = async () => {
    if (!brandId) {
      toast.error('Unable to star email');
      return;
    }

    setIsStarring(true);

    try {
      if (isStarred) {
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

        setIsStarred(false);
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

        setIsStarred(true);
        toast.success(`Email starred! (${count + 1}/10)`);
      }
    } catch (error) {
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

      {/* Floating selection menu - only show if inline box not open */}
      {!showInlineCommentBox && selectionPosition && selectedText && onCommentClick && (
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
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl flex items-center gap-1 p-1">
              <button
                onClick={handleCommentOnHighlight}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm text-gray-700 dark:text-gray-300 font-medium"
                title="Add comment"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                Comment
              </button>
              <div className="w-px h-5 bg-gray-200 dark:bg-gray-700"></div>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(selectedText);
                  toast.success('Copied!');
                  setSelectedText('');
                  setSelectionPosition(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm text-gray-700 dark:text-gray-300 font-medium"
                title="Copy text"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  ) : null;

  return (
    <>
      {floatingElements}

      <div 
        className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6 sm:mb-8 group animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-backwards`}
        style={{
          // CSS containment for better scroll performance
          contain: 'layout style paint',
          contentVisibility: 'auto',
        }}
      >
      <div className={`flex flex-col ${isUser ? 'items-end max-w-[85%] sm:max-w-[70%]' : 'w-full'}`}>
        <div
          className={`
            transition-all
            ${isUser 
              ? 'bg-white dark:bg-gray-800 border border-[#ececec] dark:border-gray-700 rounded-2xl px-5 py-3.5 shadow-sm' 
              : 'w-full'
            }
          `}
        >
          {isUser ? (
            <div className="w-full">
              {isEditing ? (
                <MessageEditor
                  initialContent={messageContent}
                  onSave={handleSaveEdit}
                  onCancel={handleCancelEdit}
                />
              ) : (
                <div>
                  <p className="whitespace-pre-wrap break-words text-[15px] sm:text-base leading-relaxed font-normal text-gray-800 dark:text-gray-100">
                    {messageContent}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div onMouseUp={handleTextSelection}>
              {/* Thought Process - Show if available (includes strategy and all non-email content) */}
              {(message.thinking || isStreaming) && (
                <div className="px-10 sm:px-16">
                  <ThoughtProcess 
                    thinking={message.thinking} 
                    isStreaming={isStreaming}
                    aiStatus={aiStatus}
                  />
                </div>
              )}

              {/* Message Content - Unified Markdown Rendering */}
              {isStreaming && !messageContent ? (
                <div className="px-10 sm:px-16">
                  <div className="space-y-3 animate-pulse">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                  </div>
                </div>
              ) : (
                <div className="px-10 sm:px-16">
                  <div className={`${
                    messageContent.includes('```') 
                      ? `bg-white dark:bg-gray-800 rounded-xl border shadow-sm overflow-hidden ${isStarred ? 'border-yellow-400 dark:border-yellow-500 ring-1 ring-yellow-200 dark:ring-yellow-900/30' : 'border-gray-200 dark:border-gray-700'}`
                      : 'bg-transparent border-0 shadow-none p-0'
                  } text-gray-900 dark:text-gray-100 transition-colors`}>
                  {/* Detect if content is email copy (contains code blocks) */}
                  {messageContent.includes('```') && (
                    <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-2.5 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                            Email Draft
                          </span>
                          {isStarred && (
                            <svg className="w-3.5 h-3.5 text-yellow-500 fill-current ml-0.5" viewBox="0 0 24 24">
                              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          )}
                        </div>
                        
                        {/* Star toggle - only show for email copy */}
                        {isEmailMode && brandId && canStar && (
                          <button
                            onClick={handleToggleStar}
                            disabled={isStarring}
                            className={`p-1.5 rounded-md transition-all ${
                              isStarred
                                ? 'text-yellow-500 bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-900/20'
                                : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                            } ${isStarring ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            title={isStarred ? 'Unstar email' : 'Star email'}
                          >
                            <svg className={`w-4 h-4 ${isStarred ? 'fill-current' : ''}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} fill={isStarred ? 'currentColor' : 'none'}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Content area */}
                  <div className={`${messageContent.includes('```') ? 'px-6 sm:px-8 py-7 sm:py-10' : 'py-1'}`}>
                    {/* Render all content with ReactMarkdown - code blocks show raw, rest renders */}
                    <div 
                      className={`prose dark:prose-invert max-w-none select-text cursor-text
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
                      {renderContentWithHighlights}
                    </div>
                    
                    {/* Commented text snippets removed - now shown inline as highlights */}
                  </div>
                  
                  {/* Product Links Section - Collapsible */}
                  {productLinks && productLinks.length > 0 && (
                    <div className="border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => setProductLinksExpanded(!productLinksExpanded)}
                        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded">
                            <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Product Links ({productLinks.length})
                          </span>
                        </div>
                        <svg 
                          className={`w-4 h-4 text-gray-500 transition-transform ${productLinksExpanded ? 'rotate-180' : ''}`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {productLinksExpanded && (
                        <div className="px-4 pb-4 space-y-2">
                          {productLinks.map((product, index) => {
                            if (!product?.url || !product?.name) return null;
                            
                            return (
                              <a
                                key={index}
                                href={product.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-150 group"
                              >
                                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded flex-shrink-0 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40 transition-colors">
                                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                  </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                                    {product.name}
                                  </div>
                                  {product.description && (
                                    <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1 mt-0.5">
                                      {product.description}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium mt-1 group-hover:underline">
                                    <span>View product</span>
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                  </div>
                                </div>
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  </div>
                </div>
              )}

              {/* Action Bar - Clean & Simple */}
              <div className="px-10 sm:px-16">
                <div className={`flex items-center justify-between mt-1 pt-2`}>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {formattedTimestamp}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    title="Copy"
                  >
                    {copied ? (
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                  {onRegenerate && (
                    <button
                      onClick={onRegenerate}
                      disabled={isRegenerating}
                      className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      title="Regenerate"
                    >
                      <svg
                        className={`w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ${isRegenerating ? 'animate-spin' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  )}
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
              {onEdit && !isEditing && (
                <button
                  onClick={handleEdit}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 transition-colors"
                  title="Edit message"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5h2m-1-1v2m-7 7h2m-1-1v2m10.586-7.414l-6.172 6.172a2 2 0 00-.586 1.414V17h1.828a2 2 0 001.414-.586l6.172-6.172a2 2 0 00-2.828-2.828z" />
                  </svg>
                  Edit
                </button>
              )}
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
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.thinking === nextProps.message.thinking &&
    prevProps.isRegenerating === nextProps.isRegenerating &&
    prevProps.mode === nextProps.mode &&
    prevProps.brandId === nextProps.brandId &&
    prevProps.commentCount === nextProps.commentCount &&
    prevProps.commentsData?.length === nextProps.commentsData?.length && // Re-render if comments change
    prevProps.onCommentClick === nextProps.onCommentClick
  );
});

export default ChatMessage;

