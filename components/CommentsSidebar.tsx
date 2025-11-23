'use client';

import { useState, useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';

interface Comment {
  id: string;
  content: string;
  user: { id: string; email: string; full_name?: string };
  assignee?: { id: string; email: string; full_name?: string } | null;
  parent_comment_id: string | null;
  message_id: string | null;
  created_at: string;
  resolved: boolean;
  quoted_text?: string;
  replies?: Comment[];
}

interface OrganizationMember {
  user_id: string;
  profile: {
    email: string;
    full_name?: string;
  };
}

interface CommentsSidebarProps {
  conversationId: string;
  focusedMessageId?: string | null;
  highlightedText?: string | null;
  onHighlightedTextUsed?: () => void;
  onSendToChat?: (text: string) => void;
  teamMembers?: OrganizationMember[];
}

export default function CommentsSidebar({ 
  conversationId, 
  focusedMessageId,
  highlightedText,
  onHighlightedTextUsed,
  onSendToChat,
  teamMembers: initialTeamMembers = []
}: CommentsSidebarProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [teamMembers, setTeamMembers] = useState<OrganizationMember[]>(initialTeamMembers);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState<{ start: number; end: number } | null>(null);
  const [showMentionList, setShowMentionList] = useState(false);
  const [assignedUser, setAssignedUser] = useState<string | null>(null);
  const [isAssignDropdownOpen, setIsAssignDropdownOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [isLoading, setIsLoading] = useState(true); // Start as true
  const [isPosting, setIsPosting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [optimisticComments, setOptimisticComments] = useState<Comment[]>([]);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const supabase = createClient();

  useEffect(() => {
    getCurrentUser();
    loadComments();
    if (initialTeamMembers.length === 0) {
      loadTeamMembers();
    }
  }, [conversationId]);

  const loadTeamMembers = async () => {
    // Simple fetch for team members if not provided
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get org id
      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (membership) {
        const { data: members } = await supabase
          .from('organization_members')
          .select('user_id, profile:profiles(email, full_name)')
          .eq('organization_id', membership.organization_id);
        
        if (members) {
          // Fix types for the query result
          const formattedMembers = members.map((m: any) => ({
            user_id: m.user_id,
            profile: m.profile || { email: 'Unknown' }
          }));
          setTeamMembers(formattedMembers);
        }
      }
    } catch (e) {
      console.error('Failed to load team members', e);
    }
  };

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const loadComments = async () => {
    if (!conversationId) {
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await fetch(`/api/conversations/${conversationId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
        setOptimisticComments([]);
      } else {
        setComments([]);
      }
    } catch (error) {
      logger.error('Failed to load comments:', error);
      setComments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;

    const tempComment: Comment = {
      id: `temp-${Date.now()}`,
      content: newComment,
      user: { id: currentUserId || '', email: '', full_name: 'You' },
      assignee: assignedUser ? teamMembers.find(m => m.user_id === assignedUser)?.profile as any : null,
      parent_comment_id: null,
      message_id: focusedMessageId || null,
      created_at: new Date().toISOString(),
      resolved: false,
      quoted_text: highlightedText || undefined,
    };

    // Store values before clearing for potential restoration
    const savedComment = newComment;
    const savedAssignedUser = assignedUser;

    // Optimistic update
    setOptimisticComments([tempComment]);
    setNewComment('');
    setAssignedUser(null);
    setIsAssignDropdownOpen(false);
    setIsPosting(true);

    try {
      const response = await fetch(`/api/conversations/${conversationId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: tempComment.content,
          messageId: focusedMessageId,
          quotedText: highlightedText,
          assignedTo: savedAssignedUser
        }),
      });

      if (!response.ok) throw new Error('Failed');
      
      onHighlightedTextUsed?.();
      await loadComments();
      // Removed toast notification
    } catch (error) {
      setOptimisticComments([]);
      setNewComment(savedComment);
      setAssignedUser(savedAssignedUser);
      toast.error('Failed to add comment');
    } finally {
      setIsPosting(false);
    }
  };

  const addReply = async (parentCommentId: string) => {
    if (!replyContent.trim()) return;

    const tempReply: Comment = {
      id: `temp-${Date.now()}`,
      content: replyContent,
      user: { id: currentUserId || '', email: '', full_name: 'You' },
      parent_comment_id: parentCommentId,
      message_id: focusedMessageId || null,
      created_at: new Date().toISOString(),
      resolved: false,
    };

    // Optimistic update
    setOptimisticComments([tempReply]);
    setReplyContent('');
    setReplyingTo(null);

    try {
      const response = await fetch(`/api/conversations/${conversationId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: tempReply.content,
          parentCommentId,
          messageId: focusedMessageId,
        }),
      });

      if (!response.ok) throw new Error('Failed');
      
      await loadComments();
      // Removed toast notification
    } catch (error) {
      setOptimisticComments([]);
      setReplyContent(tempReply.content);
      toast.error('Failed to add reply');
    }
  };

  const toggleResolve = async (commentId: string) => {
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    // Optimistic update
    setComments(prev => prev.map(c => 
      c.id === commentId ? { ...c, resolved: !c.resolved } : c
    ));

    try {
      const response = await fetch(`/api/conversations/${conversationId}/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: !comment.resolved }),
      });

      if (!response.ok) throw new Error('Failed');
      // Removed toast notification - visual feedback is immediate via checkbox
    } catch (error) {
      setComments(prev => prev.map(c => 
        c.id === commentId ? { ...c, resolved: comment.resolved } : c
      ));
      toast.error('Failed to update');
    }
  };

  const deleteComment = async (commentId: string) => {
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    // Optimistic removal
    setComments(prev => prev.filter(c => c.id !== commentId));

    try {
      const response = await fetch(`/api/conversations/${conversationId}/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed');
      // Removed toast notification - visual feedback is immediate via removal
    } catch (error) {
      setComments(prev => [...prev, comment]);
      toast.error('Failed to delete');
    }
  };

  const saveEdit = async (commentId: string) => {
    const original = comments.find(c => c.id === commentId);
    
    // Optimistic update
    setComments(prev => prev.map(c => 
      c.id === commentId ? { ...c, content: editContent } : c
    ));
    setEditingId(null);

    try {
      const response = await fetch(`/api/conversations/${conversationId}/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent }),
      });

      if (!response.ok) throw new Error('Failed');
      // Removed toast notification - visual feedback is immediate via edit
    } catch (error) {
      if (original) {
        setComments(prev => prev.map(c => 
          c.id === commentId ? original : c
        ));
      }
      toast.error('Failed to update');
    }
  };

  const allComments = [...comments, ...optimisticComments];
  
  // Organize comments into parent-child structure
  const organizeComments = (commentsList: Comment[]) => {
    const parentComments = commentsList.filter(c => !c.parent_comment_id);
    const childComments = commentsList.filter(c => c.parent_comment_id);
    
    return parentComments.map(parent => ({
      ...parent,
      replies: childComments.filter(child => child.parent_comment_id === parent.id)
    }));
  };
  
  const activeCommentsOrganized = organizeComments(allComments.filter(c => !c.resolved));
  const resolvedComments = allComments.filter(c => c.resolved);

  const getInitials = (email: string, fullName?: string) => {
    if (fullName) return fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    return email.substring(0, 2).toUpperCase();
  };

  // Mention Logic
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNewComment(val);

    // Check for @ mention
    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.substring(0, cursor);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    if (atIndex !== -1) {
      // Check if there's a space before @ or if it's the start of the string
      if (atIndex === 0 || textBeforeCursor[atIndex - 1] === ' ' || textBeforeCursor[atIndex - 1] === '\n') {
        const query = textBeforeCursor.substring(atIndex + 1);
        // Stop if query contains space (end of mention)
        if (!query.includes(' ')) {
          setMentionQuery(query);
          setMentionIndex({ start: atIndex, end: cursor });
          setShowMentionList(true);
          return;
        }
      }
    }
    
    // Only close if we're sure it's not a valid mention
    if (showMentionList && (atIndex === -1 || (textBeforeCursor.lastIndexOf('@') !== -1 && textBeforeCursor.substring(textBeforeCursor.lastIndexOf('@')).includes(' ')))) {
       setShowMentionList(false);
       setMentionQuery(null);
    }
  };

  const handleSelectMention = (member: OrganizationMember) => {
    if (!mentionIndex) return;
    
    const before = newComment.substring(0, mentionIndex.start);
    // Keep everything after the cursor, but remove the partial query we just typed
    const after = newComment.substring(mentionIndex.end);
    
    const name = member.profile.full_name || member.profile.email.split('@')[0];
    
    // Insert the mention with a space after it
    const newValue = `${before}@${name} ${after}`;
    setNewComment(newValue);
    setShowMentionList(false);
    setMentionQuery(null);
    setMentionIndex(null);
    
    // Auto-assign if not already assigned
    if (!assignedUser) {
      setAssignedUser(member.user_id);
    }
    
    // Reset focus and cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        // Move cursor to after the inserted mention
        const newCursorPos = before.length + name.length + 2; // +2 for @ and space
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-950">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Comments
        </h3>
        {activeCommentsOrganized.length > 0 && (
          <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full font-medium">
            {activeCommentsOrganized.length}
          </span>
        )}
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          // Skeleton Loader
          <div className="p-4 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-800"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-24"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-full"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded w-32 mt-2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : activeCommentsOrganized.length === 0 && resolvedComments.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">No comments yet</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Highlight text to add a comment</p>
          </div>
        ) : (
          <div className="p-3">
            {/* Active Comments */}
            <div className="space-y-4">
              {activeCommentsOrganized.map((comment) => (
                <div
                  key={comment.id}
                  className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-200"
                >
                  {/* Quoted Text - Integrated with Card */}
                  {comment.quoted_text && (
                    <div className="mb-3 pb-3 border-b border-gray-100 dark:border-gray-800">
                      <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400 italic bg-yellow-50/50 dark:bg-yellow-900/10 p-2 rounded border-l-2 border-yellow-400">
                        <span className="line-clamp-3">"{comment.quoted_text}"</span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
                      {getInitials(comment.user.email, comment.user.full_name)}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Name & Time */}
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {comment.user.full_name || comment.user.email.split('@')[0]}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
                          {new Date(comment.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>

                      {/* Content */}
                      {editingId === comment.id ? (
                        <div className="space-y-2 mt-2">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            rows={2}
                            autoFocus
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => saveEdit(comment.id)}
                              className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition-colors"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed mb-3">{comment.content}</p>
                          
                          {/* Assignment Badge */}
                          {comment.assignee && (
                            <div className="flex items-center gap-1.5 mb-2 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md w-fit">
                              <span className="font-medium">Assigned to:</span>
                              <div className="flex items-center gap-1">
                                <div className="w-4 h-4 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center text-[9px] font-bold">
                                  {getInitials(comment.assignee.email, comment.assignee.full_name)}
                                </div>
                                <span>{comment.assignee.full_name || comment.assignee.email.split('@')[0]}</span>
                              </div>
                            </div>
                          )}

                          {/* Streamlined Actions */}
                          <div className="flex items-center gap-4 mt-2">
                            {/* Reply button */}
                            <button
                              onClick={() => {
                                setReplyingTo(comment.id);
                                setReplyContent('');
                              }}
                              className="text-xs font-medium text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors flex items-center gap-1"
                            >
                              Reply
                            </button>

                            {/* Resolve Checkbox */}
                            <button
                              onClick={() => toggleResolve(comment.id)}
                              className="text-xs font-medium text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 transition-colors flex items-center gap-1"
                              title="Mark as resolved"
                            >
                              Resolve
                            </button>

                            {currentUserId === comment.user.id && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingId(comment.id);
                                    setEditContent(comment.content);
                                  }}
                                  className="text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                                >
                                  Edit
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Reply Input - Integrated styling */}
                  {replyingTo === comment.id && (
                    <div className="ml-11 mt-3 pl-3 border-l-2 border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="flex gap-2 items-start">
                        <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 text-[10px] font-bold flex-shrink-0">
                          YOU
                        </div>
                        <div className="flex-1">
                          <textarea
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="Reply..."
                            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[60px]"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                e.preventDefault();
                                addReply(comment.id);
                              }
                            }}
                          />
                          <div className="flex gap-2 justify-end mt-2">
                            <button
                              onClick={() => setReplyingTo(null)}
                              className="px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => addReply(comment.id)}
                              disabled={!replyContent.trim()}
                              className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                            >
                              Reply
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Replies - Threaded View */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="ml-11 mt-3 space-y-3">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="group/reply relative pl-4 border-l-2 border-gray-100 dark:border-gray-700">
                          <div className="flex gap-2">
                            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 text-[10px] font-bold flex-shrink-0">
                              {getInitials(reply.user.email, reply.user.full_name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                                  {reply.user.full_name || reply.user.email.split('@')[0]}
                                </span>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                  {new Date(reply.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{reply.content}</p>
                              
                              {/* Reply actions */}
                              {currentUserId === reply.user.id && (
                                <div className="flex gap-2 mt-1 opacity-0 group-hover/reply:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => deleteComment(reply.id)}
                                    className="text-[10px] text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Resolved Section - Accordion */}
            {resolvedComments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                <button
                  onClick={() => setShowResolved(!showResolved)}
                  className="w-full flex items-center justify-between p-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600 dark:text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Resolved</span>
                    <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full text-xs font-semibold">
                      {resolvedComments.length}
                    </span>
                  </div>
                  <svg 
                    className={`w-3.5 h-3.5 transition-transform ${showResolved ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showResolved && (
                  <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    {resolvedComments.map((comment) => (
                      <div key={comment.id} className="p-3 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800">
                        <div className="flex gap-2">
                          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {comment.user.full_name || comment.user.email.split('@')[0]}
                            </p>
                            {comment.quoted_text && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 italic mb-1">
                                "{comment.quoted_text.substring(0, 40)}..."
                              </p>
                            )}
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{comment.content}</p>
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => toggleResolve(comment.id)}
                                className="text-xs text-green-700 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 font-medium"
                              >
                                Reopen
                              </button>
                              {currentUserId === comment.user.id && (
                                <>
                                  <span className="text-gray-300 dark:text-gray-700">·</span>
                                  <button
                                    onClick={() => deleteComment(comment.id)}
                                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 font-medium"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-3 bg-white dark:bg-gray-950 relative">
        {/* Mention List Dropdown */}
        {showMentionList && mentionQuery !== null && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden z-50 max-h-48 overflow-y-auto">
            {teamMembers
              .filter(m => 
                (m.profile.full_name || '').toLowerCase().includes(mentionQuery.toLowerCase()) || 
                m.profile.email.toLowerCase().includes(mentionQuery.toLowerCase())
              )
              .map((member) => (
                <button
                  key={member.user_id}
                  onClick={() => handleSelectMention(member)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-300">
                    {getInitials(member.profile.email, member.profile.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {member.profile.full_name || member.profile.email.split('@')[0]}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {member.profile.email}
                    </div>
                  </div>
                </button>
              ))}
          </div>
        )}

        {highlightedText && (
          <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md flex items-start gap-2 border border-blue-200 dark:border-blue-800">
            <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            <p className="text-xs text-gray-700 dark:text-gray-300 flex-1 font-medium">
              "{highlightedText.substring(0, 60)}{highlightedText.length > 60 ? '...' : ''}"
            </p>
            <button onClick={onHighlightedTextUsed} className="text-gray-400 hover:text-gray-600 text-sm">×</button>
          </div>
        )}
        
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={newComment}
            onChange={handleInput}
            placeholder="Add a comment... (Type @ to mention)"
            className="w-full text-sm border border-gray-300 dark:border-gray-700 rounded-lg p-3 pb-10 mb-2 resize-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
            rows={3}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                addComment();
              }
              if (showMentionList && (e.key === 'Escape')) {
                setShowMentionList(false);
              }
            }}
          />
          
          {/* Assign Dropdown - positioned inside input area */}
          <div className="absolute bottom-4 left-3">
            <div className="relative">
              <button
                onClick={() => setIsAssignDropdownOpen(!isAssignDropdownOpen)}
                className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md transition-colors ${
                  assignedUser 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' 
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {assignedUser 
                  ? teamMembers.find(m => m.user_id === assignedUser)?.profile.full_name?.split(' ')[0] || 'Assigned'
                  : 'Assign'
                }
                {assignedUser && (
                  <span 
                    onClick={(e) => { e.stopPropagation(); setAssignedUser(null); }}
                    className="hover:text-red-500"
                  >
                    ×
                  </span>
                )}
              </button>

              {/* User List for Assignment */}
              {isAssignDropdownOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                  {teamMembers.map((member) => (
                    <button
                      key={member.user_id}
                      onClick={() => {
                        setAssignedUser(member.user_id);
                        setIsAssignDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-xs flex items-center gap-2"
                    >
                      <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px]">
                        {getInitials(member.profile.email, member.profile.full_name)}
                      </div>
                      <span className="truncate text-gray-700 dark:text-gray-300">
                        {member.profile.full_name || member.profile.email.split('@')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end items-center">
          <button
            onClick={addComment}
            disabled={!newComment.trim() || isPosting}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all shadow-sm hover:shadow"
          >
            {isPosting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}
