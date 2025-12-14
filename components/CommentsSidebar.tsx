'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '@/lib/logger';
import toast from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import ReactMarkdown from 'react-markdown';

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
  attachments?: Array<{ url: string; name: string; type: string }>;
  replies?: Comment[];
  is_read?: boolean;
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

type FilterTab = 'all' | 'open' | 'resolved';

// Relative time formatter
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

// Avatar with warm gradient
const Avatar = ({ name, email, size = 'md' }: { name?: string; email: string; size?: 'sm' | 'md' | 'lg' }) => {
  const initials = name 
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
    : email.substring(0, 2).toUpperCase();
  
  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm'
  };

  // Generate consistent color based on email
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
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${colors[colorIndex]} flex items-center justify-center text-white font-semibold shadow-sm ring-2 ring-white/20 dark:ring-black/20 flex-shrink-0`}>
      {initials}
    </div>
  );
};

// Formatting toolbar button
const FormatButton = ({ icon, label, onClick, active }: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    className={`p-1.5 rounded-md transition-all duration-150 active:scale-90 ${
      active 
        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' 
        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 active:bg-gray-200 dark:active:bg-gray-700'
    }`}
    title={label}
  >
    {icon}
  </button>
);

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
  const [showAssignPicker, setShowAssignPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [optimisticComments, setOptimisticComments] = useState<Comment[]>([]);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`comments-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_comments',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          loadComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, supabase]);

  useEffect(() => {
    getCurrentUser();
    loadComments();
    loadUnreadStatus();
    if (initialTeamMembers.length === 0) {
      loadTeamMembers();
    }
  }, [conversationId]);

  // Auto-expand composer when there's highlighted text
  useEffect(() => {
    if (highlightedText) {
      setIsComposerExpanded(true);
    }
  }, [highlightedText]);

  // Mark comments as read when sidebar is opened and comments are loaded
  useEffect(() => {
    if (comments.length > 0 && unreadCount > 0) {
      markAllAsRead();
    }
  }, [comments]);

  const loadTeamMembers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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

  const loadUnreadStatus = async () => {
    if (!conversationId) return;

    try {
      const response = await fetch(`/api/conversations/${conversationId}/comments/read-status`);
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      logger.error('Failed to load unread status:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!conversationId || unreadCount === 0) return;

    try {
      await fetch(`/api/conversations/${conversationId}/comments/read-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
      setUnreadCount(0);
    } catch (error) {
      logger.error('Failed to mark as read:', error);
    }
  };

  // Insert formatting around selection
  const insertFormatting = (prefix: string, suffix: string = prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = newComment;
    const selectedText = text.substring(start, end);
    
    const newText = text.substring(0, start) + prefix + selectedText + suffix + text.substring(end);
    setNewComment(newText);
    
    // Reset cursor position
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + selectedText.length + suffix.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files].slice(0, 5)); // Max 5 files
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    setAttachments(prev => [...prev, ...files].slice(0, 5));
  }, []);

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const uploadAttachment = async (file: File): Promise<{ url: string; name: string; type: string } | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/conversations/${conversationId}/comments/attachments`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      return data.attachment;
    } catch (error) {
      logger.error('Failed to upload attachment:', error);
      return null;
    }
  };

  const addComment = async () => {
    if (!newComment.trim() && attachments.length === 0) return;

    const savedComment = newComment;
    const savedAssignedUser = assignedUser;
    const savedAttachments = [...attachments];

    // Start optimistic update
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
      attachments: attachments.map(f => ({ url: URL.createObjectURL(f), name: f.name, type: f.type })),
    };

    setOptimisticComments([tempComment]);
    setNewComment('');
    setAssignedUser(null);
    setAttachments([]);
    setIsComposerExpanded(false);
    setIsPosting(true);

    try {
      // Upload attachments first
      const uploadedAttachments: Array<{ url: string; name: string; type: string }> = [];
      
      for (const file of savedAttachments) {
        const uploaded = await uploadAttachment(file);
        if (uploaded) {
          uploadedAttachments.push(uploaded);
        }
      }

      // Create comment with attachment URLs
      const response = await fetch(`/api/conversations/${conversationId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: tempComment.content,
          messageId: focusedMessageId,
          quotedText: highlightedText,
          assignedTo: savedAssignedUser,
          attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed');
      
      onHighlightedTextUsed?.();
      await loadComments();
    } catch (error) {
      setOptimisticComments([]);
      setNewComment(savedComment);
      setAssignedUser(savedAssignedUser);
      setAttachments(savedAttachments);
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
    } catch (error) {
      setOptimisticComments([]);
      setReplyContent(tempReply.content);
      toast.error('Failed to add reply');
    }
  };

  const toggleResolve = async (commentId: string) => {
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

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

    setComments(prev => prev.filter(c => c.id !== commentId));

    try {
      const response = await fetch(`/api/conversations/${conversationId}/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed');
    } catch (error) {
      setComments(prev => [...prev, comment]);
      toast.error('Failed to delete');
    }
  };

  const saveEdit = async (commentId: string) => {
    const original = comments.find(c => c.id === commentId);
    
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
    } catch (error) {
      if (original) {
        setComments(prev => prev.map(c => 
          c.id === commentId ? original : c
        ));
      }
      toast.error('Failed to update');
    }
  };

  // Handle @mention input
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNewComment(val);

    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.substring(0, cursor);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    if (atIndex !== -1) {
      if (atIndex === 0 || textBeforeCursor[atIndex - 1] === ' ' || textBeforeCursor[atIndex - 1] === '\n') {
        const query = textBeforeCursor.substring(atIndex + 1);
        if (!query.includes(' ')) {
          setMentionQuery(query);
          setMentionIndex({ start: atIndex, end: cursor });
          setShowMentionList(true);
          return;
        }
      }
    }
    
    if (showMentionList && (atIndex === -1 || (textBeforeCursor.lastIndexOf('@') !== -1 && textBeforeCursor.substring(textBeforeCursor.lastIndexOf('@')).includes(' ')))) {
       setShowMentionList(false);
       setMentionQuery(null);
    }
  };

  const handleSelectMention = (member: OrganizationMember) => {
    if (!mentionIndex) return;
    
    const before = newComment.substring(0, mentionIndex.start);
    const after = newComment.substring(mentionIndex.end);
    const name = member.profile.full_name || member.profile.email.split('@')[0];
    
    const newValue = `${before}@${name} ${after}`;
    setNewComment(newValue);
    setShowMentionList(false);
    setMentionQuery(null);
    setMentionIndex(null);
    
    if (!assignedUser) {
      setAssignedUser(member.user_id);
    }
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = before.length + name.length + 2;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
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

  // Filter comments based on tab
  const getFilteredComments = () => {
    const organized = organizeComments(allComments);
    switch (filterTab) {
      case 'open':
        return organized.filter(c => !c.resolved);
      case 'resolved':
        return organized.filter(c => c.resolved);
      default:
        return organized;
    }
  };

  const filteredComments = getFilteredComments();
  const openCount = allComments.filter(c => !c.resolved && !c.parent_comment_id).length;
  const resolvedCount = allComments.filter(c => c.resolved && !c.parent_comment_id).length;

  return (
    <div 
      className="h-full flex flex-col bg-gradient-to-b from-stone-50 to-stone-100/50 dark:from-gray-950 dark:to-gray-900"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {/* Header with glassmorphism */}
      <div className="px-4 py-3 border-b border-stone-200/60 dark:border-gray-800/60 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-stone-900 dark:text-gray-100">Comments</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">{unreadCount} unread</span>
              )}
            </div>
          </div>
          {allComments.length > 0 && (
            <span className="text-xs px-2.5 py-1 bg-stone-200/60 dark:bg-gray-800/60 text-stone-600 dark:text-gray-400 rounded-full font-medium tabular-nums">
              {allComments.filter(c => !c.parent_comment_id).length}
            </span>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-0.5 sm:gap-1 p-1 bg-stone-200/50 dark:bg-gray-800/50 rounded-lg">
          {[
            { id: 'all' as FilterTab, label: 'All', count: openCount + resolvedCount },
            { id: 'open' as FilterTab, label: 'Open', count: openCount },
            { id: 'resolved' as FilterTab, label: 'Done', count: resolvedCount },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={`flex-1 px-2 sm:px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 active:scale-95 ${
                filterTab === tab.id
                  ? 'bg-white dark:bg-gray-700 text-stone-900 dark:text-gray-100 shadow-sm'
                  : 'text-stone-500 dark:text-gray-400 hover:text-stone-700 dark:hover:text-gray-300 active:bg-white/50 dark:active:bg-gray-700/50'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1 sm:ml-1.5 text-[10px] ${filterTab === tab.id ? 'text-amber-600 dark:text-amber-400' : 'text-stone-400 dark:text-gray-500'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          // Premium skeleton loader
          <div className="p-4 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-white/60 dark:bg-gray-800/40 rounded-xl p-4 backdrop-blur-sm">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-stone-200 to-stone-300 dark:from-gray-700 dark:to-gray-600"></div>
                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between">
                        <div className="h-3 bg-stone-200 dark:bg-gray-700 rounded-full w-24"></div>
                        <div className="h-2 bg-stone-200 dark:bg-gray-700 rounded-full w-12"></div>
                      </div>
                      <div className="h-3 bg-stone-200 dark:bg-gray-700 rounded-full w-full"></div>
                      <div className="h-3 bg-stone-200 dark:bg-gray-700 rounded-full w-3/4"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredComments.length === 0 ? (
          // Delightful empty state
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20 flex items-center justify-center shadow-lg shadow-amber-500/10">
                <svg className="w-10 h-10 text-amber-500 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-amber-400/30 animate-pulse"></div>
              <div className="absolute -bottom-1 -left-1 w-3 h-3 rounded-full bg-orange-400/40 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            </div>
            <h4 className="text-base font-semibold text-stone-800 dark:text-gray-200 mb-1">
              {filterTab === 'resolved' ? 'No resolved comments' : filterTab === 'open' ? 'All caught up!' : 'Start a conversation'}
            </h4>
            <p className="text-sm text-stone-500 dark:text-gray-400 max-w-[200px]">
              {filterTab === 'resolved' 
                ? 'Resolved comments will appear here' 
                : filterTab === 'open' 
                  ? 'No open comments to review'
                  : 'Highlight text in messages to add specific feedback'}
            </p>
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {filteredComments.map((comment) => (
              <div
                key={comment.id}
                className={`group relative bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border transition-all duration-300 hover:shadow-lg hover:shadow-stone-200/50 dark:hover:shadow-gray-900/50 ${
                  comment.resolved 
                    ? 'border-emerald-200/60 dark:border-emerald-800/40' 
                    : 'border-stone-200/60 dark:border-gray-700/60 hover:border-amber-300/60 dark:hover:border-amber-700/40'
                }`}
              >
                {/* Resolved indicator bar */}
                {comment.resolved && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-t-xl"></div>
                )}

                {/* Quoted Text with glow effect */}
                {comment.quoted_text && (
                  <div className="m-3 mb-0 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-400/10 to-orange-400/10 rounded-lg blur-sm"></div>
                    <div className="relative flex items-start gap-2 p-3 bg-gradient-to-r from-amber-50/80 to-orange-50/60 dark:from-amber-900/10 dark:to-orange-900/10 rounded-lg border-l-2 border-amber-400 dark:border-amber-500">
                      <svg className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                      </svg>
                      <p className="text-xs text-stone-700 dark:text-gray-300 leading-relaxed line-clamp-3">
                        {comment.quoted_text}
                      </p>
                      {onSendToChat && (
                        <button
                          onClick={() => onSendToChat(comment.quoted_text!)}
                          className="flex-shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1.5 bg-white dark:bg-gray-800 rounded-md shadow-sm border border-stone-200 dark:border-gray-700 text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 transition-all hover:scale-105 active:scale-95"
                          title="Use in chat"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="p-3">
                  <div className="flex gap-3">
                    <Avatar name={comment.user.full_name} email={comment.user.email} />

                    <div className="flex-1 min-w-0">
                      {/* Header row */}
                      <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mb-1.5">
                        <span className="text-sm font-semibold text-stone-800 dark:text-gray-100 truncate max-w-[150px] sm:max-w-none">
                          {comment.user.full_name || comment.user.email.split('@')[0]}
                        </span>
                        <span className="text-[10px] text-stone-400 dark:text-gray-500 whitespace-nowrap">
                          {getRelativeTime(comment.created_at)}
                        </span>
                        {comment.resolved && (
                          <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-full">
                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="hidden sm:inline">Done</span>
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      {editingId === comment.id ? (
                        <div className="space-y-2 mt-2">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full text-sm border border-stone-300 dark:border-gray-600 rounded-lg p-2.5 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none transition-shadow"
                            rows={3}
                            autoFocus
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-3 py-1.5 text-xs text-stone-600 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => saveEdit(comment.id)}
                              className="px-3 py-1.5 text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 font-medium transition-all shadow-sm"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {comment.content && (
                            <div className="prose prose-sm prose-stone dark:prose-invert max-w-none text-sm text-stone-700 dark:text-gray-300 leading-relaxed mb-2">
                              <ReactMarkdown>{comment.content}</ReactMarkdown>
                            </div>
                          )}
                          
                          {/* Attachments */}
                          {comment.attachments && comment.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {comment.attachments.map((attachment, idx) => (
                                <a
                                  key={idx}
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="group/attachment flex items-center gap-2 p-2 bg-stone-50 dark:bg-gray-800 rounded-lg border border-stone-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-700 transition-all"
                                >
                                  {attachment.type.startsWith('image/') ? (
                                    <div className="w-10 h-10 rounded overflow-hidden bg-stone-100 dark:bg-gray-700">
                                      <img src={attachment.url} alt={attachment.name} className="w-full h-full object-cover" />
                                    </div>
                                  ) : (
                                    <div className="w-10 h-10 rounded bg-stone-100 dark:bg-gray-700 flex items-center justify-center">
                                      <svg className="w-5 h-5 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-stone-700 dark:text-gray-300 truncate max-w-[100px]">
                                      {attachment.name}
                                    </p>
                                    <p className="text-[10px] text-stone-400 dark:text-gray-500 group-hover/attachment:text-amber-500 transition-colors">
                                      Open file
                                    </p>
                                  </div>
                                </a>
                              ))}
                            </div>
                          )}
                          
                          {/* Assignee chip */}
                          {comment.assignee && (
                            <div className="inline-flex items-center gap-1.5 mb-2 text-xs bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 px-2 py-1 rounded-full border border-violet-200/50 dark:border-violet-700/30">
                              <Avatar name={comment.assignee.full_name} email={comment.assignee.email} size="sm" />
                              <span className="font-medium">{comment.assignee.full_name || comment.assignee.email.split('@')[0]}</span>
                            </div>
                          )}

                          {/* Actions - always visible on mobile, hover reveal on desktop */}
                          <div className="flex items-center flex-wrap gap-0.5 sm:gap-1 mt-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                            <button
                              onClick={() => { setReplyingTo(comment.id); setReplyContent(''); }}
                              className="flex items-center gap-1 px-1.5 sm:px-2 py-1 text-xs font-medium text-stone-500 hover:text-amber-600 dark:text-gray-400 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-md transition-all active:scale-95"
                              title="Reply"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                              </svg>
                              <span className="hidden sm:inline">Reply</span>
                            </button>
                            
                            <button
                              onClick={() => toggleResolve(comment.id)}
                              title={comment.resolved ? 'Reopen' : 'Resolve'}
                              className={`flex items-center gap-1 px-1.5 sm:px-2 py-1 text-xs font-medium rounded-md transition-all active:scale-95 ${
                                comment.resolved
                                  ? 'text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                                  : 'text-stone-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                              }`}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="hidden sm:inline">{comment.resolved ? 'Reopen' : 'Resolve'}</span>
                            </button>

                            {onSendToChat && (
                              <button
                                onClick={() => onSendToChat(comment.content)}
                                className="flex items-center gap-1 px-1.5 sm:px-2 py-1 text-xs font-medium text-stone-500 hover:text-violet-600 dark:text-gray-400 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-md transition-all active:scale-95"
                                title="Use in chat"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                                <span className="hidden sm:inline">Use</span>
                              </button>
                            )}

                            {currentUserId === comment.user.id && (
                              <button
                                onClick={() => { setEditingId(comment.id); setEditContent(comment.content); }}
                                className="flex items-center gap-1 px-1.5 sm:px-2 py-1 text-xs font-medium text-stone-500 hover:text-stone-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-md transition-all active:scale-95"
                                title="Edit"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span className="hidden sm:inline">Edit</span>
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Reply Input */}
                  {replyingTo === comment.id && (
                    <div className="mt-3 ml-11 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="relative">
                        {/* Connecting line */}
                        <div className="absolute -left-6 top-0 bottom-4 w-px bg-gradient-to-b from-stone-300 dark:from-gray-600 to-transparent"></div>
                        <div className="absolute -left-6 top-4 w-3 h-px bg-stone-300 dark:bg-gray-600"></div>
                        
                        <div className="bg-stone-50/80 dark:bg-gray-800/50 rounded-lg p-3 border border-stone-200/60 dark:border-gray-700/60">
                          <textarea
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="Write a reply..."
                            className="w-full text-sm border-0 bg-transparent focus:ring-0 resize-none placeholder-stone-400 dark:placeholder-gray-500 text-stone-800 dark:text-gray-200"
                            rows={2}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                e.preventDefault();
                                addReply(comment.id);
                              }
                              if (e.key === 'Escape') setReplyingTo(null);
                            }}
                          />
                          <div className="flex gap-2 justify-end mt-2">
                            <button
                              onClick={() => setReplyingTo(null)}
                              className="px-3 py-1.5 text-xs text-stone-600 dark:text-gray-400 hover:bg-stone-200/60 dark:hover:bg-gray-700/60 rounded-md transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => addReply(comment.id)}
                              disabled={!replyContent.trim()}
                              className="px-3 py-1.5 text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-md hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
                            >
                              Reply
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Replies with Linear-style threading */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-3 ml-11 space-y-2">
                      {comment.replies.map((reply, idx) => (
                        <div key={reply.id} className="group/reply relative animate-in fade-in slide-in-from-left-2 duration-200" style={{ animationDelay: `${idx * 50}ms` }}>
                          {/* Connecting line */}
                          <div className="absolute -left-6 top-0 h-full w-px bg-gradient-to-b from-stone-200 dark:from-gray-700 to-transparent"></div>
                          <div className="absolute -left-6 top-4 w-3 h-px bg-stone-200 dark:bg-gray-700"></div>
                          
                          <div className="flex gap-2 p-2 rounded-lg hover:bg-stone-50/80 dark:hover:bg-gray-800/40 transition-colors">
                            <Avatar name={reply.user.full_name} email={reply.user.email} size="sm" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-semibold text-stone-700 dark:text-gray-200">
                                  {reply.user.full_name || reply.user.email.split('@')[0]}
                                </span>
                                <span className="text-[10px] text-stone-400 dark:text-gray-500">
                                  {getRelativeTime(reply.created_at)}
                                </span>
                              </div>
                              <div className="prose prose-sm prose-stone dark:prose-invert max-w-none text-xs text-stone-600 dark:text-gray-400">
                                <ReactMarkdown>{reply.content}</ReactMarkdown>
                              </div>
                              
                              {currentUserId === reply.user.id && (
                                <button
                                  onClick={() => deleteComment(reply.id)}
                                  className="mt-1 opacity-100 md:opacity-0 md:group-hover/reply:opacity-100 text-[10px] text-stone-400 hover:text-red-500 dark:hover:text-red-400 transition-all active:scale-95"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Composer Area - Floating design */}
      <div className={`border-t border-stone-200/60 dark:border-gray-800/60 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 transition-all duration-300 ${isDragging ? 'ring-2 ring-amber-400 ring-inset' : ''}`}>
        {/* Drop zone overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-amber-50/90 dark:bg-amber-900/30 flex items-center justify-center z-20 backdrop-blur-sm">
            <div className="text-center">
              <svg className="w-10 h-10 text-amber-500 mx-auto mb-2 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Drop files here</p>
            </div>
          </div>
        )}

        {/* Mention dropdown */}
        {showMentionList && mentionQuery !== null && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden z-50 max-h-48 overflow-y-auto backdrop-blur-xl">
            {teamMembers
              .filter(m => 
                (m.profile.full_name || '').toLowerCase().includes(mentionQuery.toLowerCase()) || 
                m.profile.email.toLowerCase().includes(mentionQuery.toLowerCase())
              )
              .map((member) => (
                <button
                  key={member.user_id}
                  onClick={() => handleSelectMention(member)}
                  className="w-full px-3 py-2.5 text-left hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center gap-2.5 transition-colors"
                >
                  <Avatar name={member.profile.full_name} email={member.profile.email} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-stone-800 dark:text-gray-100 truncate">
                      {member.profile.full_name || member.profile.email.split('@')[0]}
                    </div>
                    <div className="text-[10px] text-stone-400 dark:text-gray-500 truncate">
                      {member.profile.email}
                    </div>
                  </div>
                </button>
              ))}
          </div>
        )}

        <div className="p-3">
          {/* Highlighted text preview */}
          {highlightedText && (
            <div className="mb-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-start gap-2 p-2.5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border border-amber-200/50 dark:border-amber-700/30">
                <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <p className="text-xs text-stone-700 dark:text-gray-300 flex-1 leading-relaxed line-clamp-2">
                  {highlightedText}
                </p>
                <button 
                  onClick={onHighlightedTextUsed} 
                  className="text-stone-400 hover:text-stone-600 dark:hover:text-gray-300 p-0.5 hover:bg-stone-200/50 dark:hover:bg-gray-700/50 rounded transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Attachments preview */}
          {attachments.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {attachments.map((file, idx) => (
                <div key={idx} className="group/file relative bg-stone-100 dark:bg-gray-800 rounded-lg p-2 pr-7 flex items-center gap-2 text-xs">
                  {file.type.startsWith('image/') ? (
                    <div className="w-8 h-8 rounded bg-stone-200 dark:bg-gray-700 overflow-hidden">
                      <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <svg className="w-4 h-4 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                  <span className="truncate max-w-[100px] text-stone-600 dark:text-gray-400">{file.name}</span>
                  <button
                    onClick={() => removeAttachment(idx)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Composer */}
          <div 
            className={`relative bg-white dark:bg-gray-800 rounded-xl border transition-all duration-300 ${
              isComposerExpanded 
                ? 'border-amber-300 dark:border-amber-700 shadow-lg shadow-amber-500/10 ring-1 ring-amber-200/50 dark:ring-amber-800/30' 
                : 'border-stone-200 dark:border-gray-700 hover:border-stone-300 dark:hover:border-gray-600'
            }`}
          >
            {/* Formatting toolbar - shows when expanded */}
            {isComposerExpanded && (
              <div className="flex items-center flex-wrap gap-0.5 px-1.5 sm:px-2 py-1.5 border-b border-stone-100 dark:border-gray-700/50">
                <FormatButton
                  icon={<span className="font-bold text-xs">B</span>}
                  label="Bold (Ctrl+B)"
                  onClick={() => insertFormatting('**')}
                />
                <FormatButton
                  icon={<span className="italic text-xs">I</span>}
                  label="Italic (Ctrl+I)"
                  onClick={() => insertFormatting('*')}
                />
                <FormatButton
                  icon={<span className="font-mono text-xs">{`</>`}</span>}
                  label="Code"
                  onClick={() => insertFormatting('`')}
                />
                <FormatButton
                  icon={
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  }
                  label="Link"
                  onClick={() => insertFormatting('[', '](url)')}
                />
                <div className="hidden sm:block w-px h-4 bg-stone-200 dark:bg-gray-700 mx-1"></div>
                <FormatButton
                  icon={
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  }
                  label="Attach file"
                  onClick={() => fileInputRef.current?.click()}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={newComment}
              onChange={handleInput}
              onFocus={() => setIsComposerExpanded(true)}
              placeholder="Add a comment... (@ to mention)"
              className={`w-full text-sm bg-transparent px-3 py-2.5 resize-none placeholder-stone-400 dark:placeholder-gray-500 text-stone-800 dark:text-gray-200 focus:outline-none transition-all duration-300 ${
                isComposerExpanded ? 'min-h-[80px]' : 'min-h-[44px]'
              }`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  addComment();
                }
                if (e.key === 'Escape') {
                  setShowMentionList(false);
                  if (!newComment.trim() && !highlightedText) {
                    setIsComposerExpanded(false);
                  }
                }
                // Formatting shortcuts
                if (e.ctrlKey || e.metaKey) {
                  if (e.key === 'b') { e.preventDefault(); insertFormatting('**'); }
                  if (e.key === 'i') { e.preventDefault(); insertFormatting('*'); }
                }
              }}
            />

            {/* Bottom bar */}
            <div className="flex items-center justify-between gap-2 px-2 py-2 border-t border-stone-100 dark:border-gray-700/50">
              {/* Assignee picker */}
              <div className="relative">
                <button
                  onClick={() => setShowAssignPicker(!showAssignPicker)}
                  title="Assign to team member"
                  className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 rounded-lg text-xs font-medium transition-all active:scale-95 ${
                    assignedUser
                      ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-200/50 dark:border-violet-700/30'
                      : 'text-stone-500 dark:text-gray-400 hover:bg-stone-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {assignedUser ? (
                    <>
                      <Avatar 
                        name={teamMembers.find(m => m.user_id === assignedUser)?.profile.full_name}
                        email={teamMembers.find(m => m.user_id === assignedUser)?.profile.email || ''}
                        size="sm"
                      />
                      <span className="hidden sm:inline truncate max-w-[80px]">{teamMembers.find(m => m.user_id === assignedUser)?.profile.full_name?.split(' ')[0] || 'Assigned'}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setAssignedUser(null); }}
                        className="text-violet-400 hover:text-violet-600 dark:hover:text-violet-300"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="hidden sm:inline">Assign</span>
                    </>
                  )}
                </button>

                {/* Assignee dropdown */}
                {showAssignPicker && (
                  <div className="absolute bottom-full left-0 mb-2 w-56 bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto backdrop-blur-xl">
                    <div className="p-2 border-b border-stone-100 dark:border-gray-700">
                      <p className="text-[10px] font-medium text-stone-500 dark:text-gray-400 uppercase tracking-wider">Assign to</p>
                    </div>
                    {teamMembers.map((member) => (
                      <button
                        key={member.user_id}
                        onClick={() => {
                          setAssignedUser(member.user_id);
                          setShowAssignPicker(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center gap-2.5 transition-colors"
                      >
                        <Avatar name={member.profile.full_name} email={member.profile.email} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-stone-700 dark:text-gray-200 truncate">
                            {member.profile.full_name || member.profile.email.split('@')[0]}
                          </div>
                        </div>
                        {assignedUser === member.user_id && (
                          <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Post button */}
              <button
                onClick={addComment}
                disabled={(!newComment.trim() && attachments.length === 0) || isPosting}
                title="Post comment"
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 text-sm bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all shadow-sm hover:shadow-md disabled:hover:shadow-sm active:scale-95"
              >
                {isPosting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="hidden sm:inline">Posting...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span className="hidden sm:inline">Post</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Keyboard shortcut hint - hidden on mobile (no keyboard) */}
          {isComposerExpanded && (
            <p className="hidden sm:block text-[10px] text-stone-400 dark:text-gray-500 mt-2 text-center">
              <kbd className="px-1 py-0.5 bg-stone-100 dark:bg-gray-800 rounded text-[9px] font-mono">⌘</kbd> + <kbd className="px-1 py-0.5 bg-stone-100 dark:bg-gray-800 rounded text-[9px] font-mono">Enter</kbd> to post
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
