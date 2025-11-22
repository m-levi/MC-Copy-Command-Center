'use client';

import { useState, useRef, useEffect } from 'react';

interface ConversationSearchProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
}

export default function ConversationSearch({
  value,
  onChange,
  onClear,
  placeholder = 'Search conversations...'
}: ConversationSearchProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle ESC to clear search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC to clear search (only if this input is focused)
      if (e.key === 'Escape' && value && document.activeElement === inputRef.current) {
        onClear();
        inputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [value, onClear]);

  return (
    <div className="relative w-full">
      <div
        className={`
          relative flex items-center rounded-lg
          bg-white dark:bg-gray-800
          border transition-all duration-200
          ${isFocused 
            ? 'border-blue-500 dark:border-blue-400 shadow-md ring-2 ring-blue-100 dark:ring-blue-900/50' 
            : 'border-gray-200 dark:border-gray-700'
          }
        `}
      >
        {/* Search Icon */}
        <div className="pl-3 pr-2 flex-shrink-0">
          <svg
            className={`w-4 h-4 transition-colors ${
              isFocused || value
                ? 'text-blue-500 dark:text-blue-400'
                : 'text-gray-400 dark:text-gray-500'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="
            flex-1 py-2 pr-1 text-sm min-w-0
            bg-transparent
            text-gray-900 dark:text-gray-100
            placeholder-gray-400 dark:placeholder-gray-500
            focus:outline-none
          "
        />

        {/* Clear Button */}
        {value && (
          <button
            onClick={onClear}
            className="
              mr-2 p-1 rounded-full flex-shrink-0
              hover:bg-gray-100 dark:hover:bg-gray-700
              transition-colors
              group cursor-pointer
            "
            title="Clear (Esc)"
          >
            <svg
              className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}





















