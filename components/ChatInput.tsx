'use client';

import { useState, useRef, KeyboardEvent, useEffect, useCallback } from 'react';
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
  brandId?: string; // Brand ID for generating contextual suggestions
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
  brandId
}: ChatInputProps) {
  // Feature flag: Set to true to re-enable suggested prompts
  const ENABLE_SUGGESTED_PROMPTS = false;
  const [message, setMessage] = useState('');
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [filteredCommands, setFilteredCommands] = useState<string[]>([]);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showEmailTypePicker, setShowEmailTypePicker] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [dynamicSuggestions, setDynamicSuggestions] = useState<Array<{ text: string; icon: string }> | null>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsKey, setSuggestionsKey] = useState(0); // Key for animation transitions
  const [isTransitioning, setIsTransitioning] = useState(false); // Track transition state
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [forceRefresh, setForceRefresh] = useState(0); // Trigger manual refresh
  const [isFallback, setIsFallback] = useState(false); // Track if using fallback suggestions
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
    { id: 'design' as const, name: 'Design Email', description: 'Full structured marketing email' },
    { id: 'letter' as const, name: 'Letter Email', description: 'Short personal letter' },
    { id: 'flow' as const, name: 'Flow', description: 'Multi-email automation sequence' },
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

  // Fetch AI-generated suggestions when brand, mode, or emailType changes
  useEffect(() => {
    // Only fetch if we have a brand and no messages (for empty conversations)
    if (!brandId || hasMessages) {
      return;
    }

    const fetchSuggestions = async () => {
      // Trigger fall-away animation for current suggestions
      if (dynamicSuggestions) {
        setIsTransitioning(true);
        // Wait for fall-away animation to complete
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      setSuggestionsLoading(true);
      setSuggestionsError(null);
      
      try {
        console.log('[Suggestions] Fetching AI suggestions...', { brandId, mode, emailType });
        
        const response = await fetch('/api/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brandId,
            mode,
            emailType,
          }),
        });

        const data = await response.json();
        
        if (response.ok) {
          console.log('[Suggestions] Received:', data);
          setDynamicSuggestions(data.suggestions);
          setIsFallback(data.fallback || false);
          setSuggestionsError(null);
          // Increment key to trigger fall-in animation for new suggestions
          setSuggestionsKey(prev => prev + 1);
          setIsTransitioning(false);
        } else {
          console.error('[Suggestions] API error:', data);
          setSuggestionsError(data.error || 'API error');
          setIsTransitioning(false);
        }
      } catch (error) {
        console.error('[Suggestions] Fetch error:', error);
        setSuggestionsError('Network error');
        setIsTransitioning(false);
        // Will fall back to static suggestions
      } finally {
        setSuggestionsLoading(false);
      }
    };

    fetchSuggestions();
  }, [brandId, mode, emailType, hasMessages, forceRefresh]); // Re-fetch when these change

  // Reset dynamic suggestions when conversation gets messages
  useEffect(() => {
    if (hasMessages) {
      setDynamicSuggestions(null);
    }
  }, [hasMessages]);

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
    // Match: optional spaces + (-, *, +, or number.) + space + content
    const listMatch = currentLine.match(/^(\s*)([-*+]|\d+\.)\s(.*)$/);
    
    if (listMatch) {
      const indent = listMatch[1];
      const marker = listMatch[2];
      const listContent = listMatch[3];
      
      // If list item has content, continue the list
      if (listContent.trim().length > 0) {
        e.preventDefault();
        
        const isNumbered = /^\d+\.$/.test(marker);
        const newMarker = isNumbered ? `${parseInt(marker) + 1}.` : marker;
        const newLine = `\n${indent}${newMarker} `;
        
        const newValue = value.substring(0, start) + newLine + value.substring(end);
        setMessage(newValue);
        
        // Set cursor and resize
        setTimeout(() => {
          const newPos = start + newLine.length;
          textarea.setSelectionRange(newPos, newPos);
          textarea.style.height = 'auto';
          textarea.style.height = textarea.scrollHeight + 'px';
        }, 0);
        
        return true;
      }
      // If list item is empty, let Shift+Enter make a normal newline
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
    const newValue = e.target.value;
    setMessage(newValue);
    
    // Debounce the save
    debouncedSave(newValue);
    
    // Auto-expand textarea
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  // Cleanup timeout on unmount and when conversationId changes
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [conversationId]);

  const charCount = message.length;

  // Contextual suggestions based on mode and conversation state
  const getContextualSuggestions = () => {
    if (hasMessages) return []; // Only show for empty conversations

    // Use dynamic AI-generated suggestions if available
    if (dynamicSuggestions && dynamicSuggestions.length > 0) {
      return dynamicSuggestions;
    }

    // Fall back to static suggestions if AI generation fails or is loading
    if (mode === 'planning') {
      return [
        { text: 'What makes a good email subject line?', icon: '💡' },
        { text: 'Help me understand our target audience', icon: '🎯' },
        { text: 'How can I improve engagement rates?', icon: '📈' },
      ];
    } else if (emailType === 'flow') {
      return [
        { text: 'Create a welcome email sequence', icon: '👋' },
        { text: 'Build a re-engagement campaign', icon: '🔄' },
        { text: 'Design an abandoned cart flow', icon: '🛒' },
      ];
    } else {
      return [
        { text: 'Write a promotional email for a sale', icon: '🎉' },
        { text: 'Create a product launch announcement', icon: '🚀' },
        { text: 'Draft a newsletter update', icon: '📧' },
      ];
    }
  };

  const suggestions = getContextualSuggestions();

  const getPlaceholder = () => {
    if (mode === 'planning') {
      return "Ask a question, explore ideas, or plan a campaign...";
    }
    if (mode === 'flow') {
      return "Describe the automation flow you want to create...";
    }
    return "Describe the email you'd like to create...";
  };

  const handleVoiceTranscript = (transcript: string) => {
    // Append transcript to current message
    const newMessage = message ? `${message} ${transcript}` : transcript;
    setMessage(newMessage);
    
    // Use debounced save for consistency with typed input
    debouncedSave(newMessage);
    
    // Auto-expand textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  };

  return (
    <div className="bg-[#fcfcfc] dark:bg-gray-900 px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="max-w-5xl mx-auto">
        {/* Contextual Suggestions - Only for empty conversations */}
        {ENABLE_SUGGESTED_PROMPTS && !hasMessages && suggestions.length > 0 && !message && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                {mode === 'planning' ? '💬 Quick Questions' : '✨ Suggested Prompts'}
              </span>
              
              {/* Tiny refresh button */}
              <button
                onClick={() => {
                  setForceRefresh(prev => prev + 1);
                }}
                disabled={suggestionsLoading}
                className="group p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh suggestions"
              >
                <svg 
                  className={`w-3 h-3 text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-all ${suggestionsLoading ? 'animate-spin' : 'group-hover:rotate-180 group-hover:scale-110'} duration-300`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              
              {isFallback && !suggestionsLoading && (
                <span 
                  className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1"
                  title="Using basic suggestions. Set ANTHROPIC_API_KEY for AI-powered suggestions."
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Basic
                </span>
              )}
              
              {suggestionsError && !suggestionsLoading && (
                <span 
                  className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1"
                  title={suggestionsError}
                >
                  ⚠️ Error
                </span>
              )}
              
              {suggestionsLoading && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Researching...</span>
                </div>
              )}
              {!suggestionsLoading && brandId && (
                <button
                  onClick={async () => {
                    // Trigger refresh animation
                    setIsTransitioning(true);
                    await new Promise(resolve => setTimeout(resolve, 300));
                    
                    setSuggestionsLoading(true);
                    try {
                      const response = await fetch('/api/suggestions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          brandId,
                          mode,
                          emailType,
                        }),
                      });

                      if (response.ok) {
                        const data = await response.json();
                        setDynamicSuggestions(data.suggestions);
                        setIsFallback(data.fallback || false);
                        setSuggestionsKey(prev => prev + 1);
                        setIsTransitioning(false);
                      }
                    } catch (error) {
                      console.error('Error refreshing suggestions:', error);
                      setIsTransitioning(false);
                    } finally {
                      setSuggestionsLoading(false);
                    }
                  }}
                  className="group p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors cursor-pointer"
                  title="Refresh suggestions"
                >
                  <svg 
                    className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors group-hover:rotate-180 transition-transform duration-500" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}
            </div>
            <div 
              key={suggestionsKey} 
              className={`flex flex-wrap gap-2 ${isTransitioning ? 'animate-fall-away' : 'animate-fall-in'}`}
              style={{ perspective: '1000px' }}
            >
              {suggestions.map((suggestion, index) => (
                <button
                  key={`${suggestionsKey}-${index}`}
                  onClick={() => {
                    setMessage(suggestion.text);
                    textareaRef.current?.focus();
                  }}
                  className="group px-4 py-2.5 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-950/30 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                  style={{ 
                    animationDelay: `${index * 100}ms`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{suggestion.icon}</span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                      {suggestion.text}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

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
              className="w-full text-sm sm:text-base leading-relaxed font-normal bg-transparent border-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-0 focus:border-none outline-none resize-none max-h-32 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
            />
          </div>
          
          {/* Bottom Controls Bar */}
          <div className="flex items-center justify-between px-4 sm:px-6 pb-3 sm:pb-4">
            {/* Left: Mode Toggle & Dropdowns */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              <div className="bg-[#f9f8f8] dark:bg-gray-700/50 border border-[rgba(0,0,0,0.02)] dark:border-gray-600 rounded-full p-0.5 flex items-center gap-0.5">
                <button
                  onClick={() => onModeChange?.('planning')}
                  disabled={hasMessages}
                  className={`
                    px-2 sm:px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-semibold transition-all duration-150
                    ${mode === 'planning'
                      ? 'bg-white dark:bg-gray-600 text-black dark:text-white shadow-sm scale-105 cursor-pointer'
                      : hasMessages
                      ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50'
                      : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-gray-200 hover:bg-white/60 dark:hover:bg-gray-600/60 hover:scale-105 cursor-pointer'
                    }
                  `}
                  title={hasMessages ? "Can't switch modes after starting conversation" : "Planning mode - brainstorm and strategize"}
                >
                  PLAN
                </button>
                <button
                  onClick={() => onModeChange?.('email_copy')}
                  disabled={hasMessages}
                  className={`
                    px-2 sm:px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-semibold transition-all duration-150 cursor-pointer
                    ${mode === 'email_copy'
                      ? 'bg-white dark:bg-gray-600 text-black dark:text-white shadow-sm scale-105'
                      : hasMessages
                      ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50'
                      : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-gray-200 hover:bg-white/60 dark:hover:bg-gray-600/60 hover:scale-105'
                    }
                  `}
                  title={hasMessages ? "Can't switch modes after starting conversation" : "Email copy mode - generate email content"}
                >
                  WRITE
                </button>
              </div>
              
              {/* Model Selector Dropdown - Only show if multiple models available */}
              {models.length > 1 && (
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
              )}

              {/* Email Type Dropdown - Only in Write Mode */}
              {mode === 'email_copy' && (
                <div className="relative hidden sm:block" ref={emailTypePickerRef}>
                  <button
                    onClick={() => setShowEmailTypePicker(!showEmailTypePicker)}
                    className="bg-[#f9f8f8] dark:bg-gray-700/50 border border-[rgba(0,0,0,0.02)] dark:border-gray-600 rounded-full px-2.5 py-1 flex items-center gap-1 hover:bg-[#f0f0f0] dark:hover:bg-gray-700 transition-colors duration-150 cursor-pointer"
                  >
                    <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">
                      {getEmailTypeName(emailType)}
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
              {/* Last saved time - subtle and static */}
              {lastSavedTime && !isGenerating && charCount > 0 && (
                <span className="text-[10px] text-gray-400 dark:text-gray-500 hidden sm:inline">
                  Saved {lastSavedTime}
                </span>
              )}
              {charCount > 0 && !lastSavedTime && (
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


