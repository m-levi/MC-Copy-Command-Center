'use client';

import { Message, ConversationMode, AIStatus } from '@/types';
import { useState, useEffect, memo } from 'react';
import MessageEditor from './MessageEditor';
import ThoughtProcess from './ThoughtProcess';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { stripCampaignTags } from '@/lib/campaign-parser';
import { logger } from '@/lib/logger';

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
}

// Memoized component to prevent unnecessary re-renders
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
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [reaction, setReaction] = useState<'thumbs_up' | 'thumbs_down' | null>(null);
  const [isStarred, setIsStarred] = useState(isStarredProp);
  const [isStarring, setIsStarring] = useState(false);
  const [productLinksExpanded, setProductLinksExpanded] = useState(false);
  const supabase = createClient();
  
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
  const showEmailPreview = responseType === 'email_copy' && !!message.content;

  const handleCopy = async () => {
    // Strip markdown code block backticks for cleaner copying
    const cleanContent = message.content
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
          .eq('content', message.content)
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
        const firstLine = message.content.split('\n')[0]
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
            content: message.content,
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

  return (
    <div 
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 sm:mb-6 group`}
      style={{
        // CSS containment for better scroll performance
        contain: 'layout style paint',
        contentVisibility: 'auto',
      }}
    >
      <div
        className={`
          transition-all
          ${isUser ? 'max-w-full sm:max-w-[650px] bg-white dark:bg-gray-800 border border-[#ececec] dark:border-gray-700 rounded-2xl sm:rounded-[20px] px-4 sm:px-6 py-3 sm:py-4 shadow-sm' : 'w-full'}
        `}
      >
        {isUser ? (
          <div className="w-full">
            {isEditing ? (
              <MessageEditor
                initialContent={message.content}
                onSave={handleSaveEdit}
                onCancel={handleCancelEdit}
              />
            ) : (
              <div>
                <p className="whitespace-pre-wrap break-words text-sm sm:text-base leading-relaxed font-normal text-black dark:text-white">{message.content}</p>
                <div className="flex items-center justify-end mt-2">
                  {onEdit && (
                    <button
                      onClick={handleEdit}
                      className="text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors touch-manipulation cursor-pointer"
                      title="Edit message"
                    >
                      EDIT
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Thought Process - Show if available (includes strategy and all non-email content) */}
            {(message.thinking || isStreaming) && (
              <ThoughtProcess 
                thinking={message.thinking} 
                isStreaming={isStreaming}
                aiStatus={aiStatus}
              />
            )}

            {/* Message Content - Unified Markdown Rendering */}
            {isStreaming && !message.content ? (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-6 py-8 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            ) : (
              <div className={`bg-white dark:bg-gray-800 rounded-lg border shadow-sm overflow-hidden ${isStarred ? 'border-yellow-400 dark:border-yellow-500 ring-1 ring-yellow-200 dark:ring-yellow-900/30' : 'border-gray-200 dark:border-gray-700'}`}>
                {/* Detect if content is email copy (contains code blocks) */}
                {message.content.includes('```') && (
                  <div className="bg-gray-50 dark:bg-gray-800/50 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          Email Copy
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
                          className={`p-1 rounded transition-colors ${
                            isStarred
                              ? 'text-yellow-500 hover:text-yellow-600'
                              : 'text-gray-400 hover:text-yellow-500'
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
                <div className="px-4 sm:px-6 py-4 sm:py-5">
                  {/* Render all content with ReactMarkdown - code blocks show raw, rest renders */}
                  <div className="prose dark:prose-invert max-w-none 
                    prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-gray-100
                    prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg 
                    prose-p:text-gray-800 dark:prose-p:text-gray-200 prose-p:leading-relaxed
                    prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-strong:font-semibold
                    prose-ul:list-disc prose-ul:ml-4 prose-ol:list-decimal prose-ol:ml-4
                    prose-li:text-gray-800 dark:prose-li:text-gray-200 prose-li:my-1
                    prose-code:text-sm prose-code:text-gray-800 dark:prose-code:text-gray-200 
                    prose-pre:bg-gray-50 dark:prose-pre:bg-gray-900/50 prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-700 prose-pre:rounded-lg prose-pre:p-4
                    prose-blockquote:border-l-4 prose-blockquote:border-gray-300 dark:prose-blockquote:border-gray-600 prose-blockquote:pl-4 prose-blockquote:italic
                    prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline">
                    <ReactMarkdown>{stripCampaignTags(message.content || 'No content')}</ReactMarkdown>
                  </div>
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
            )}

            {/* Action Bar - Clean & Simple */}
            <div className="flex items-center justify-between mt-3 pt-3">
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {new Date(message.created_at).toLocaleTimeString()}
              </span>
              <div className="flex items-center gap-1">
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

            {/* Product Links Section - Now integrated into EmailPreview component */}
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memo optimization
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.thinking === nextProps.message.thinking &&
    prevProps.isRegenerating === nextProps.isRegenerating &&
    prevProps.mode === nextProps.mode &&
    prevProps.brandId === nextProps.brandId
  );
});

export default ChatMessage;

