'use client';

import { useState, useRef, KeyboardEvent, useEffect, useCallback, DragEvent } from 'react';
import { QUICK_ACTION_PROMPTS } from '@/lib/prompt-templates';
import { ConversationMode, EmailType, AIModel } from '@/types';
import { AI_MODELS } from '@/lib/ai-models';
import { SpeechButton } from './chat/SpeechButton';
import { LayoutTemplate, Mail, GitMerge, PaperclipIcon, XIcon, FileTextIcon, ImageIcon, SparklesIcon, Upload, Quote } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string, files?: File[]) => void;
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
  hasMessages?: boolean;
  autoFocus?: boolean;
  // Flow-specific callback - called when user selects Flow to start the conversation
  onStartFlow?: () => void;
  // Quoted text reference from email copy
  quotedText?: string;
  onClearQuote?: () => void;
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
  selectedModel = 'anthropic/claude-sonnet-4.5',
  onModelChange,
  emailType = 'design',
  onEmailTypeChange,
  hasMessages = false,
  autoFocus = false,
  onStartFlow,
  quotedText,
  onClearQuote,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [filteredCommands, setFilteredCommands] = useState<string[]>([]);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showEmailTypePicker, setShowEmailTypePicker] = useState(false);
  const [selectedEmailTypeIndex, setSelectedEmailTypeIndex] = useState(0);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [interimVoiceText, setInterimVoiceText] = useState('');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelPickerRef = useRef<HTMLDivElement>(null);
  const emailTypePickerRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onDraftChangeRef = useRef(onDraftChange);
  const justSentRef = useRef(false);

  const slashCommands = [
    { command: '/shorten', label: 'Make it shorter', icon: '📏' },
    { command: '/urgent', label: 'Add urgency', icon: '⚡' },
    { command: '/casual', label: 'More casual tone', icon: '😊' },
    { command: '/professional', label: 'More professional', icon: '💼' },
    { command: '/proof', label: 'Add social proof', icon: '⭐' },
    { command: '/cta', label: 'Improve CTAs', icon: '🎯' },
  ];

  // Use the first 4 primary models from the centralized AI_MODELS list
  const models = AI_MODELS.slice(0, 4);

  const emailTypes = [
    { id: 'design' as const, name: 'Design Email', description: 'Full structured marketing email', icon: LayoutTemplate },
    { id: 'letter' as const, name: 'Letter Email', description: 'Short personal letter', icon: Mail },
    { id: 'flow' as const, name: 'Flow', description: 'Multi-email automation sequence', icon: GitMerge },
  ];

  const availableEmailTypes = emailTypes.filter(type => {
    if (hasMessages && type.id === 'flow' && emailType !== 'flow') return false;
    return true;
  });

  const getModelName = (modelId: string) => {
    return models.find(m => m.id === modelId)?.name || 'Sonnet 4.5';
  };

  const getEmailTypeName = (type: string) => {
    if (type === 'flow') return 'Flow';
    return emailTypes.find(t => t.id === type)?.name || 'Design Email';
  };

  useEffect(() => {
    onDraftChangeRef.current = onDraftChange;
  }, [onDraftChange]);


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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Drag and drop handlers
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      setFiles(prev => [...prev, ...droppedFiles]);
      e.dataTransfer.clearData();
    }
  }, []);

  const handleSend = () => {
    if ((message.trim() || files.length > 0 || quotedText) && !disabled) {
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

      // Prepend quoted text if present
      if (quotedText) {
        const quoteBlock = `Regarding this copy:\n> "${quotedText}"\n\n`;
        finalMessage = quoteBlock + finalMessage;
        onClearQuote?.();
      }

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }

      justSentRef.current = true;
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      
      if (onDraftChange) onDraftChange('');
      setLastSavedTime(null);
      
      onSend(finalMessage, files);
      setFiles([]);
      
      setTimeout(() => {
        justSentRef.current = false;
      }, 100);
    }
  };

  const debouncedSave = useCallback((value: string) => {
    if (justSentRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    if (value.trim()) {
      saveTimeoutRef.current = setTimeout(() => {
        if (!justSentRef.current && onDraftChangeRef.current) {
          onDraftChangeRef.current(value);
          const now = new Date();
          setLastSavedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      }, 1000);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setMessage(newValue);
    debouncedSave(newValue);
    
    requestAnimationFrame(() => {
      e.target.style.height = 'auto';
      e.target.style.height = e.target.scrollHeight + 'px';
    });

    // Check for slash commands
    const lastWord = newValue.split(' ').pop() || '';
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
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Slash command navigation
    if (showSlashCommands) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCommandIndex(prev => prev < filteredCommands.length - 1 ? prev + 1 : prev);
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

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getPlaceholder = () => {
    if (mode === 'planning') return "Ask a question, explore ideas, or plan a campaign...";
    if (mode === 'flow') return "Describe the automation flow you want to create...";
    return "Describe the email you'd like to create...";
  };

  return (
    <div className="relative px-4 sm:px-6 lg:px-8 pt-0 pb-4 sm:pb-5 bg-transparent">
      <div className="max-w-5xl mx-auto relative">
        
        {/* Slash Command Suggestions */}
        {showSlashCommands && (
          <div className="mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2">
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
                  className={cn(
                    "w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition-all duration-150",
                    index === selectedCommandIndex 
                      ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-l-2 border-blue-500' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border-l-2 border-transparent'
                  )}
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

        {/* Main Input Card */}
        <div 
          className={cn(
            "relative bg-white dark:bg-gray-800 border rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500/50",
            isDragging 
              ? "border-blue-500 border-2 border-dashed bg-blue-50/50 dark:bg-blue-950/20" 
              : "border-gray-200 dark:border-gray-700"
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Drag Overlay */}
          {isDragging && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-blue-50/90 dark:bg-blue-950/90 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2 text-blue-600 dark:text-blue-400">
                <Upload className="w-8 h-8 animate-bounce" />
                <span className="text-sm font-medium">Drop files here</span>
              </div>
            </div>
          )}
          
          {/* Quoted Text Reference */}
          {quotedText && (
            <div className="mx-3 mt-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="relative group">
                {/* Subtle glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-xl blur-sm"></div>
                
                <div className="relative flex items-start gap-3 px-4 py-3 bg-gradient-to-br from-blue-50/80 to-indigo-50/50 dark:from-blue-950/40 dark:to-indigo-950/30 border border-blue-200/60 dark:border-blue-800/40 rounded-xl backdrop-blur-sm">
                  {/* Quote icon with gradient background */}
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-sm">
                      <Quote className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                  
                  {/* Quote content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600/80 dark:text-blue-400/80 mb-1">
                      Referencing copy
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed line-clamp-3 italic">
                      "{quotedText}"
                    </p>
                  </div>
                  
                  {/* Close button */}
                  <button
                    onClick={onClearQuote}
                    className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-800/60 transition-all duration-150 opacity-60 group-hover:opacity-100"
                    title="Remove quote"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* File Previews */}
          {files.length > 0 && (
            <div className="px-4 pt-4 flex flex-wrap gap-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700/50 px-3 py-1.5 rounded-lg text-xs group">
                  {file.type.startsWith('image/') ? <ImageIcon className="w-3.5 h-3.5 text-blue-500" /> : <FileTextIcon className="w-3.5 h-3.5 text-gray-500" />}
                  <span className="max-w-[150px] truncate">{file.name}</span>
                  <button 
                    onClick={() => removeFile(index)}
                    className="ml-1 p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-600"
                  >
                    <XIcon className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

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
            {/* Left: Attachments & Mode */}
            <div className="flex items-center gap-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                multiple 
                onChange={handleFileSelect}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                title="Attach files"
              >
                <PaperclipIcon className="w-4 h-4" />
              </button>

              <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>

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
                >
                  Write
                </button>
              </div>
              
              {/* Model Selector */}
              {models.length > 1 && (
                <div className="relative block" ref={modelPickerRef}>
                  <button
                    onClick={() => setShowModelPicker(!showModelPicker)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <SparklesIcon className="w-3 h-3 text-blue-500" />
                    <span className="hidden sm:inline">{getModelName(selectedModel)}</span>
                  </button>
                  
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

              {/* Email Type Selector */}
              {mode === 'email_copy' && (
                <div className="relative block" ref={emailTypePickerRef}>
                  <button
                    onClick={() => setShowEmailTypePicker(!showEmailTypePicker)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    {(() => {
                      const activeType = emailTypes.find(t => t.id === emailType);
                      const Icon = activeType?.icon || LayoutTemplate;
                      return <Icon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />;
                    })()}
                    <span className="hidden sm:inline">{getEmailTypeName(emailType)}</span>
                  </button>
                  
                  {showEmailTypePicker && (
                    <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden min-w-[280px] z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100">
                      {availableEmailTypes.map((type, index) => (
                        <button
                          key={type.id}
                          onClick={() => {
                            onEmailTypeChange?.(type.id);
                            setShowEmailTypePicker(false);
                            // When Flow is selected, trigger the flow conversation start
                            if (type.id === 'flow' && onStartFlow) {
                              // Small delay to allow mode change to propagate
                              setTimeout(() => onStartFlow(), 50);
                            }
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

            {/* Right: Voice & Send */}
            <div className="flex items-center gap-2">
              {lastSavedTime && !isGenerating && message.length > 0 && (
                <span className="text-[10px] text-muted-foreground hidden sm:inline mr-2">
                  Saved {lastSavedTime}
                </span>
              )}
              
              {!isGenerating && (
                <SpeechButton
                  onTranscript={(text, isFinal) => {
                    if (isFinal) {
                      const newMessage = message ? `${message} ${text}` : text;
                      setMessage(newMessage);
                      setInterimVoiceText('');
                      debouncedSave(newMessage);
                    } else {
                      setInterimVoiceText(text);
                    }
                  }}
                  disabled={disabled}
                  onStateChange={setIsRecordingVoice}
                />
              )}
              
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
                    disabled={(!message.trim() && files.length === 0) || disabled}
                    className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                      (!message.trim() && files.length === 0) || disabled
                        ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                        : 'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20'
                    }`}
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
