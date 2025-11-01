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

  // Handle keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      
      // ESC to clear
      if (e.key === 'Escape' && value) {
        onClear();
        inputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [value, onClear]);

  return (
    <div className="relative">
      <div
        className={`
          relative flex items-center rounded-full
          bg-white dark:bg-gray-800
          border transition-all duration-200
          ${isFocused 
            ? 'border-blue-500 dark:border-blue-400 shadow-md ring-2 ring-blue-100 dark:ring-blue-900/50' 
            : 'border-gray-300 dark:border-gray-600 shadow-sm'
          }
        `}
      >
        {/* Search Icon */}
        <div className="pl-4 pr-2">
          <svg
            className={`w-4 h-4 transition-colors duration-200 ${
              isFocused || value
                ? 'text-blue-500 dark:text-blue-400'
                : 'text-gray-400 dark:text-gray-500'
            } ${value ? 'animate-pulse' : ''}`}
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
            flex-1 py-2 pr-2 text-sm
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
              mr-2 p-1.5 rounded-full
              hover:bg-gray-100 dark:hover:bg-gray-700
              transition-all duration-150
              group
            "
            title="Clear search (Esc)"
          >
            <svg
              className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300"
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

        {/* Keyboard Shortcut Hint */}
        {!value && !isFocused && (
          <div className="mr-3 flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] font-semibold">
              ⌘K
            </kbd>
          </div>
        )}
      </div>

      {/* Result count indicator */}
      {value && (
        <div className="absolute -bottom-5 left-0 text-xs text-gray-500 dark:text-gray-400">
          Searching...
        </div>
      )}
    </div>
  );
}










