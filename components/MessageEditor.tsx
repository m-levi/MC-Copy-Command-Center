'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface MessageEditorProps {
  initialContent: string;
  onSave: (newContent: string) => void;
  onCancel: () => void;
}

export default function MessageEditor({
  initialContent,
  onSave,
  onCancel,
}: MessageEditorProps) {
  const [content, setContent] = useState(initialContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Focus and select text on mount
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
      // Auto-resize
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, []);

  const handleSave = () => {
    if (content.trim() && content !== initialContent) {
      onSave(content);
    } else {
      onCancel();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    // Auto-expand textarea
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  return (
    <div className="w-full">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none text-[15px] leading-relaxed"
        rows={1}
        placeholder="Edit your message..."
      />
      <div className="flex items-center justify-end gap-2 mt-2">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!content.trim() || content === initialContent}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          Save
        </button>
      </div>
    </div>
  );
}


