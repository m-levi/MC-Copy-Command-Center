'use client';

import { Message, ConversationMode } from '@/types';
import { useState, useEffect, memo, useMemo } from 'react';
import EmailSectionCard, { parseEmailSections } from './EmailSectionCard';
import MessageEditor from './MessageEditor';
import EmailRenderer from './EmailRenderer';
import EmailPreview from './EmailPreview';
import ThoughtProcess from './ThoughtProcess';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

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
  aiStatus?: string;
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
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [showSections, setShowSections] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [reaction, setReaction] = useState<'thumbs_up' | 'thumbs_down' | null>(null);
  const [isStarred, setIsStarred] = useState(false);
  const [isStarring, setIsStarring] = useState(false);
  const [useEmailPreview, setUseEmailPreview] = useState(true); // Use beautiful preview by default
  const supabase = createClient();
  
  // Email Preview only available in email_copy mode
  const isEmailMode = mode === 'email_copy';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
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

  // Check if this email is starred on mount
  useEffect(() => {
    const checkIfStarred = async () => {
      if (!brandId) return;
      
      try {
        const { data } = await supabase
          .from('brand_documents')
          .select('id')
          .eq('brand_id', brandId)
          .eq('doc_type', 'example')
          .eq('content', message.content)
          .limit(1);

        setIsStarred(!!(data && data.length > 0));
      } catch (error) {
        console.error('Error checking starred status:', error);
      }
    };

    checkIfStarred();
  }, [brandId, message.content, supabase]);

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
      console.error('Error toggling star:', error);
      toast.error('Failed to update email');
    } finally {
      setIsStarring(false);
    }
  };

  const isUser = message.role === 'user';
  
  // Memoize expensive parsing operation
  const emailSections = useMemo(() => {
    return !isUser ? parseEmailSections(message.content) : null;
  }, [isUser, message.content]);

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
                      className="text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors touch-manipulation"
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
            {/* AI Activity Indicator - Top of response during streaming */}
            {isStreaming && aiStatus !== 'idle' && (
              <div className="mb-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 px-4 py-2 inline-block">
                <div className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400">
                  {/* Smooth pulsing dots */}
                  <div className="flex gap-1" style={{ minWidth: '28px' }}>
                    <div 
                      className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" 
                      style={{ 
                        animationDelay: '0ms', 
                        animationDuration: '1.4s',
                        animationTimingFunction: 'cubic-bezier(0.4, 0, 0.6, 1)'
                      }}
                    ></div>
                    <div 
                      className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" 
                      style={{ 
                        animationDelay: '200ms', 
                        animationDuration: '1.4s',
                        animationTimingFunction: 'cubic-bezier(0.4, 0, 0.6, 1)'
                      }}
                    ></div>
                    <div 
                      className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" 
                      style={{ 
                        animationDelay: '400ms', 
                        animationDuration: '1.4s',
                        animationTimingFunction: 'cubic-bezier(0.4, 0, 0.6, 1)'
                      }}
                    ></div>
                  </div>
                  
                  {/* Status text */}
                  <span className="font-medium">
                    {aiStatus === 'thinking' && 'thinking'}
                    {aiStatus === 'searching_web' && 'searching web'}
                    {aiStatus === 'analyzing_brand' && 'analyzing brand'}
                    {aiStatus === 'crafting_subject' && 'crafting subject'}
                    {aiStatus === 'writing_hero' && 'writing hero'}
                    {aiStatus === 'developing_body' && 'writing body'}
                    {aiStatus === 'creating_cta' && 'creating CTA'}
                    {aiStatus === 'finalizing' && 'finalizing'}
                  </span>
                </div>
              </div>
            )}

            {/* Thought Process - Show if available */}
            {message.thinking && (
              <ThoughtProcess 
                thinking={message.thinking} 
                isStreaming={false}
              />
            )}

            {/* Message Content */}
            {isEmailMode && emailSections && showSections ? (
              // Email Sections View (only in email_copy mode)
              <div className="space-y-1">
                {emailSections.map((section, index) => (
                  <EmailSectionCard
                    key={index}
                    section={section}
                    onRegenerateSection={onRegenerateSection || (() => {})}
                    isRegenerating={isRegenerating}
                  />
                ))}
              </div>
            ) : isEmailMode && useEmailPreview && emailSections ? (
              // Email Preview (only in email_copy mode)
              <EmailPreview
                content={message.content}
                isStarred={isStarred}
                onToggleStar={brandId ? handleToggleStar : undefined}
                isStarring={isStarring}
              />
            ) : (
              // Simple chat view (planning mode) or raw markdown (email_copy mode)
              <div className="bg-white dark:bg-gray-800 border border-[#d2d2d2] dark:border-gray-700 rounded-2xl sm:rounded-[20px] px-4 sm:px-7 py-4 sm:py-6">
                <EmailRenderer content={message.content} />
              </div>
            )}

            {/* Bottom Action Toolbar */}
            <div className="flex items-center justify-between mt-3 px-1 py-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                {new Date(message.created_at).toLocaleTimeString()}
              </span>
              <div className="flex items-center gap-0.5 sm:gap-1">
                {/* Email Preview Toggle - Only in email_copy mode */}
                {isEmailMode && emailSections && (
                  <>
                    <button
                      onClick={() => setUseEmailPreview(!useEmailPreview)}
                      className="px-1.5 sm:px-2 py-1 text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors cursor-pointer touch-manipulation hidden sm:flex"
                      title={useEmailPreview ? 'Show raw markdown' : 'Show email preview'}
                    >
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {useEmailPreview ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          )}
                        </svg>
                        {useEmailPreview ? 'Raw' : 'Preview'}
                      </span>
                    </button>
                    {!useEmailPreview && (
                      <button
                        onClick={() => setShowSections(!showSections)}
                        className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors cursor-pointer"
                        title={showSections ? 'Show markdown view' : 'Show sections view'}
                      >
                        {showSections ? (
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                            Markdown
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                            Sections
                          </span>
                        )}
                      </button>
                    )}
                  </>
                )}
                <button
                  onClick={handleCopy}
                  className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors cursor-pointer touch-manipulation"
                  title="Copy all"
                >
                  {copied ? (
                    <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-green-600 dark:text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
                {onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    disabled={isRegenerating}
                    className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer touch-manipulation"
                    title="Regenerate"
                  >
                    <svg
                      className={`w-4 h-4 sm:w-3.5 sm:h-3.5 text-gray-600 dark:text-gray-400 ${isRegenerating ? 'animate-spin' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                )}
                {onReaction && (
                  <div className="hidden sm:flex items-center gap-0.5 sm:gap-1">
                    <button
                      onClick={() => handleReaction('thumbs_up')}
                      className={`p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors cursor-pointer touch-manipulation ${reaction === 'thumbs_up' ? 'bg-green-100 dark:bg-green-900/30' : ''}`}
                      title="👍 Helpful response - Mark as good"
                    >
                      <svg className={`w-4 h-4 sm:w-3.5 sm:h-3.5 ${reaction === 'thumbs_up' ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`} fill={reaction === 'thumbs_up' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleReaction('thumbs_down')}
                      className={`p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors cursor-pointer touch-manipulation ${reaction === 'thumbs_down' ? 'bg-red-100 dark:bg-red-900/30' : ''}`}
                      title="👎 Needs improvement - Suggest regenerating"
                    >
                      <svg className={`w-4 h-4 sm:w-3.5 sm:h-3.5 ${reaction === 'thumbs_down' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`} fill={reaction === 'thumbs_down' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Product Links Section - Cleaner Design */}
            {message.metadata?.productLinks && Array.isArray(message.metadata.productLinks) && message.metadata.productLinks.length > 0 && (
              <div className="mt-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3">
                <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-1.5 uppercase tracking-wide">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  Products Mentioned
                </h4>
                <div className="space-y-2">
                  {message.metadata.productLinks.map((product: any, index: number) => {
                    // Validate product has required fields
                    if (!product?.url || !product?.name) return null;
                    
                    return (
                      <a
                        key={index}
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-2.5 p-2.5 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all group"
                      >
                        <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 mt-0.5 flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-0.5">
                            {product.name}
                          </div>
                          {product.description && (
                            <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-1">
                              {product.description}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 dark:text-gray-500 truncate font-mono">
                            {product.url.replace(/^https?:\/\/(www\.)?/, '')}
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
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

