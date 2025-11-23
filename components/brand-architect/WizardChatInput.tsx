'use client';

import React, { useRef, useEffect, KeyboardEvent } from 'react';

interface WizardChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  isGenerating?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function WizardChatInput({
  onSend,
  disabled,
  isGenerating,
  placeholder = "Type your answer...",
  autoFocus = false
}: WizardChatInputProps) {
  const [message, setMessage] = React.useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-expand textarea
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (message.trim() && !disabled && !isGenerating) {
      onSend(message);
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  // Auto-focus logic
  useEffect(() => {
    if (autoFocus && textareaRef.current && !disabled && !isGenerating) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [autoFocus, disabled, isGenerating]);

  return (
    <div className="relative w-full max-w-4xl mx-auto px-4 sm:px-6 pb-6 bg-transparent">
      <div className={`
        group relative bg-white dark:bg-gray-900 rounded-[24px] 
        shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)]
        border border-gray-200/60 dark:border-gray-700 
        transition-all duration-300 ease-out
        hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)]
        focus-within:ring-2 focus-within:ring-blue-500/10 focus-within:border-blue-500/20
      `}>
        
        {/* Text Input Area */}
        <div className="px-5 pt-5 pb-2">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isGenerating}
            rows={1}
            className="w-full text-base leading-relaxed font-normal bg-transparent border-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400/80 dark:placeholder:text-gray-500 focus:outline-none focus:ring-0 focus:border-none outline-none resize-none max-h-64 min-h-[28px] disabled:opacity-50 disabled:cursor-not-allowed py-0"
            style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
          />
        </div>
        
        {/* Control Bar */}
        <div className="flex items-center justify-between px-4 pb-3 pt-2">
          
          {/* Left: Empty for now (no mode switcher needed for wizard) */}
          <div className="flex items-center gap-3">
             {/* Optional: Add voice input here later if needed */}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            
            {/* Send Button - Modern Circle */}
            <button
                onClick={handleSend}
                disabled={!message.trim() || disabled || isGenerating}
                className={`
                  w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200
                  ${!message.trim() || disabled || isGenerating
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed'
                    : 'bg-black dark:bg-white text-white dark:text-black shadow-md hover:shadow-lg hover:scale-105 active:scale-95'
                  }
                `}
                title="Send message"
              >
                {isGenerating ? (
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                ) : (
                    <svg className="w-4 h-4 translate-x-0.5 -translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                )}
              </button>
          </div>
        </div>
      </div>

      {/* Footer Helper Text */}
      <div className="hidden sm:flex items-center justify-center mt-3 gap-4 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-500 delay-100">
        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
          <span className="font-bold">Enter</span> to send
        </p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
          <span className="font-bold">Shift + Enter</span> for new line
        </p>
      </div>
    </div>
  );
}

