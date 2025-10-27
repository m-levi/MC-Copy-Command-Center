'use client';

import { useState, useRef, KeyboardEvent, useEffect } from 'react';
import { PROMPT_TEMPLATES, QUICK_ACTION_PROMPTS } from '@/lib/prompt-templates';
import { ConversationMode } from '@/types';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  isGenerating?: boolean;
  conversationId?: string | null;
  mode?: ConversationMode;
  draftContent?: string;
  onDraftChange?: (content: string) => void;
}

export default function ChatInput({ 
  onSend, 
  onStop, 
  disabled, 
  isGenerating, 
  conversationId,
  mode = 'planning',
  draftContent = '',
  onDraftChange
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [filteredCommands, setFilteredCommands] = useState<string[]>([]);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const slashCommands = [
    { command: '/shorten', label: 'Make it shorter', icon: '📏' },
    { command: '/urgent', label: 'Add urgency', icon: '⚡' },
    { command: '/casual', label: 'More casual tone', icon: '😊' },
    { command: '/professional', label: 'More professional', icon: '💼' },
    { command: '/proof', label: 'Add social proof', icon: '⭐' },
    { command: '/cta', label: 'Improve CTAs', icon: '🎯' },
  ];

  // Sync with draft content from parent
  useEffect(() => {
    if (draftContent !== message) {
      setMessage(draftContent);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
      }
    }
  }, [draftContent]);

  // Check for slash commands
  useEffect(() => {
    const lastWord = message.split(' ').pop() || '';
    if (lastWord.startsWith('/')) {
      const matches = slashCommands.filter(cmd => 
        cmd.command.startsWith(lastWord.toLowerCase())
      );
      if (matches.length > 0) {
        setFilteredCommands(matches.map(m => m.command));
        setShowSlashCommands(true);
        setSelectedCommandIndex(0);
      } else {
        setShowSlashCommands(false);
      }
    } else {
      setShowSlashCommands(false);
    }
  }, [message]);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      // Check for slash command
      const trimmed = message.trim();
      let finalMessage = trimmed;

      if (trimmed.startsWith('/')) {
        const command = trimmed.toLowerCase();
        if (command === '/shorten') finalMessage = QUICK_ACTION_PROMPTS.make_shorter;
        else if (command === '/urgent') finalMessage = QUICK_ACTION_PROMPTS.add_urgency;
        else if (command === '/casual') finalMessage = QUICK_ACTION_PROMPTS.change_tone_casual;
        else if (command === '/professional') finalMessage = QUICK_ACTION_PROMPTS.change_tone_professional;
        else if (command === '/proof') finalMessage = QUICK_ACTION_PROMPTS.add_social_proof;
        else if (command === '/cta') finalMessage = QUICK_ACTION_PROMPTS.improve_cta;
      }

      onSend(finalMessage);
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSlashCommands) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCommandIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCommandIndex(prev => prev > 0 ? prev - 1 : 0);
      } else if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        const selectedCommand = filteredCommands[selectedCommandIndex];
        if (selectedCommand) {
          const words = message.split(' ');
          words[words.length - 1] = selectedCommand + ' ';
          setMessage(words.join(' '));
          setShowSlashCommands(false);
        }
      } else if (e.key === 'Escape') {
        setShowSlashCommands(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setMessage(newValue);
    if (onDraftChange) {
      onDraftChange(newValue);
    }
    // Auto-expand textarea
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  const charCount = message.length;

  const getPlaceholder = () => {
    if (mode === 'planning') {
      return "Discuss your email ideas, strategy, and structure...";
    }
    return "Describe the email you'd like to create...";
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3">
      <div className="max-w-4xl mx-auto">
        {/* Slash Command Suggestions */}
        {showSlashCommands && (
          <div className="mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
            {slashCommands
              .filter(cmd => filteredCommands.includes(cmd.command))
              .map((cmd, index) => (
                <button
                  key={cmd.command}
                  onClick={() => {
                    const words = message.split(' ');
                    words[words.length - 1] = cmd.command + ' ';
                    setMessage(words.join(' '));
                    setShowSlashCommands(false);
                    textareaRef.current?.focus();
                  }}
                  className={`
                    w-full px-3 py-2 text-left text-sm flex items-center gap-2
                    ${index === selectedCommandIndex 
                      ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }
                  `}
                >
                  <span>{cmd.icon}</span>
                  <span className="font-mono font-semibold">{cmd.command}</span>
                  <span className="text-gray-500 dark:text-gray-400">— {cmd.label}</span>
                </button>
              ))}
          </div>
        )}

        <div className="relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder()}
            disabled={disabled || isGenerating}
            rows={1}
            className="w-full px-3 py-2.5 pr-24 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none max-h-32 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-2">
            {charCount > 0 && (
              <span className="text-xs text-gray-400 dark:text-gray-500">{charCount}</span>
            )}
            {isGenerating && onStop ? (
              <button
                onClick={onStop}
                className="p-1.5 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded transition-colors"
                title="Stop generating"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!message.trim() || disabled}
                className="p-1.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Send message"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs">Enter</kbd> to send · <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs">Shift+Enter</kbd> for new line
          </p>
        </div>
      </div>
    </div>
  );
}


