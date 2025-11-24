'use client';

import { useState, useRef, useEffect } from 'react';
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

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

  // Insert formatting
  const insertFormatting = (prefix: string, suffix: string = prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = comment.substring(start, end);
    
    const newText = comment.substring(0, start) + prefix + selectedText + suffix + comment.substring(end);
    setComment(newText);
    
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + selectedText.length + suffix.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  return (
    <div
      className="fixed"
      style={{
        left: `${Math.min(position.x, window.innerWidth - 360)}px`,
        top: `${position.y + 10}px`,
        zIndex: 100000,
        pointerEvents: 'auto',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Spring animation container */}
      <div 
        className="animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200"
        style={{ animationTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        {/* Card with glassmorphism */}
        <div className="relative w-80">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-400/10 to-orange-400/10 rounded-xl blur-xl"></div>
          
          {/* Main card */}
          <div className="relative bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-stone-200/80 dark:border-gray-700/80 rounded-xl shadow-2xl shadow-stone-200/50 dark:shadow-gray-900/50 overflow-hidden">
            {/* Header gradient bar */}
            <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500"></div>
            
            {/* Quoted text section */}
            <div className="p-3 bg-gradient-to-r from-amber-50/80 to-orange-50/60 dark:from-amber-900/10 dark:to-orange-900/10 border-b border-amber-200/30 dark:border-amber-700/20">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-amber-500 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <p className="text-xs text-stone-700 dark:text-gray-300 leading-relaxed line-clamp-3">
                  {quotedText}
                </p>
              </div>
            </div>

            {/* Comment input section */}
            <div className="p-3">
              {/* Mini formatting toolbar */}
              <div className="flex items-center gap-0.5 mb-2">
                <button
                  type="button"
                  onClick={() => insertFormatting('**')}
                  className="p-1.5 rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-gray-200 hover:bg-stone-100 dark:hover:bg-gray-700 transition-colors"
                  title="Bold"
                >
                  <span className="font-bold text-xs">B</span>
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('*')}
                  className="p-1.5 rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-gray-200 hover:bg-stone-100 dark:hover:bg-gray-700 transition-colors"
                  title="Italic"
                >
                  <span className="italic text-xs">I</span>
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('`')}
                  className="p-1.5 rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-gray-200 hover:bg-stone-100 dark:hover:bg-gray-700 transition-colors"
                  title="Code"
                >
                  <span className="font-mono text-xs">{`</>`}</span>
                </button>
              </div>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add your feedback..."
                className="w-full border border-stone-200 dark:border-gray-700 rounded-lg p-2.5 resize-none bg-white dark:bg-gray-900 text-stone-800 dark:text-gray-200 placeholder-stone-400 dark:placeholder-gray-500 text-sm focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    onClose();
                  } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handlePost();
                  }
                }}
              />

              {/* Footer */}
              <div className="flex items-center justify-between mt-3">
                <button
                  onClick={onClose}
                  className="text-xs text-stone-500 dark:text-gray-400 hover:text-stone-700 dark:hover:text-gray-200 px-2 py-1 rounded-md hover:bg-stone-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-stone-400 dark:text-gray-500">
                    <kbd className="px-1 py-0.5 bg-stone-100 dark:bg-gray-800 rounded text-[9px] font-mono">⌘↵</kbd>
                  </span>
                  <button
                    onClick={handlePost}
                    disabled={!comment.trim() || isPosting}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-lg hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium shadow-sm hover:shadow-md"
                  >
                    {isPosting ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Posting...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        <span>Post</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Arrow pointer */}
          <div className="absolute left-8 -top-1.5 w-3 h-3 bg-white dark:bg-gray-800 border-l border-t border-stone-200/80 dark:border-gray-700/80 rotate-45"></div>
        </div>
      </div>
    </div>
  );
}
