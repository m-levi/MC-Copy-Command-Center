'use client';

import { useState, useRef, KeyboardEvent, useEffect, useCallback } from 'react';
import { QUICK_ACTION_PROMPTS } from '@/lib/prompt-templates';
import { ConversationMode, EmailType } from '@/types';
import VoiceInput from './VoiceInput';
import { LayoutTemplate, Mail, GitMerge } from 'lucide-react';

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
  autoFocus?: boolean; // Auto-focus the input on mount
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
  hasMessages = false,
  autoFocus = false
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [filteredCommands, setFilteredCommands] = useState<string[]>([]);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showEmailTypePicker, setShowEmailTypePicker] = useState(false);
  const [selectedEmailTypeIndex, setSelectedEmailTypeIndex] = useState(0);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [interimVoiceText, setInterimVoiceText] = useState('');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelPickerRef = useRef<HTMLDivElement>(null);
  const emailTypePickerRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onDraftChangeRef = useRef(onDraftChange);
  const justSentRef = useRef(false); // Track if message was just sent to prevent draft save

  const slashCommands = [
    { command: '/shorten', label: 'Make it shorter', icon: '📏' },
    { command: '/urgent', label: 'Add urgency', icon: '⚡' },
    { command: '/casual', label: 'More casual tone', icon: '😊' },
    { command: '/professional', label: 'More professional', icon: '💼' },
    { command: '/proof', label: 'Add social proof', icon: '⭐' },
    { command: '/cta', label: 'Improve CTAs', icon: '🎯' },
  ];

  // For writing mode (email_copy), only show Claude Sonnet 4.5
  // For planning mode, show both GPT-5 and Claude Sonnet 4.5
  const models = mode === 'planning' 
    ? [
        { id: 'gpt-5', name: 'GPT-5' },
        { id: 'claude-4.5-sonnet', name: 'SONNET 4.5' },
      ]
    : [
        { id: 'claude-4.5-sonnet', name: 'SONNET 4.5' },
      ];

  const emailTypes = [
    { id: 'design' as const, name: 'Design Email', description: 'Full structured marketing email', icon: LayoutTemplate },
    { id: 'letter' as const, name: 'Letter Email', description: 'Short personal letter', icon: Mail },
    { id: 'flow' as const, name: 'Flow', description: 'Multi-email automation sequence', icon: GitMerge },
  ];

  const getModelName = (modelId: string) => {
    return models.find(m => m.id === modelId)?.name || 'SONNET 4.5';
  };

  const getEmailTypeName = (type: string) => {
    if (type === 'flow') return 'Flow';
    return emailTypes.find(t => t.id === type)?.name || 'Design Email';
  };

  // Keep onDraftChange ref up-to-date
  useEffect(() => {
    onDraftChangeRef.current = onDraftChange;
  }, [onDraftChange]);

  // Auto-switch to Claude Sonnet 4.5 when switching from planning to writing mode
  useEffect(() => {
    if (mode === 'email_copy' && selectedModel === 'gpt-5') {
      onModelChange?.('claude-4.5-sonnet');
    }
  }, [mode, selectedModel, onModelChange]);

  // Sync with draft content from parent
  // Only update local state if draft content changes from parent
  // Don't update if we just cleared the message locally (prevents re-population bug)
  useEffect(() => {
    setMessage(draftContent);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
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

  // Handle keyboard navigation for email type picker
  useEffect(() => {
    if (!showEmailTypePicker) return;

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedEmailTypeIndex(prev => (prev + 1) % emailTypes.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedEmailTypeIndex(prev => (prev - 1 + emailTypes.length) % emailTypes.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onEmailTypeChange?.(emailTypes[selectedEmailTypeIndex].id);
        setShowEmailTypePicker(false);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowEmailTypePicker(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showEmailTypePicker, selectedEmailTypeIndex, onEmailTypeChange]); // emailTypes is static

  // Reset selection index when picker opens
  useEffect(() => {
    if (showEmailTypePicker) {
      const idx = emailTypes.findIndex(t => t.id === emailType);
      setSelectedEmailTypeIndex(idx >= 0 ? idx : 0);
    }
  }, [showEmailTypePicker]); // Only run when open state changes

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

      // CRITICAL: Cancel any pending debounced saves to prevent draft from being saved after send
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }

      // Mark that we're sending to prevent any pending saves
      justSentRef.current = true;
      
      // Clear message BEFORE calling onSend to prevent race conditions
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      
      // Clear the draft immediately via the callback
      if (onDraftChange) {
        onDraftChange('');
      }
      
      // Clear saved time indicator
      setLastSavedTime(null);
      
      // Then send the message
      onSend(finalMessage);
      
      // Reset flag after a short delay to allow for any async operations
      setTimeout(() => {
        justSentRef.current = false;
      }, 100);
    }
  };

  // Handle markdown formatting shortcuts - auto-continue lists
  const handleMarkdownShortcuts = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Only handle Shift+Enter for markdown lists
    if (e.key !== 'Enter' || !e.shiftKey) {
      return false;
    }

    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    
    // Get the current line (from last newline to cursor)
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const currentLine = value.substring(lineStart, start);
    
    // Check if current line starts with a list marker
    // Match: optional spaces + (-, *, +, •, or number.) + space + content
    const listMatch = currentLine.match(/^(\s*)([-*+•]|\d+\.)\s(.*)$/);
    
    if (listMatch) {
      const indent = listMatch[1];
      const marker = listMatch[2];
      const listContent = listMatch[3];
      
      // If list item has content, continue the list
      if (listContent.trim().length > 0) {
        e.preventDefault();
        
        const isNumbered = /^\d+\.$/.test(marker);
        // For bullet character, keep using it
        const newMarker = isNumbered ? `${parseInt(marker) + 1}.` : marker;
        const newLine = `\n${indent}${newMarker} `;
        
        const newValue = value.substring(0, start) + newLine + value.substring(end);
        const newPos = start + newLine.length;
        
        // Update value and cursor position synchronously
        textarea.value = newValue;
        textarea.setSelectionRange(newPos, newPos);
        setMessage(newValue);
        
        // Resize after state update
        requestAnimationFrame(() => {
          textarea.style.height = 'auto';
          textarea.style.height = textarea.scrollHeight + 'px';
        });
        
        return true;
      } else {
        // If list item is empty, remove the marker and exit list mode
        e.preventDefault();
        
        // Remove the current line with the marker
        const beforeMarker = value.substring(0, lineStart);
        const afterCursor = value.substring(end);
        const newValue = beforeMarker + '\n' + afterCursor;
        const newPos = lineStart + 1;
        
        // Update value and cursor position synchronously
        textarea.value = newValue;
        textarea.setSelectionRange(newPos, newPos);
        setMessage(newValue);
        
        // Resize after state update
        requestAnimationFrame(() => {
          textarea.style.height = 'auto';
          textarea.style.height = textarea.scrollHeight + 'px';
        });
        
        return true;
      }
    }
    
    return false;
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Try markdown shortcuts first (for Shift+Enter list continuation)
    if (handleMarkdownShortcuts(e)) {
      return; // Markdown handled it
    }
    
    // Handle slash commands menu
    if (showSlashCommands) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCommandIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : prev
        );
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCommandIndex(prev => prev > 0 ? prev - 1 : 0);
        return;
      } else if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        const selectedCommand = filteredCommands[selectedCommandIndex];
        if (selectedCommand) {
          const words = message.split(' ');
          words[words.length - 1] = selectedCommand + ' ';
          setMessage(words.join(' '));
          setShowSlashCommands(false);
        }
        return;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowSlashCommands(false);
        return;
      }
    }
    
    // Handle Enter key (without Shift) - send message
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Debounced save handler - only saves after user stops typing for 1 second
  // Note: onDraftChange is intentionally NOT in the dependency array to prevent
  // the debounce from being reset on every parent re-render. We use a ref instead.
  const debouncedSave = useCallback((value: string) => {
    // Don't save if message was just sent
    if (justSentRef.current) {
      return;
    }
    
    // Clear any pending save when called
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Only save if there's actual content
    if (value.trim()) {
      saveTimeoutRef.current = setTimeout(() => {
        // Double-check flag before saving (race condition protection)
        if (!justSentRef.current && onDraftChangeRef.current) {
          onDraftChangeRef.current(value);
          // Update last saved time
          const now = new Date();
          setLastSavedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      }, 1000); // Wait 1 second after user stops typing
    }
  }, []); // Empty deps - use ref to access latest onDraftChange

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let newValue = e.target.value;
    const textarea = e.target;
    const cursorPos = textarea.selectionStart;
    
    // Auto-convert bullet list markers (- or * followed by space)
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lines = textBeforeCursor.split('\n');
    const currentLine = lines[lines.length - 1];
    
    // If current line is exactly "- " or "* ", convert to bullet
    if (currentLine === '- ' || currentLine === '* ') {
      const beforeList = newValue.substring(0, cursorPos - 2);
      const afterCursor = newValue.substring(cursorPos);
      newValue = beforeList + '• ' + afterCursor;
      const newCursorPos = beforeList.length + 2;
      
      // Update textarea value directly FIRST
      textarea.value = newValue;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      
      // Then update state
      setMessage(newValue);
    } else {
      setMessage(newValue);
    }
    
    // Debounce the save
    debouncedSave(newValue);
    
    // Auto-expand textarea
    requestAnimationFrame(() => {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    });
  };

  // Cleanup timeout on unmount and when conversationId changes
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [conversationId]);

  // Auto-focus the input when requested
  useEffect(() => {
    if (autoFocus && textareaRef.current && !disabled && !isGenerating) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [autoFocus, disabled, isGenerating, conversationId]);

  const charCount = message.length;

  const getPlaceholder = () => {
    if (mode === 'planning') {
      return "Ask a question, explore ideas, or plan a campaign...";
    }
    if (mode === 'flow') {
      return "Describe the automation flow you want to create...";
    }
    return "Describe the email you'd like to create...";
  };

  const handleVoiceTranscript = (transcript: string, isFinal: boolean) => {
    if (isFinal) {
      // Append final transcript to current message
      const newMessage = message ? `${message} ${transcript}` : transcript;
      setMessage(newMessage);
      setInterimVoiceText('');
      
      // Use debounced save for consistency with typed input
      debouncedSave(newMessage);
    } else {
      // Update interim text for live preview
      setInterimVoiceText(transcript);
    }
    
    // Auto-expand textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  };

  return (
    <div className="relative px-4 sm:px-6 lg:px-8 pt-0 pb-4 sm:pb-5 bg-transparent">
      <div className="max-w-5xl mx-auto relative">
        {/* Slash Command Suggestions */}
        {showSlashCommands && (
          <div className="mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl">
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">QUICK COMMANDS</p>
            </div>
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
                    w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition-all duration-150
                    ${index === selectedCommandIndex 
                      ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-l-2 border-blue-500' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border-l-2 border-transparent'
                    }
                  `}
                >
                  <span className="text-lg">{cmd.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono font-semibold text-sm">{cmd.command}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{cmd.label}</div>
                  </div>
                </button>
              ))}
          </div>
        )}

        {/* Main Input Card - matching Figma design */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500/50">
          <div className="px-4 sm:px-6 pt-4 pb-2">
            <textarea
              ref={textareaRef}
              value={message + (interimVoiceText ? (message ? ' ' : '') + interimVoiceText : '')}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder()}
              disabled={disabled || isGenerating}
              rows={1}
              className="w-full text-[15px] sm:text-base leading-relaxed bg-transparent border-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-0 focus:border-none outline-none resize-none max-h-32 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
            />
          </div>
          
          {/* Bottom Controls Bar */}
          <div className="flex items-center justify-between px-3 sm:px-5 pb-3">
            {/* Left: Mode Toggle & Dropdowns */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-gray-100 dark:bg-gray-800/50 p-1 rounded-lg">
                <button
                  onClick={() => onModeChange?.('planning')}
                  disabled={hasMessages}
                  className={`
                    px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200
                    ${mode === 'planning'
                      ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : hasMessages
                      ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }
                  `}
                  title={hasMessages ? "Can't switch modes after starting conversation" : "Planning mode - brainstorm and strategize"}
                >
                  Plan
                </button>
                <button
                  onClick={() => onModeChange?.('email_copy')}
                  disabled={hasMessages}
                  className={`
                    px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200
                    ${mode === 'email_copy'
                      ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : hasMessages
                      ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }
                  `}
                  title={hasMessages ? "Can't switch modes after starting conversation" : "Email copy mode - generate email content"}
                >
                  Write
                </button>
              </div>
              
              {/* Model Selector Dropdown - Only show if multiple models available */}
              {models.length > 1 && (
                <div className="relative hidden sm:block" ref={modelPickerRef}>
                  <button
                    onClick={() => setShowModelPicker(!showModelPicker)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span>{getModelName(selectedModel)}</span>
                    <svg 
                      className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${showModelPicker ? 'rotate-180' : ''}`} 
                      fill="none" 
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {/* Dropdown Menu */}
                  {showModelPicker && (
                    <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden min-w-[140px] z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
                      {models.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => {
                            onModelChange?.(model.id);
                            setShowModelPicker(false);
                          }}
                          className={`
                            w-full px-3 py-2 text-left text-xs font-medium transition-colors
                            ${selectedModel === model.id
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
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
              )}

              {/* Email Type Dropdown - Only in Write Mode */}
              {mode === 'email_copy' && (
                <div className="relative hidden sm:block" ref={emailTypePickerRef}>
                  <button
                    onClick={() => setShowEmailTypePicker(!showEmailTypePicker)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    {(() => {
                      const activeType = emailTypes.find(t => t.id === emailType);
                      const Icon = activeType?.icon || LayoutTemplate;
                      return <Icon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />;
                    })()}
                    <span>{getEmailTypeName(emailType)}</span>
                    <svg 
                      className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${showEmailTypePicker ? 'rotate-180' : ''}`} 
                      fill="none" 
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {/* Dropdown Menu */}
                  {showEmailTypePicker && (
                    <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden min-w-[280px] z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100">
                      {emailTypes.map((type, index) => (
                        <button
                          key={type.id}
                          onClick={() => {
                            onEmailTypeChange?.(type.id);
                            setShowEmailTypePicker(false);
                          }}
                          onMouseEnter={() => setSelectedEmailTypeIndex(index)}
                          className={`
                            w-full px-3 py-2.5 text-left transition-all flex items-start gap-3 group
                            ${index === selectedEmailTypeIndex
                              ? 'bg-blue-50 dark:bg-blue-900/20' 
                              : ''
                            }
                          `}
                        >
                          <div className={`mt-0.5 p-1.5 rounded-md transition-colors ${
                            index === selectedEmailTypeIndex || emailType === type.id
                              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' 
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                          }`}>
                            <type.icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <div className={`text-sm font-medium ${
                              emailType === type.id 
                                ? 'text-blue-700 dark:text-blue-300' 
                                : 'text-gray-900 dark:text-gray-100'
                            }`}>
                              {type.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                              {type.description}
                            </div>
                          </div>
                          {emailType === type.id && (
                            <div className="mt-2 w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: Voice Input & Send Button */}
            <div className="flex items-center gap-2">
              {/* Last saved time - subtle and static */}
              {lastSavedTime && !isGenerating && !isRecordingVoice && charCount > 0 && (
                <span className="text-[10px] text-gray-400 dark:text-gray-500 hidden sm:inline mr-2">
                  Saved {lastSavedTime}
                </span>
              )}
              {charCount > 0 && !lastSavedTime && !isRecordingVoice && (
                <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">{charCount}</span>
              )}
              
              {/* Voice Input Button */}
              {!isGenerating && (
                <VoiceInput
                  onTranscript={handleVoiceTranscript}
                  disabled={disabled}
                  onStateChange={setIsRecordingVoice}
                />
              )}
              
              {/* Send / Stop Button - Hidden when recording */}
              {!isRecordingVoice && (
                isGenerating && onStop ? (
                  <button
                    onClick={onStop}
                    className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded-full transition-colors"
                    title="Stop generating"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={handleSend}
                    disabled={!message.trim() || disabled}
                    className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                      !message.trim() || disabled
                        ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                        : 'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20'
                    }`}
                    title="Send message"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


