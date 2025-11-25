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
        className="w-full bg-transparent text-gray-800 dark:text-gray-100 focus:outline-none resize-none text-[15px] leading-relaxed placeholder:text-gray-400 dark:placeholder:text-gray-500"
        rows={1}
        placeholder="Edit your message..."
      />
      <div className="flex items-center justify-end gap-3 mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
        <button
          onClick={onCancel}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!content.trim() || content === initialContent}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save
        </button>
      </div>
    </div>
  );
}


