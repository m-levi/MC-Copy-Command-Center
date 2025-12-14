'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { 
  SendIcon, 
  CheckCircleIcon, 
  MessageSquareIcon,
  XIcon,
  MoreHorizontalIcon,
  TrashIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Comment {
  id: string;
  content: string;
  user: { id: string; email: string; full_name?: string };
  quoted_text?: string;
  created_at: string;
  resolved: boolean;
  artifact_id?: string;
  artifact_variant?: 'a' | 'b' | 'c';
}

interface ArtifactCommentsProps {
  artifactId: string;
  conversationId: string;
  highlightedText?: string | null;
  selectedVariant?: 'a' | 'b' | 'c';
  onHighlightedTextUsed?: () => void;
}

const getRelativeTime = (date: string) => {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const Avatar = ({ name, email, size = 'sm' }: { name?: string; email: string; size?: 'sm' | 'md' }) => {
  const initials = name 
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
    : email.substring(0, 2).toUpperCase();
  
  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
  };

  const colors = [
    'from-amber-400 to-orange-500',
    'from-rose-400 to-pink-500',
    'from-violet-400 to-purple-500',
    'from-cyan-400 to-teal-500',
    'from-emerald-400 to-green-500',
    'from-blue-400 to-indigo-500',
  ];
  const colorIndex = email.charCodeAt(0) % colors.length;

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${colors[colorIndex]} flex items-center justify-center text-white font-semibold flex-shrink-0`}>
      {initials}
    </div>
  );
};

export const ArtifactComments = memo(function ArtifactComments({
  artifactId,
  conversationId,
  highlightedText,
  selectedVariant = 'a',
  onHighlightedTextUsed,
}: ArtifactCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const supabase = createClient();

  // Focus input when highlighted text is provided
  useEffect(() => {
    if (highlightedText && inputRef.current) {
      inputRef.current.focus();
    }
  }, [highlightedText]);

  // Fetch comments for this artifact
  const fetchComments = useCallback(async () => {
    // Skip if no valid IDs
    if (!conversationId || !artifactId) {
      setIsLoading(false);
      setComments([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('conversation_comments')
        .select(`
          id,
          content,
          quoted_text,
          created_at,
          resolved,
          metadata,
          user:profiles!conversation_comments_user_id_fkey(id, email, full_name)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      // Only treat as error if there's actual error info (not empty object)
      if (error && (error.message || error.code)) {
        console.error('Error fetching comments:', error);
        setComments([]);
        return;
      }

      // Filter to only artifact comments for this artifact
      const artifactComments = (data || [])
        .filter((c: any) => c.metadata?.artifact_id === artifactId)
        .map((c: any) => ({
          id: c.id,
          content: c.content,
          quoted_text: c.quoted_text,
          created_at: c.created_at,
          resolved: c.resolved || false,
          user: c.user,
          artifact_id: c.metadata?.artifact_id,
          artifact_variant: c.metadata?.artifact_variant,
        }));

      setComments(artifactComments);
    } catch (err: any) {
      // Only log if it's a real error with message
      if (err?.message) {
        console.error('Error fetching comments:', err);
      }
      setComments([]);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, conversationId, artifactId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Add new comment
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSending) return;

    setIsSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('conversation_comments')
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          content: newComment.trim(),
          quoted_text: highlightedText || null,
          metadata: {
            artifact_id: artifactId,
            artifact_variant: selectedVariant,
          },
        });

      if (error) throw error;

      setNewComment('');
      if (highlightedText && onHighlightedTextUsed) {
        onHighlightedTextUsed();
      }
      await fetchComments();
      toast.success('Comment added');
    } catch (err) {
      console.error('Error adding comment:', err);
      toast.error('Failed to add comment');
    } finally {
      setIsSending(false);
    }
  }, [newComment, isSending, highlightedText, supabase, conversationId, artifactId, selectedVariant, onHighlightedTextUsed, fetchComments]);

  // Toggle resolved
  const toggleResolved = useCallback(async (commentId: string, currentResolved: boolean) => {
    try {
      const { error } = await supabase
        .from('conversation_comments')
        .update({ resolved: !currentResolved })
        .eq('id', commentId);

      if (error) throw error;

      setComments(prev => prev.map(c => 
        c.id === commentId ? { ...c, resolved: !currentResolved } : c
      ));
    } catch (err) {
      console.error('Error toggling resolved:', err);
    }
  }, [supabase]);

  // Delete comment
  const deleteComment = useCallback(async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('conversation_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      setComments(prev => prev.filter(c => c.id !== commentId));
      toast.success('Comment deleted');
    } catch (err) {
      console.error('Error deleting comment:', err);
      toast.error('Failed to delete');
    }
  }, [supabase]);

  const openComments = comments.filter(c => !c.resolved);
  const resolvedComments = comments.filter(c => c.resolved);
  const displayComments = showResolved ? resolvedComments : openComments;

  return (
    <div className="flex flex-col h-full">
      {/* Header with tabs */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowResolved(false)}
            className={cn(
              'px-2 py-1 text-xs font-medium rounded-md transition-colors',
              !showResolved 
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            Open ({openComments.length})
          </button>
          <button
            onClick={() => setShowResolved(true)}
            className={cn(
              'px-2 py-1 text-xs font-medium rounded-md transition-colors',
              showResolved 
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            Resolved ({resolvedComments.length})
          </button>
        </div>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : displayComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <MessageSquareIcon className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {showResolved ? 'No resolved comments' : 'No comments yet'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {!showResolved && 'Select text in the email to quote'}
            </p>
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {displayComments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                onToggleResolved={toggleResolved}
                onDelete={deleteComment}
              />
            ))}
          </div>
        )}
      </div>

      {/* New comment input */}
      {!showResolved && (
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900">
          {highlightedText && (
            <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-2 border-blue-400">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase">
                  Quoting from Version {selectedVariant.toUpperCase()}
                </span>
                <button
                  onClick={onHighlightedTextUsed}
                  className="p-0.5 text-blue-400 hover:text-blue-600"
                >
                  <XIcon className="w-3 h-3" />
                </button>
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 italic">
                "{highlightedText}"
              </p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="flex gap-2">
            <textarea
              ref={inputRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleSubmit(e);
                }
              }}
            />
            <button
              type="submit"
              disabled={!newComment.trim() || isSending}
              className="self-end px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SendIcon className="w-4 h-4" />
            </button>
          </form>
          <p className="text-[10px] text-gray-400 mt-1">
            ⌘+Enter to send
          </p>
        </div>
      )}
    </div>
  );
});

