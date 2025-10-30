'use client';

import { useState, useRef, KeyboardEvent, useEffect } from 'react';
import { PROMPT_TEMPLATES, QUICK_ACTION_PROMPTS } from '@/lib/prompt-templates';
import { ConversationMode, EmailType } from '@/types';
import VoiceInput from './VoiceInput';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  isGenerating?: boolean;
  conversationId?: string | null;
  mode?: ConversationMode;
  draftContent?: string;
  onDraftChange?: (content: string) => void;
  onModeChange?: (mode: ConversationMode) => void;
  selectedModel?: string;
  onModelChange?: (model: string) => void;
  emailType?: EmailType;
  onEmailTypeChange?: (type: EmailType) => void;
  hasMessages?: boolean; // Track if conversation has any messages
}

export default function ChatInput({ 
  onSend, 
  onStop, 
  disabled, 
  isGenerating, 
  conversationId,
  mode = 'email_copy',
  draftContent = '',
  onDraftChange,
  onModeChange,
  selectedModel = 'claude-4.5-sonnet',
  onModelChange,
  emailType = 'design',
  onEmailTypeChange,
  hasMessages = false
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [filteredCommands, setFilteredCommands] = useState<string[]>([]);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showEmailTypePicker, setShowEmailTypePicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelPickerRef = useRef<HTMLDivElement>(null);
  const emailTypePickerRef = useRef<HTMLDivElement>(null);

  const slashCommands = [
    { command: '/shorten', label: 'Make it shorter', icon: '📏' },
    { command: '/urgent', label: 'Add urgency', icon: '⚡' },
    { command: '/casual', label: 'More casual tone', icon: '😊' },
    { command: '/professional', label: 'More professional', icon: '💼' },
    { command: '/proof', label: 'Add social proof', icon: '⭐' },
    { command: '/cta', label: 'Improve CTAs', icon: '🎯' },
  ];

  const models = [
    { id: 'gpt-5', name: 'GPT-5' },
    { id: 'claude-4.5-sonnet', name: 'SONNET 4.5' },
  ];

  const emailTypes = [
    { id: 'design' as const, name: 'Design Email', description: 'Full structured marketing email' },
    { id: 'letter' as const, name: 'Letter Email', description: 'Short personal letter' },
  ];

  const getModelName = (modelId: string) => {
    return models.find(m => m.id === modelId)?.name || 'SONNET 4.5';
  };

  const getEmailTypeName = (type: string) => {
    return emailTypes.find(t => t.id === type)?.name || 'Design Email';
  };

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

  // Close model picker on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelPickerRef.current && !modelPickerRef.current.contains(event.target as Node)) {
        setShowModelPicker(false);
      }
    };

    if (showModelPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showModelPicker]);

  // Close email type picker on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emailTypePickerRef.current && !emailTypePickerRef.current.contains(event.target as Node)) {
        setShowEmailTypePicker(false);
      }
    };

    if (showEmailTypePicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showEmailTypePicker]);

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
      return "Ask a question, explore ideas, or plan a campaign...";
    }
    return "Describe the email you'd like to create...";
  };

  const handleVoiceTranscript = (transcript: string) => {
    // Append transcript to current message
    const newMessage = message ? `${message} ${transcript}` : transcript;
    setMessage(newMessage);
    if (onDraftChange) {
      onDraftChange(newMessage);
    }
    // Auto-expand textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  };

  return (
    <div className="bg-[#fcfcfc] dark:bg-gray-900 px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="max-w-5xl mx-auto">
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

        {/* Main Input Card - matching Figma design */}
        <div className="bg-white dark:bg-gray-800 border border-[#e3e3e3] dark:border-gray-700 rounded-2xl sm:rounded-[20px] shadow-sm overflow-visible">
          <div className="px-4 sm:px-6 pt-3 sm:pt-4 pb-2 sm:pb-3">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder()}
              disabled={disabled || isGenerating}
              rows={1}
              className="w-full text-sm sm:text-base leading-relaxed font-normal bg-transparent border-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-0 resize-none max-h-32 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          
          {/* Bottom Controls Bar */}
          <div className="flex items-center justify-between px-4 sm:px-6 pb-3 sm:pb-4">
            {/* Left: Mode Toggle & Dropdowns */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              <div className="bg-[#f9f8f8] dark:bg-gray-700/50 border border-[rgba(0,0,0,0.02)] dark:border-gray-600 rounded-full p-0.5 flex items-center gap-0.5">
                <button
                  onClick={() => onModeChange?.('planning')}
                  disabled={mode === 'email_copy' && hasMessages}
                  className={`
                    px-2 sm:px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-semibold transition-all duration-150
                    ${mode === 'planning'
                      ? 'bg-white dark:bg-gray-600 text-black dark:text-white shadow-sm scale-105 cursor-pointer'
                      : mode === 'email_copy' && hasMessages
                      ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50'
                      : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-gray-200 hover:bg-white/60 dark:hover:bg-gray-600/60 hover:scale-105 cursor-pointer'
                    }
                  `}
                  title={mode === 'email_copy' && hasMessages ? "Can't switch to planning mode after starting write mode" : "Planning mode - brainstorm and strategize"}
                >
                  PLAN
                </button>
                <button
                  onClick={() => onModeChange?.('email_copy')}
                  className={`
                    px-2 sm:px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-semibold transition-all duration-150 cursor-pointer
                    ${mode === 'email_copy'
                      ? 'bg-white dark:bg-gray-600 text-black dark:text-white shadow-sm scale-105'
                      : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-gray-200 hover:bg-white/60 dark:hover:bg-gray-600/60 hover:scale-105'
                    }
                  `}
                  title="Email copy mode - generate email content"
                >
                  WRITE
                </button>
              </div>
              
              {/* Model Selector Dropdown */}
              <div className="relative hidden sm:block" ref={modelPickerRef}>
                <button
                  onClick={() => setShowModelPicker(!showModelPicker)}
                  className="bg-[#f9f8f8] dark:bg-gray-700/50 border border-[rgba(0,0,0,0.02)] dark:border-gray-600 rounded-full px-2.5 py-1 flex items-center gap-1 hover:bg-[#f0f0f0] dark:hover:bg-gray-700 transition-colors duration-150 cursor-pointer"
                >
                  <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">
                    {getModelName(selectedModel)}
                  </span>
                  <svg 
                    className={`w-2 h-2 text-gray-600 dark:text-gray-400 transition-transform duration-200 ${showModelPicker ? 'rotate-180' : ''}`} 
                    fill="currentColor" 
                    viewBox="0 0 10 5"
                  >
                    <path d="M0 0L5 5L10 0H0Z" />
                  </svg>
                </button>
                
                {/* Dropdown Menu */}
                {showModelPicker && (
                  <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden min-w-[140px] z-50">
                    {models.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => {
                          onModelChange?.(model.id);
                          setShowModelPicker(false);
                        }}
                        className={`
                          w-full px-3 py-2 text-left text-[10px] font-semibold transition-colors duration-150 cursor-pointer
                          ${selectedModel === model.id
                            ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }
                        `}
                      >
                        {model.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Email Type Dropdown - Only in Write Mode */}
              {mode === 'email_copy' && (
                <div className="relative hidden sm:block" ref={emailTypePickerRef}>
                  <button
                    onClick={() => setShowEmailTypePicker(!showEmailTypePicker)}
                    className="bg-[#f9f8f8] dark:bg-gray-700/50 border border-[rgba(0,0,0,0.02)] dark:border-gray-600 rounded-full px-2.5 py-1 flex items-center gap-1 hover:bg-[#f0f0f0] dark:hover:bg-gray-700 transition-colors duration-150 cursor-pointer"
                  >
                    <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">
                      {emailType === 'design' ? 'Design' : 'Letter'}
                    </span>
                    <svg 
                      className={`w-2 h-2 text-gray-600 dark:text-gray-400 transition-transform duration-200 ${showEmailTypePicker ? 'rotate-180' : ''}`} 
                      fill="currentColor" 
                      viewBox="0 0 10 5"
                    >
                      <path d="M0 0L5 5L10 0H0Z" />
                    </svg>
                  </button>
                  
                  {/* Dropdown Menu */}
                  {showEmailTypePicker && (
                    <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden min-w-[160px] z-50">
                      {emailTypes.map((type) => (
                        <button
                          key={type.id}
                          onClick={() => {
                            onEmailTypeChange?.(type.id);
                            setShowEmailTypePicker(false);
                          }}
                          className={`
                            w-full px-3 py-2 text-left transition-colors duration-150 cursor-pointer
                            ${emailType === type.id
                              ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }
                          `}
                        >
                          <div className="text-[10px] font-semibold">{type.name}</div>
                          <div className="text-[9px] text-gray-500 dark:text-gray-400 mt-0.5">{type.description}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: Voice Input & Send Button */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {charCount > 0 && (
                <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">{charCount}</span>
              )}
              
              {/* Voice Input Button */}
              {!isGenerating && (
                <VoiceInput
                  onTranscript={handleVoiceTranscript}
                  disabled={disabled}
                />
              )}
              
              {isGenerating && onStop ? (
                <button
                  onClick={onStop}
                  className="w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 active:scale-95 sm:hover:scale-105 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-full transition-all duration-150 shadow-sm hover:shadow-md cursor-pointer touch-manipulation"
                  title="Stop generating"
                >
                  <svg className="w-4 h-4 sm:w-3.5 sm:h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!message.trim() || disabled}
                  className="w-10 h-10 sm:w-9 sm:h-9 flex items-center justify-center bg-blue-600 hover:bg-blue-700 active:scale-95 sm:hover:scale-105 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-full transition-all duration-150 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:scale-100 touch-manipulation"
                  title="Send message"
                >
                  <svg className="w-4.5 h-4.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Helper text - desktop only */}
        <div className="hidden sm:flex items-center justify-between mt-2 px-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs">Enter</kbd> to send · <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs">Shift+Enter</kbd> for new line
          </p>
        </div>
      </div>
    </div>
  );
}


