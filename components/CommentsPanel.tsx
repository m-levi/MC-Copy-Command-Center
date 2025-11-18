'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

interface Comment {
  id: string;
  content: string;
  user: { id: string; email: string; full_name?: string };
  parent_comment_id: string | null;
  message_id: string | null;
  created_at: string;
  resolved: boolean;
  quoted_text?: string; // Highlighted text from message
}

interface CommentsPanelProps {
  conversationId: string;
  isOpen: boolean;
  onClose: () => void;
  focusedMessageId?: string | null;
  highlightedText?: string | null;
  onHighlightedTextUsed?: () => void;
}

export default function CommentsPanel({ 
  conversationId, 
  isOpen, 
  onClose, 
  focusedMessageId,
  highlightedText,
  onHighlightedTextUsed
}: CommentsPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [messagePreviews, setMessagePreviews] = useState<Record<string, string>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      loadComments();
      getCurrentUser();
    }
  }, [isOpen, conversationId]);

  useEffect(() => {
    if (comments.length > 0) {
      loadMessagePreviews();
    }
  }, [comments]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const loadMessagePreviews = async () => {
    const messageIds = [...new Set(comments.map(c => c.message_id).filter(Boolean))];
    if (messageIds.length === 0) return;

    const { data: messages } = await supabase
      .from('messages')
      .select('id, content')
      .in('id', messageIds);

    if (messages) {
      const previews: Record<string, string> = {};
      messages.forEach(msg => {
        previews[msg.id] = msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : '');
      });
      setMessagePreviews(previews);
    }
  };

  const loadComments = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/conversations/${conversationId}/comments`);
      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Failed to load comments:', response.status, errorText);
        throw new Error(`Failed to load comments: ${response.status}`);
      }
      const data = await response.json();
      setComments(data.comments || []);
    } catch (error) {
      logger.error('Failed to load comments:', error);
      toast.error('Failed to load comments');
    } finally {
      setIsLoading(false);
    }
  };

  const addComment = async (messageId?: string | null, quotedText?: string) => {
    if (!newComment.trim()) return;

    setIsPosting(true);
    try {
      const response = await fetch(`/api/conversations/${conversationId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newComment,
          parentCommentId: replyingTo,
          messageId: messageId || focusedMessageId,
          quotedText: quotedText || highlightedText,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add comment');
      }

      setNewComment('');
      setReplyingTo(null);
      onHighlightedTextUsed?.(); // Clear highlighted text
      await loadComments();
      toast.success('Comment added');
    } catch (error) {
      logger.error('Failed to add comment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add comment');
    } finally {
      setIsPosting(false);
    }
  };

  const toggleResolve = async (commentId: string, currentResolved: boolean) => {
    try {
      // Note: This would require a PATCH endpoint - for now just show toast
      toast.info('Resolve feature coming soon');
    } catch (error) {
      logger.error('Failed to resolve comment:', error);
    }
  };

  if (!isOpen) return null;

  // Filter comments by focused message if provided
  const filteredComments = focusedMessageId
    ? comments.filter(c => c.message_id === focusedMessageId)
    : comments;

  const rootComments = filteredComments.filter((c) => !c.parent_comment_id);
  const getReplies = (commentId: string) => filteredComments.filter((c) => c.parent_comment_id === commentId);

  const getInitials = (email: string, fullName?: string) => {
    if (fullName) {
      return fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    }
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-xl z-50 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Comments</h3>
          {focusedMessageId && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Filtered by message</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          // Skeleton loading state
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-24"></div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-16 mt-2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : rootComments.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            <p className="text-sm">No comments yet</p>
            <p className="text-xs mt-1">Be the first to add a comment</p>
          </div>
        ) : (
          rootComments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              replies={getReplies(comment.id)}
              messagePreview={comment.message_id ? messagePreviews[comment.message_id] : undefined}
              onReply={() => setReplyingTo(comment.id)}
              onResolve={() => toggleResolve(comment.id, comment.resolved)}
              canResolve={currentUserId === comment.user.id}
              getInitials={getInitials}
            />
          ))
        )}
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        {replyingTo && (
          <div className="mb-2 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Replying to comment
            <button
              onClick={() => setReplyingTo(null)}
              className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              Cancel
            </button>
          </div>
        )}
        {highlightedText && (
          <div className="mb-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs">
            <div className="flex items-start gap-1">
              <svg className="w-3 h-3 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <div className="flex-1">
                <strong className="text-yellow-800 dark:text-yellow-300">Commenting on:</strong>
                <p className="text-gray-700 dark:text-gray-300 mt-1 italic">"{highlightedText}"</p>
              </div>
              <button
                onClick={onHighlightedTextUsed}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title="Clear highlight"
              >
                ×
              </button>
            </div>
          </div>
        )}
        {focusedMessageId && messagePreviews[focusedMessageId] && !highlightedText && (
          <div className="mb-2 p-2 bg-white dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
            <strong>Message:</strong> {messagePreviews[focusedMessageId]}
          </div>
        )}
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={highlightedText ? "Comment on highlighted text..." : replyingTo ? "Write a reply..." : "Add a comment..."}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-3 mb-2 resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              addComment(focusedMessageId, highlightedText || undefined);
            }
          }}
        />
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {newComment.length > 0 && `${newComment.length} characters`}
          </div>
          <button
            onClick={() => addComment(focusedMessageId, highlightedText || undefined)}
            disabled={!newComment.trim() || isPosting}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isPosting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CommentThread({
  comment,
  replies,
  messagePreview,
  onReply,
  onResolve,
  canResolve,
  getInitials,
}: {
  comment: Comment;
  replies: Comment[];
  messagePreview?: string;
  onReply: () => void;
  onResolve: () => void;
  canResolve: boolean;
  getInitials: (email: string, fullName?: string) => string;
}) {
  const [showReactions, setShowReactions] = useState(false);

  return (
    <div className={`border-b border-gray-200 dark:border-gray-700 pb-3 last:border-b-0 ${comment.resolved ? 'opacity-60' : ''}`}>
      {messagePreview && (
        <div className="mb-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-xs text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600">
          <strong>On message:</strong> {messagePreview}
        </div>
      )}
      {comment.quoted_text && (
        <div className="mb-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border-l-2 border-yellow-400 dark:border-yellow-600 rounded text-xs text-gray-700 dark:text-gray-300 italic">
          "{comment.quoted_text}"
        </div>
      )}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-xs font-semibold flex-shrink-0 shadow-sm">
          {getInitials(comment.user.email, comment.user.full_name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
              {comment.user.full_name || comment.user.email.split('@')[0]}
            </span>
            {comment.resolved && (
              <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Resolved
              </span>
            )}
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed">{comment.content}</div>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {new Date(comment.created_at).toLocaleString()}
            </span>
            <button
              onClick={onReply}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              Reply
            </button>
            {canResolve && !comment.resolved && (
              <button
                onClick={onResolve}
                className="text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium"
              >
                Resolve
              </button>
            )}
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              title="React"
            >
              😊
            </button>
          </div>
          {showReactions && (
            <div className="mt-2 flex gap-1 p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
              {['👍', '👎', '❤️', '🎉', '🤔', '👀'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    toast.success(`Reacted with ${emoji}`);
                    setShowReactions(false);
                  }}
                  className="text-lg hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {replies.length > 0 && (
        <div className="ml-11 mt-3 space-y-3 border-l-2 border-gray-200 dark:border-gray-700 pl-3">
          {replies.map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              replies={[]}
              onReply={onReply}
              onResolve={onResolve}
              canResolve={canResolve}
              getInitials={getInitials}
            />
          ))}
        </div>
      )}
    </div>
  );
}