// Individual comment card
function CommentCard({ 
  comment, 
  onToggleResolved, 
  onDelete 
}: { 
  comment: Comment; 
  onToggleResolved: (id: string, resolved: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className={cn(
      'p-3 rounded-lg border transition-colors',
      comment.resolved
        ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Avatar name={comment.user.full_name} email={comment.user.email} />
          <div>
            <p className="text-xs font-medium text-gray-900 dark:text-white">
              {comment.user.full_name || comment.user.email.split('@')[0]}
            </p>
            <p className="text-[10px] text-gray-400">
              {getRelativeTime(comment.created_at)}
              {comment.artifact_variant && (
                <span className="ml-1">• v{comment.artifact_variant.toUpperCase()}</span>
              )}
            </p>
          </div>
        </div>
        
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <MoreHorizontalIcon className="w-4 h-4" />
          </button>
          
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                <button
                  onClick={() => {
                    onToggleResolved(comment.id, comment.resolved);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <CheckCircleIcon className="w-3.5 h-3.5" />
                  {comment.resolved ? 'Reopen' : 'Resolve'}
                </button>
                <button
                  onClick={() => {
                    if (confirm('Delete this comment?')) {
                      onDelete(comment.id);
                    }
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quoted text */}
      {comment.quoted_text && (
        <div className="mb-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded border-l-2 border-amber-400">
          <p className="text-xs text-gray-600 dark:text-gray-400 italic line-clamp-2">
            "{comment.quoted_text}"
          </p>
        </div>
      )}

      {/* Content */}
      <p className={cn(
        'text-sm',
        comment.resolved 
          ? 'text-gray-500 dark:text-gray-400' 
          : 'text-gray-700 dark:text-gray-300'
      )}>
        {comment.content}
      </p>

      {/* Resolved badge */}
      {comment.resolved && (
        <div className="mt-2 flex items-center gap-1 text-green-600 dark:text-green-400">
          <CheckCircleIcon className="w-3.5 h-3.5" />
          <span className="text-[10px] font-medium">Resolved</span>
        </div>
      )}
    </div>
  );
}

export default ArtifactComments;
