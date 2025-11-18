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
  quoted_text?: string;
  replies?: Comment[];
}

interface CommentsSidebarProps {
  conversationId: string;
  focusedMessageId?: string | null;
  highlightedText?: string | null;
  onHighlightedTextUsed?: () => void;
  onSendToChat?: (text: string) => void;
}

export default function CommentsSidebar({ 
  conversationId, 
  focusedMessageId,
  highlightedText,
  onHighlightedTextUsed,
  onSendToChat
}: CommentsSidebarProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
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
  }, [conversationId]);

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
      parent_comment_id: null,
      message_id: focusedMessageId || null,
      created_at: new Date().toISOString(),
      resolved: false,
      quoted_text: highlightedText || undefined,
    };

    // Optimistic update
    setOptimisticComments([tempComment]);
    setNewComment('');
    setIsPosting(true);

    try {
      const response = await fetch(`/api/conversations/${conversationId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: tempComment.content,
          messageId: focusedMessageId,
          quotedText: highlightedText,
        }),
      });

      if (!response.ok) throw new Error('Failed');
      
      onHighlightedTextUsed?.();
      await loadComments();
      // Removed toast notification
    } catch (error) {
      setOptimisticComments([]);
      setNewComment(tempComment.content);
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
            <div className="space-y-3">
              {activeCommentsOrganized.map((comment) => (
                <div
                  key={comment.id}
                  className="group p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all duration-150"
                >
                  {/* Quoted Text */}
                  {comment.quoted_text && (
                    <div className="mb-2 p-2 bg-yellow-50 dark:bg-yellow-900/10 border-l-2 border-yellow-400 rounded-md text-xs text-gray-600 dark:text-gray-400 italic">
                      "{comment.quoted_text}"
                    </div>
                  )}

                  <div className="flex gap-2">
                    {/* Avatar */}
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {getInitials(comment.user.email, comment.user.full_name)}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Name & Time */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                          {comment.user.full_name || comment.user.email.split('@')[0]}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {new Date(comment.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>

                      {/* Content */}
                      {editingId === comment.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            rows={2}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEdit(comment.id)}
                              className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-2">{comment.content}</p>

                          {/* Streamlined Actions */}
                          <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Reply button */}
                            <button
                              onClick={() => {
                                setReplyingTo(comment.id);
                                setReplyContent('');
                              }}
                              className="text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
                            >
                              Reply
                            </button>

                            {/* Resolve Checkbox */}
                            <button
                              onClick={() => toggleResolve(comment.id)}
                              className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                              title="Mark as resolved"
                            >
                              <div className="w-4 h-4 rounded border-2 border-gray-300 dark:border-gray-600 hover:border-green-500 dark:hover:border-green-500 flex items-center justify-center transition-colors">
                                <svg className="w-2.5 h-2.5 text-green-600 opacity-0 hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                              <span className="font-medium">Resolve</span>
                            </button>

                            {currentUserId === comment.user.id && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingId(comment.id);
                                    setEditContent(comment.content);
                                  }}
                                  className="text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteComment(comment.id)}
                                  className="text-xs text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 font-medium transition-colors"
                                >
                                  Delete
                                </button>
                              </>
                            )}

                            {onSendToChat && comment.quoted_text && (
                              <button
                                onClick={() => {
                                  const msg = `Regarding: "${comment.quoted_text}"\n\n${comment.user.full_name || comment.user.email}: ${comment.content}`;
                                  onSendToChat(msg);
                                }}
                                className="ml-auto text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
                              >
                                →  Chat
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Reply Input */}
                  {replyingTo === comment.id && (
                    <div className="ml-9 mt-2 space-y-2 animate-in slide-in-from-top-2 duration-200">
                      <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Write a reply..."
                        className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        rows={2}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            addReply(comment.id);
                          }
                        }}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => addReply(comment.id)}
                          disabled={!replyContent.trim()}
                          className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                        >
                          Reply
                        </button>
                        <button
                          onClick={() => setReplyingTo(null)}
                          className="px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="ml-9 mt-2 space-y-2 border-l-2 border-gray-200 dark:border-gray-800 pl-3">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors group/reply">
                          <div className="flex gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {getInitials(reply.user.email, reply.user.full_name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                                  {reply.user.full_name || reply.user.email.split('@')[0]}
                                </span>
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                  {new Date(reply.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{reply.content}</p>
                              
                              {/* Reply actions */}
                              {currentUserId === reply.user.id && (
                                <div className="flex gap-2 mt-1 opacity-0 group-hover/reply:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => deleteComment(reply.id)}
                                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 font-medium"
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
      <div className="border-t border-gray-200 dark:border-gray-800 p-3 bg-white dark:bg-gray-950">
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
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="w-full text-sm border border-gray-300 dark:border-gray-700 rounded-lg p-3 mb-2 resize-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              addComment();
            }
          }}
        />
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-400">
            {newComment.length > 0 && `${newComment.length}`}
          </span>
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
