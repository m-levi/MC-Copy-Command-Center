'use client';

import { Message, ConversationMode } from '@/types';
import { useState, useEffect, memo } from 'react';
import MessageEditor from './MessageEditor';
import EmailPreview from './EmailPreview';
import ThoughtProcess from './ThoughtProcess';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { stripCampaignTags } from '@/lib/campaign-parser';

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
  const [isEditing, setIsEditing] = useState(false);
  const [reaction, setReaction] = useState<'thumbs_up' | 'thumbs_down' | null>(null);
  const [isStarred, setIsStarred] = useState(false);
  const [isStarring, setIsStarring] = useState(false);
  const supabase = createClient();
  
  // Determine mode for display logic
  const isEmailMode = mode === 'email_copy';
  const isPlanningMode = mode === 'planning';

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
            {/* Thought Process - Show if available (includes strategy and all non-email content) */}
            {(message.thinking || isStreaming) && (
              <ThoughtProcess 
                thinking={message.thinking} 
                isStreaming={isStreaming}
                aiStatus={aiStatus}
              />
            )}

            {/* Message Content - Contextually Intelligent Display */}
            {isEmailMode ? (
              // EMAIL MODE: Show EmailPreview with starring capability and product links
              <EmailPreview
                content={message.content}
                isStarred={isStarred}
                onToggleStar={brandId ? handleToggleStar : undefined}
                isStarring={isStarring}
                productLinks={message.metadata?.productLinks}
              />
            ) : isPlanningMode ? (
              // PLANNING MODE: Rich text formatting for strategic conversations
              // Strip campaign XML tags for clean display
              <div className="bg-white dark:bg-gray-800 border border-[#d2d2d2] dark:border-gray-700 rounded-2xl sm:rounded-[20px] px-4 sm:px-7 py-4 sm:py-6">
                <div className="prose dark:prose-invert max-w-none 
                  prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-gray-100
                  prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg 
                  prose-p:text-gray-800 dark:prose-p:text-gray-200 prose-p:leading-relaxed
                  prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-strong:font-semibold
                  prose-ul:list-disc prose-ul:ml-4 prose-ol:list-decimal prose-ol:ml-4
                  prose-li:text-gray-800 dark:prose-li:text-gray-200 prose-li:my-1
                  prose-code:text-blue-600 dark:prose-code:text-blue-400 prose-code:bg-blue-50 dark:prose-code:bg-blue-900/20 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                  prose-blockquote:border-l-4 prose-blockquote:border-gray-300 dark:prose-blockquote:border-gray-600 prose-blockquote:pl-4 prose-blockquote:italic
                  prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline">
                  <ReactMarkdown>{stripCampaignTags(message.content || 'No content')}</ReactMarkdown>
                </div>
              </div>
            ) : (
              // FALLBACK: Simple text display
              <div className="bg-white dark:bg-gray-800 border border-[#d2d2d2] dark:border-gray-700 rounded-2xl sm:rounded-[20px] px-4 sm:px-7 py-4 sm:py-6">
                <div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
                  {message.content || 'No content'}
                </div>
              </div>
            )}

            {/* Enhanced Bottom Action Toolbar with better hover states */}
            <div className="flex items-center justify-between mt-4 px-2 py-2.5 border-t border-gray-200 dark:border-gray-700 rounded-b-lg bg-gray-50/50 dark:bg-gray-800/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {new Date(message.created_at).toLocaleTimeString()}
              </span>
              <div className="flex items-center gap-1 sm:gap-1.5">
                <button
                  onClick={handleCopy}
                  className="group/btn p-2 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-200 dark:hover:border-blue-800 border border-transparent rounded-lg transition-all duration-150 cursor-pointer touch-manipulation"
                  title="Copy all"
                >
                  {copied ? (
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-xs font-medium text-green-600 dark:text-green-400">Copied!</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover/btn:text-blue-600 dark:group-hover/btn:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 group-hover/btn:text-blue-600 dark:group-hover/btn:text-blue-400 transition-colors hidden sm:inline">Copy</span>
                    </div>
                  )}
                </button>
                {onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    disabled={isRegenerating}
                    className="group/btn p-2 hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:border-purple-200 dark:hover:border-purple-800 border border-transparent rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer touch-manipulation disabled:hover:bg-transparent disabled:hover:border-transparent"
                    title="Regenerate"
                  >
                    <div className="flex items-center gap-1.5">
                      <svg
                        className={`w-4 h-4 text-gray-600 dark:text-gray-400 group-hover/btn:text-purple-600 dark:group-hover/btn:text-purple-400 transition-colors ${isRegenerating ? 'animate-spin' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 group-hover/btn:text-purple-600 dark:group-hover/btn:text-purple-400 transition-colors hidden sm:inline">
                        {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                      </span>
                    </div>
                  </button>
                )}
                {onReaction && (
                  <div className="hidden sm:flex items-center gap-1">
                    <button
                      onClick={() => handleReaction('thumbs_up')}
                      className={`group/btn p-2 hover:bg-green-50 dark:hover:bg-green-950/30 hover:border-green-200 dark:hover:border-green-800 border border-transparent rounded-lg transition-all duration-150 cursor-pointer touch-manipulation ${reaction === 'thumbs_up' ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700' : ''}`}
                      title="👍 Helpful response - Mark as good"
                    >
                      <div className="flex items-center gap-1.5">
                        <svg className={`w-4 h-4 ${reaction === 'thumbs_up' ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400 group-hover/btn:text-green-600 dark:group-hover/btn:text-green-400'} transition-colors`} fill={reaction === 'thumbs_up' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                        </svg>
                        {reaction === 'thumbs_up' && (
                          <span className="text-xs font-medium text-green-600 dark:text-green-400">Helpful</span>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={() => handleReaction('thumbs_down')}
                      className={`group/btn p-2 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-200 dark:hover:border-red-800 border border-transparent rounded-lg transition-all duration-150 cursor-pointer touch-manipulation ${reaction === 'thumbs_down' ? 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700' : ''}`}
                      title="👎 Needs improvement - Suggest regenerating"
                    >
                      <div className="flex items-center gap-1.5">
                        <svg className={`w-4 h-4 ${reaction === 'thumbs_down' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400 group-hover/btn:text-red-600 dark:group-hover/btn:text-red-400'} transition-colors`} fill={reaction === 'thumbs_down' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                        </svg>
                        {reaction === 'thumbs_down' && (
                          <span className="text-xs font-medium text-red-600 dark:text-red-400">Needs work</span>
                        )}
                      </div>
                    </button>
                  </div>
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

