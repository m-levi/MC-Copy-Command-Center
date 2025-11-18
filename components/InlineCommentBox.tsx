'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { logger } from '@/lib/logger';

interface InlineCommentBoxProps {
  position: { x: number; y: number };
  quotedText: string;
  messageId: string;
  conversationId: string;
  onClose: () => void;
  onCommentAdded: () => void;
}

export default function InlineCommentBox({
  position,
  quotedText,
  messageId,
  conversationId,
  onClose,
  onCommentAdded
}: InlineCommentBoxProps) {
  const [comment, setComment] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const handlePost = async () => {
    if (!comment.trim()) return;

    setIsPosting(true);
    try {
      const response = await fetch(`/api/conversations/${conversationId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: comment,
          messageId,
          quotedText,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add comment');
      }

      toast.success('Comment added');
      onCommentAdded();
      onClose();
    } catch (error) {
      logger.error('Failed to add comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div
      className="fixed animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 100000,
        pointerEvents: 'auto',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl w-80">
        {/* Quoted text */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" opacity="0.3"/>
              <path d="M6 8h12v2H6zm0 5h8v2H6z"/>
            </svg>
            <p className="text-xs text-gray-700 dark:text-gray-300 italic flex-1">
              "{quotedText.substring(0, 100)}{quotedText.length > 100 ? '...' : ''}"
            </p>
          </div>
        </div>

        {/* Comment input */}
        <div className="p-3">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add your comment..."
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 mb-2 resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                onClose();
              } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handlePost();
              }
            }}
          />
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handlePost}
              disabled={!comment.trim() || isPosting}
              className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {isPosting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

