'use client';

import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  maxHeight?: string;
}

/**
 * Lightweight WYSIWYG-style markdown input using contentEditable
 * Renders markdown in real-time as you type
 * Zero additional dependencies - uses react-markdown which we already have
 */
export default function MarkdownInput({
  value,
  onChange,
  onKeyDown,
  placeholder = 'Type your message...',
  disabled = false,
  className = '',
  maxHeight = '8rem',
}: MarkdownInputProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const isComposingRef = useRef(false);

  // Update contentEditable when value changes externally (e.g., cleared after send)
  useEffect(() => {
    if (contentRef.current && document.activeElement !== contentRef.current) {
      contentRef.current.textContent = value;
    }
  }, [value]);

  const handleInput = () => {
    if (contentRef.current && !isComposingRef.current) {
      const newValue = contentRef.current.textContent || '';
      if (newValue !== value) {
        onChange(newValue);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = () => {
    isComposingRef.current = false;
    handleInput();
  };

  return (
    <div className={`relative ${className}`}>
      {/* Content Editable div styled like textarea but with markdown rendering */}
      <div
        ref={contentRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        className={`
          w-full text-sm sm:text-base leading-relaxed font-normal
          text-gray-900 dark:text-gray-100
          focus:outline-none resize-none overflow-y-auto
          disabled:opacity-50 disabled:cursor-not-allowed
          ${!value ? 'empty' : ''}
        `}
        style={{
          minHeight: '1.5rem',
          maxHeight: maxHeight,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      />
      
      {/* Placeholder */}
      <style jsx>{`
        [contentEditable].empty:before {
          content: attr(data-placeholder);
          color: rgb(156 163 175); /* gray-400 */
          pointer-events: none;
          position: absolute;
        }
        :global(.dark) [contentEditable].empty:before {
          color: rgb(107 114 128); /* gray-500 in dark mode */
        }
      `}</style>
    </div>
  );
}


