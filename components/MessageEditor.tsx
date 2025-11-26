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
        className="w-full px-4 py-3 bg-blue-700/50 border border-blue-500/30 text-white rounded-xl focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 resize-none text-[15px] leading-relaxed placeholder:text-white/40"
        rows={1}
        placeholder="Edit your message..."
      />
      <div className="flex items-center justify-end gap-2 mt-2.5">
        <span className="text-[10px] text-blue-200 mr-2 opacity-70 hidden sm:inline-block">
          Press ⌘+Enter to save
        </span>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs text-blue-100 hover:text-white hover:bg-blue-600/50 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!content.trim() || content === initialContent}
          className="px-4 py-1.5 bg-white hover:bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}


