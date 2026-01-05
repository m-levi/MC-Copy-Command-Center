'use client';

import { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { 
  SendIcon, 
  CheckCircleIcon, 
  MessageSquareIcon,
  XIcon,
  MoreHorizontalIcon,
  TrashIcon,
  UserPlusIcon,
  AlertCircleIcon,
  ChevronDownIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { logger } from '@/lib/logger';

interface TeamMember {
  id: string;
  user_id: string;
  email: string;
  full_name?: string;
}

interface Comment {
  id: string;
  content: string;
  user: { id: string; email: string; full_name?: string };
  quoted_text?: string;
  created_at: string;
  resolved: boolean;
  artifact_id?: string;
  artifact_variant?: 'a' | 'b' | 'c';
  assigned_to?: string;
  assignee?: { id: string; email: string; full_name?: string };
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

interface ArtifactCommentsProps {
  artifactId?: string | null;
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

const PriorityBadge = ({ priority }: { priority?: string }) => {
  if (!priority || priority === 'normal') return null;
  
  const colors = {
    low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    high: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    urgent: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  };
  
  return (
    <span className={cn('px-1.5 py-0.5 text-[9px] font-medium rounded uppercase', colors[priority as keyof typeof colors])}>
      {priority}
    </span>
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
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<string>('normal');
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const supabase = createClient();

  // Focus input when highlighted text is provided
  useEffect(() => {
    if (highlightedText && inputRef.current) {
      inputRef.current.focus();
    }
  }, [highlightedText]);

  // Fetch team members for assignment
  const fetchTeamMembers = useCallback(async () => {
    try {
      // Get the conversation's brand_id first
      const { data: conversation } = await supabase
        .from('conversations')
        .select('brand_id')
        .eq('id', conversationId)
        .single();

      if (!conversation?.brand_id) return;

      // Get the brand's organization_id
      const { data: brand } = await supabase
        .from('brands')
        .select('organization_id')
        .eq('id', conversation.brand_id)
        .single();

      if (!brand?.organization_id) return;

      // Get all organization members (just IDs)
      const { data: members, error: membersError } = await supabase
        .from('organization_members')
        .select('id, user_id')
        .eq('organization_id', brand.organization_id);

      if (membersError || !members) {
        logger.error('Error fetching org members:', membersError);
        return;
      }

      // Get profiles for these members
      const userIds = members.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .in('user_id', userIds);

      const profileMap = new Map<string, { email: string; full_name?: string }>();
      for (const p of (profiles || [])) {
        profileMap.set(p.user_id, { email: p.email || 'Unknown', full_name: p.full_name });
      }

      const processed = members.map((m: any) => {
        const profile = profileMap.get(m.user_id);
        return {
          id: m.id,
          user_id: m.user_id,
          email: profile?.email || 'Unknown',
          full_name: profile?.full_name,
        };
      });
      setTeamMembers(processed);
    } catch (err) {
      logger.error('Error fetching team members:', err);
    }
  }, [supabase, conversationId]);

  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    if (!conversationId) {
      setIsLoading(false);
      setComments([]);
      return;
    }

    try {
      // Query all comments for this conversation
      const { data, error } = await supabase
        .from('conversation_comments')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        logger.error('Error fetching comments:', error.message);
        setComments([]);
        return;
      }

      // Process comments and fetch user profiles
      const processedComments: Comment[] = [];
      const userIds = new Set<string>();
      
      // Collect all unique user IDs (authors and assignees)
      for (const c of (data || [])) {
        if (c.user_id) userIds.add(c.user_id);
        if (c.assigned_to) userIds.add(c.assigned_to);
      }

      // Batch fetch all profiles
      const userProfileMap = new Map<string, { email: string; full_name?: string }>();
      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, email, full_name')
          .in('user_id', Array.from(userIds));

        if (profiles) {
          for (const p of profiles) {
            userProfileMap.set(p.user_id, { email: p.email || 'Unknown', full_name: p.full_name });
          }
        }
      }

      for (const c of (data || [])) {
        // Filter based on artifactId if provided
        const metadata = c.metadata as any || {};
        if (artifactId && metadata.artifact_id !== artifactId) {
          continue;
        }

        const authorProfile = userProfileMap.get(c.user_id) || { email: 'Unknown' };
        const assigneeProfile = c.assigned_to ? userProfileMap.get(c.assigned_to) : undefined;

        processedComments.push({
          id: c.id,
          content: c.content,
          quoted_text: c.quoted_text || undefined,
          created_at: c.created_at,
          resolved: c.resolved || false,
          user: { id: c.user_id, ...authorProfile },
          artifact_id: metadata.artifact_id,
          artifact_variant: metadata.artifact_variant,
          assigned_to: c.assigned_to,
          assignee: assigneeProfile ? { id: c.assigned_to, ...assigneeProfile } : undefined,
          priority: c.priority || 'normal',
        });
      }

      setComments(processedComments);
    } catch (err: any) {
      logger.error('Error fetching comments:', err?.message || err);
      setComments([]);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, conversationId, artifactId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Set up realtime subscription for comments
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`comments:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_comments',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          // Refetch comments when any change happens
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, conversationId, fetchComments]);

  // Add new comment
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get the comment text - try state first, then fall back to DOM value
    let commentText = newComment.trim();
    if (!commentText && inputRef.current) {
      commentText = inputRef.current.value.trim();
    }
    
    if (!commentText || isSending) return;

    setIsSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const insertData: Record<string, any> = {
        conversation_id: conversationId,
        user_id: user.id,
        content: commentText,
      };

      // Add optional fields
      if (highlightedText) {
        insertData.quoted_text = highlightedText;
      }
      if (artifactId || selectedVariant) {
        insertData.metadata = {
          artifact_id: artifactId || null,
          artifact_variant: selectedVariant || null,
        };
      }
      if (selectedAssignee) {
        insertData.assigned_to = selectedAssignee;
      }
      if (selectedPriority && selectedPriority !== 'normal') {
        insertData.priority = selectedPriority;
      }

      const { data: newCommentData, error } = await supabase
        .from('conversation_comments')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        // Fallback for databases without new columns
        if (error.message?.includes('column')) {
          const fallbackData = {
            conversation_id: conversationId,
            user_id: user.id,
            content: commentText,
          };
          const { data: fallbackResult, error: fallbackError } = await supabase
            .from('conversation_comments')
            .insert(fallbackData)
            .select()
            .single();
          if (fallbackError) throw fallbackError;
          toast.success('Comment added');
          
          // Update local state for fallback case too
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('user_id', user.id)
            .single();

          const fallbackCommentObj: Comment = {
            id: fallbackResult?.id || crypto.randomUUID(),
            content: commentText,
            user: { 
              id: user.id, 
              email: profile?.email || user.email || 'Unknown',
              full_name: profile?.full_name,
            },
            quoted_text: undefined,
            created_at: new Date().toISOString(),
            resolved: false,
          };
          setComments(prev => [...prev, fallbackCommentObj]);
        } else {
          throw error;
        }
      } else {
        toast.success('Comment added');
        
        // Immediately add the new comment to local state for instant feedback
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('user_id', user.id)
          .single();

        const metadata = insertData.metadata as any || {};
        const newCommentObj: Comment = {
          id: newCommentData?.id || crypto.randomUUID(),
          content: commentText,
          user: { 
            id: user.id, 
            email: profile?.email || user.email || 'Unknown',
            full_name: profile?.full_name,
          },
          quoted_text: highlightedText || undefined,
          created_at: new Date().toISOString(),
          resolved: false,
          artifact_id: metadata.artifact_id,
          artifact_variant: metadata.artifact_variant,
          assigned_to: selectedAssignee || undefined,
          priority: selectedPriority as any,
        };

        // Add to local state immediately
        setComments(prev => [...prev, newCommentObj]);
      }

      // Reset form
      setNewComment('');
      if (inputRef.current) {
        inputRef.current.value = '';
      }
      setSelectedAssignee(null);
      setSelectedPriority('normal');
      if (highlightedText && onHighlightedTextUsed) {
        onHighlightedTextUsed();
      }
    } catch (err: any) {
      logger.error('Error adding comment:', err);
      toast.error(err?.message || 'Failed to add comment');
    } finally {
      setIsSending(false);
    }
  }, [newComment, isSending, highlightedText, supabase, conversationId, artifactId, selectedVariant, selectedAssignee, selectedPriority, onHighlightedTextUsed]);

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
      logger.error('Error toggling resolved:', err);
    }
  }, [supabase]);

  // Update assignee
  const updateAssignee = useCallback(async (commentId: string, assigneeId: string | null) => {
    try {
      const { error } = await supabase
        .from('conversation_comments')
        .update({ assigned_to: assigneeId })
        .eq('id', commentId);

      if (error) throw error;

      const assigneeProfile = assigneeId 
        ? teamMembers.find(m => m.user_id === assigneeId)
        : undefined;

      setComments(prev => prev.map(c => 
        c.id === commentId 
          ? { 
              ...c, 
              assigned_to: assigneeId || undefined,
              assignee: assigneeProfile ? { id: assigneeId!, email: assigneeProfile.email, full_name: assigneeProfile.full_name } : undefined,
            } 
          : c
      ));
      toast.success(assigneeId ? 'Comment assigned' : 'Assignment removed');
    } catch (err) {
      logger.error('Error updating assignee:', err);
      toast.error('Failed to update assignee');
    }
  }, [supabase, teamMembers]);

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
      logger.error('Error deleting comment:', err);
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
                teamMembers={teamMembers}
                onToggleResolved={toggleResolved}
                onDelete={deleteComment}
                onAssign={updateAssignee}
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
          
          {/* Assignment and priority row */}
          <div className="flex items-center gap-2 mb-2">
            {/* Assignee dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 text-xs rounded-md border transition-colors',
                  selectedAssignee
                    ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400'
                )}
              >
                <UserPlusIcon className="w-3.5 h-3.5" />
                {selectedAssignee 
                  ? teamMembers.find(m => m.user_id === selectedAssignee)?.full_name || 'Assigned'
                  : 'Assign'
                }
                <ChevronDownIcon className="w-3 h-3" />
              </button>
              
              {showAssigneeDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowAssigneeDropdown(false)} />
                  <div className="absolute left-0 bottom-full mb-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20 max-h-48 overflow-y-auto">
                    <button
                      onClick={() => {
                        setSelectedAssignee(null);
                        setShowAssigneeDropdown(false);
                      }}
                      className="w-full px-3 py-1.5 text-xs text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                    >
                      No assignee
                    </button>
                    {teamMembers.map(member => (
                      <button
                        key={member.user_id}
                        onClick={() => {
                          setSelectedAssignee(member.user_id);
                          setShowAssigneeDropdown(false);
                        }}
                        className={cn(
                          'w-full px-3 py-1.5 text-xs text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2',
                          selectedAssignee === member.user_id && 'bg-blue-50 dark:bg-blue-900/30'
                        )}
                      >
                        <Avatar name={member.full_name} email={member.email} size="sm" />
                        <span className="truncate">{member.full_name || member.email}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Priority selector */}
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className={cn(
                'px-2 py-1 text-xs rounded-md border bg-transparent cursor-pointer',
                selectedPriority === 'urgent' && 'border-red-300 text-red-600 dark:border-red-700 dark:text-red-400',
                selectedPriority === 'high' && 'border-orange-300 text-orange-600 dark:border-orange-700 dark:text-orange-400',
                selectedPriority === 'normal' && 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400',
                selectedPriority === 'low' && 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500',
              )}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          
          <form onSubmit={handleSubmit} className="flex gap-2">
            <textarea
              ref={inputRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onInput={(e) => setNewComment((e.target as HTMLTextAreaElement).value)}
              onBlur={(e) => setNewComment(e.target.value)}
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
              disabled={isSending}
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
  teamMembers,
  onToggleResolved, 
  onDelete,
  onAssign,
}: { 
  comment: Comment; 
  teamMembers: TeamMember[];
  onToggleResolved: (id: string, resolved: boolean) => void;
  onDelete: (id: string) => void;
  onAssign: (id: string, assigneeId: string | null) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showAssignMenu, setShowAssignMenu] = useState(false);

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
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-gray-900 dark:text-white">
                {comment.user.full_name || comment.user.email.split('@')[0]}
              </p>
              <PriorityBadge priority={comment.priority} />
            </div>
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
              <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowAssignMenu(true);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <UserPlusIcon className="w-3.5 h-3.5" />
                  {comment.assigned_to ? 'Reassign' : 'Assign'}
                </button>
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

          {/* Assign menu */}
          {showAssignMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowAssignMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20 max-h-48 overflow-y-auto">
                <button
                  onClick={() => {
                    onAssign(comment.id, null);
                    setShowAssignMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-xs text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                >
                  Remove assignee
                </button>
                {teamMembers.map(member => (
                  <button
                    key={member.user_id}
                    onClick={() => {
                      onAssign(comment.id, member.user_id);
                      setShowAssignMenu(false);
                    }}
                    className={cn(
                      'w-full px-3 py-1.5 text-xs text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2',
                      comment.assigned_to === member.user_id && 'bg-blue-50 dark:bg-blue-900/30'
                    )}
                  >
                    <Avatar name={member.full_name} email={member.email} size="sm" />
                    <span className="truncate">{member.full_name || member.email}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Assignee badge */}
      {comment.assignee && (
        <div className="mb-2 flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
          <UserPlusIcon className="w-3 h-3" />
          <span>Assigned to</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {comment.assignee.full_name || comment.assignee.email.split('@')[0]}
          </span>
        </div>
      )}

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
