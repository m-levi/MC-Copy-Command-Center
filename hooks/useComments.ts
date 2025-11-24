import { useState, useCallback, useEffect } from 'react';
import { logger } from '@/lib/logger';

export interface CommentData {
  id: string;
  quoted_text?: string;
  content: string;
}

export interface UseCommentsOptions {
  conversationId: string | null;
  messageIds: string[];
}

export interface UseCommentsReturn {
  commentsSidebarCollapsed: boolean;
  setCommentsSidebarCollapsed: (collapsed: boolean) => void;
  focusedMessageIdForComments: string | null;
  setFocusedMessageIdForComments: (id: string | null) => void;
  highlightedTextForComment: string | null;
  setHighlightedTextForComment: (text: string | null) => void;
  messageCommentCounts: Record<string, number>;
  messageComments: Record<string, CommentData[]>;
  loadCommentCounts: (messageIds: string[]) => Promise<void>;
}

/**
 * Hook to manage comment state and operations
 */
export function useComments({ conversationId, messageIds }: UseCommentsOptions): UseCommentsReturn {
  const [commentsSidebarCollapsed, setCommentsSidebarCollapsedState] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('commentsSidebarCollapsed') !== 'false';
    }
    return true;
  });
  const [focusedMessageIdForComments, setFocusedMessageIdForComments] = useState<string | null>(null);
  const [highlightedTextForComment, setHighlightedTextForComment] = useState<string | null>(null);
  const [messageCommentCounts, setMessageCommentCounts] = useState<Record<string, number>>({});
  const [messageComments, setMessageComments] = useState<Record<string, CommentData[]>>({});

  // Persist comments sidebar collapsed state
  const setCommentsSidebarCollapsed = useCallback((collapsed: boolean) => {
    setCommentsSidebarCollapsedState(collapsed);
    if (typeof window !== 'undefined') {
      localStorage.setItem('commentsSidebarCollapsed', String(collapsed));
    }
  }, []);

  // Load comment counts for messages
  const loadCommentCounts = useCallback(async (msgIds: string[]) => {
    if (!conversationId || msgIds.length === 0) return;
    
    try {
      const response = await fetch(`/api/conversations/${conversationId}/comments`);
      if (!response.ok) {
        logger.debug('[Comment Counts] API returned:', response.status);
        return;
      }
      
      const data = await response.json();
      const comments = data.comments || [];
      
      // Count comments per message AND store comment data
      const counts: Record<string, number> = {};
      const commentsByMessage: Record<string, CommentData[]> = {};
      
      msgIds.forEach(id => {
        const msgComments = comments.filter((c: any) => c.message_id === id && !c.resolved);
        if (msgComments.length > 0) {
          counts[id] = msgComments.length;
          commentsByMessage[id] = msgComments.map((c: any) => ({
            id: c.id,
            quoted_text: c.quoted_text,
            content: c.content
          }));
        }
      });
      
      setMessageCommentCounts(counts);
      setMessageComments(commentsByMessage);
    } catch (error) {
      logger.error('Failed to load comment counts:', error);
      // Don't show error - this is a background operation
    }
  }, [conversationId]);

  // Reload comment counts when comments sidebar opens
  useEffect(() => {
    if (!commentsSidebarCollapsed && conversationId && messageIds.length > 0) {
      loadCommentCounts(messageIds);
    }
  }, [commentsSidebarCollapsed, conversationId, messageIds.length, loadCommentCounts]);

  return {
    commentsSidebarCollapsed,
    setCommentsSidebarCollapsed,
    focusedMessageIdForComments,
    setFocusedMessageIdForComments,
    highlightedTextForComment,
    setHighlightedTextForComment,
    messageCommentCounts,
    messageComments,
    loadCommentCounts
  };
}


