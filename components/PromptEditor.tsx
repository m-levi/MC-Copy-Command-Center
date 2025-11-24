'use client';

import { useState, useEffect, useRef } from 'react';

interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  readOnly?: boolean;
  minHeight?: string;
}

export default function PromptEditor({
  value,
  onChange,
  placeholder = 'Enter your prompt here...',
  label,
  readOnly = false,
  minHeight = '300px'
}: PromptEditorProps) {
  const [lineCount, setLineCount] = useState(1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (value) {
      setLineCount(value.split('\n').length);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setLineCount(newValue.split('\n').length);
  };

  // Handle tab key to insert spaces
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab' && !readOnly) {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;

      // Insert 2 spaces
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);

      // Move cursor
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <div className="flex justify-between items-center">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {value.length} chars • {lineCount} lines
          </div>
        </div>
      )}
      <div className="relative rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all bg-white dark:bg-gray-900">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          readOnly={readOnly}
          className="w-full p-4 font-mono text-sm bg-transparent outline-none resize-y text-gray-900 dark:text-gray-100 leading-relaxed"
          style={{ minHeight }}
          spellCheck={false}
        />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-500">
        Tip: Use &#123;&#123;VARIABLE_NAME&#125;&#125; for dynamic placeholders. Press Tab to insert spaces.
      </p>
    </div>
  );
}


