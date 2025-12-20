'use client';

import { useState, useRef, KeyboardEvent, useEffect, useCallback, DragEvent, forwardRef, useImperativeHandle } from 'react';
import { QUICK_ACTION_PROMPTS } from '@/lib/prompt-templates';
import { ConversationMode, EmailType, AIModel } from '@/types';
import { AI_MODELS } from '@/lib/ai-models';
import { SpeechButton } from './chat/SpeechButton';
import { LayoutTemplate, Mail, GitMerge, PaperclipIcon, XIcon, FileTextIcon, ImageIcon, Upload, Quote, ChevronDown, Check, MailOpen, ArrowUp, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import EmailReferencePicker, { EmailReference } from './chat/EmailReferencePicker';
import InlineModePicker from './modes/InlineModePicker';

interface ChatInputProps {
  onSend: (message: string, files?: File[]) => void | Promise<void>;
  onStop?: () => void;
  disabled?: boolean;
  isGenerating?: boolean;
  conversationId?: string | null;
  brandId?: string | null;
  mode?: ConversationMode;
  draftContent?: string;
  onDraftChange?: (content: string) => void;
  onModeChange?: (mode: ConversationMode) => void;
  selectedModel?: string;
  onModelChange?: (model: string) => void;
  emailType?: EmailType;
  // Async callback that returns true if flow creation was handled (to skip onStartFlow)
  onEmailTypeChange?: (type: EmailType) => void | Promise<boolean>;
  hasMessages?: boolean;
  autoFocus?: boolean;
  // Flow-specific callback - called when user selects Flow to start the conversation
  onStartFlow?: () => void;
  // Quoted text reference from email copy
  quotedText?: string;
  onClearQuote?: () => void;
  // Custom placeholder text (overrides mode-based default)
  placeholder?: string;
  // Hide the mode selector and email type controls (for Personal AI mode)
  isSimpleMode?: boolean;
}

// Expose methods to parent components via ref
export interface ChatInputHandle {
  addFiles: (files: File[]) => void;
  focus: () => void;
}

const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(function ChatInput({ 
  onSend, 
  onStop, 
  disabled, 
  isGenerating, 
  conversationId,
  brandId,
  mode = 'email_copy',
  draftContent = '',
  onDraftChange,
  onModeChange,
  placeholder: customPlaceholder,
  isSimpleMode = false,
  selectedModel = 'anthropic/claude-sonnet-4.5',
  onModelChange,
  emailType = 'design',
  onEmailTypeChange,
  hasMessages = false,
  autoFocus = false,
  onStartFlow,
  quotedText,
  onClearQuote,
}, ref) {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [emailReferences, setEmailReferences] = useState<EmailReference[]>([]);
  const [showEmailPicker, setShowEmailPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [filteredCommands, setFilteredCommands] = useState<string[]>([]);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showEmailTypePicker, setShowEmailTypePicker] = useState(false);
  const [selectedModelIndex, setSelectedModelIndex] = useState(0);
  const [selectedEmailTypeIndex, setSelectedEmailTypeIndex] = useState(0);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [interimVoiceText, setInterimVoiceText] = useState('');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelPickerRef = useRef<HTMLDivElement>(null);
  const emailTypePickerRef = useRef<HTMLDivElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onDraftChangeRef = useRef(onDraftChange);
  const justSentRef = useRef(false);

  // Expose addFiles method to parent components via ref
  useImperativeHandle(ref, () => ({
    addFiles: (newFiles: File[]) => {
      setFiles(prev => [...prev, ...newFiles]);
    },
    focus: () => {
      textareaRef.current?.focus();
    },
  }), []);

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
    { id: 'design' as const, name: 'Design', description: 'Full structured marketing email', icon: LayoutTemplate },
    { id: 'letter' as const, name: 'Letter', description: 'Short personal letter', icon: Mail },
    { id: 'flow' as const, name: 'Flow', description: 'Multi-email automation', icon: GitMerge },
  ];

  // Note: Flow filtering is temporarily removed since flow type is hidden
  // When flow is re-enabled, add back: if (hasMessages && type.id === 'flow' && emailType !== 'flow') return false;
  const availableEmailTypes = emailTypes;

  const getModelName = (modelId: string) => {
    return models.find(m => m.id === modelId)?.name || 'Sonnet 4.5';
  };

  const getEmailTypeName = (type: string) => {
    return emailTypes.find(t => t.id === type)?.name || 'Design';
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

  // Close attachment menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target as Node)) {
        setShowAttachmentMenu(false);
      }
    };
    if (showAttachmentMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAttachmentMenu]);

  // Keyboard navigation for dropdowns
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // Model picker keyboard nav
      if (showModelPicker) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedModelIndex(prev => {
            if (e.key === 'ArrowDown') return prev < models.length - 1 ? prev + 1 : 0;
            return prev > 0 ? prev - 1 : models.length - 1;
          });
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const selected = models[selectedModelIndex];
          if (selected) {
            onModelChange?.(selected.id);
            setShowModelPicker(false);
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setShowModelPicker(false);
        }
        return;
      }
      
      // Email type picker keyboard nav
      if (showEmailTypePicker) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedEmailTypeIndex(prev => {
            if (e.key === 'ArrowDown') return prev < availableEmailTypes.length - 1 ? prev + 1 : 0;
            return prev > 0 ? prev - 1 : availableEmailTypes.length - 1;
          });
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const selected = availableEmailTypes[selectedEmailTypeIndex];
          if (selected) {
            // Note: Flow-specific handling temporarily removed since flow type is hidden
            // When flow is re-enabled, add back onStartFlow logic
            onEmailTypeChange?.(selected.id);
            setShowEmailTypePicker(false);
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setShowEmailTypePicker(false);
        }
        return;
      }
    };

    if (showModelPicker || showEmailTypePicker) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showModelPicker, showEmailTypePicker, selectedModelIndex, selectedEmailTypeIndex, models, availableEmailTypes, onModelChange, onEmailTypeChange, onStartFlow]);

  // Reset selected index when opening dropdowns
  useEffect(() => {
    if (showModelPicker) {
      const currentIndex = models.findIndex(m => m.id === selectedModel);
      setSelectedModelIndex(currentIndex >= 0 ? currentIndex : 0);
    }
  }, [showModelPicker, selectedModel, models]);

  useEffect(() => {
    if (showEmailTypePicker) {
      const currentIndex = availableEmailTypes.findIndex(t => t.id === emailType);
      setSelectedEmailTypeIndex(currentIndex >= 0 ? currentIndex : 0);
    }
  }, [showEmailTypePicker, emailType, availableEmailTypes]);

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
    if ((message.trim() || files.length > 0 || quotedText || emailReferences.length > 0) && !disabled) {
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

      // Prepend email references if present
      if (emailReferences.length > 0) {
        const refBlocks = emailReferences.map((ref, idx) => {
          return `---\nReferenced Email ${idx + 1} (from "${ref.conversationTitle}"):\n${ref.content}\n---`;
        }).join('\n\n');
        finalMessage = `${refBlocks}\n\n${finalMessage}`;
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
      setEmailReferences([]);
      
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
      // Don't send while generating - user can still type
      if (!isGenerating) {
        handleSend();
      }
    }
  };

  const getPlaceholder = () => {
    if (customPlaceholder) return customPlaceholder;
    if (mode === 'planning') return "Ask a question, explore ideas, or plan a campaign...";
    if (mode === 'flow') return "Describe the automation flow you want to create...";
    return "Describe the email you'd like to create...";
  };

  return (
    <div className="relative px-4 sm:px-6 lg:px-8 pt-0 pb-4 sm:pb-6 bg-transparent">
      <div className="max-w-5xl mx-auto relative">
        
        {/* Slash Command Suggestions */}
        {showSlashCommands && (
          <div className="mb-2 bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-xl shadow-lg overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2">
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
              <p className="text-[10px] font-medium tracking-wide text-gray-400 dark:text-gray-500 uppercase">Commands</p>
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
                    "w-full px-3 py-2 text-left text-sm flex items-center gap-3 transition-colors duration-100",
                    index === selectedCommandIndex 
                      ? 'bg-gray-50 dark:bg-gray-800' 
                      : 'hover:bg-gray-50/50 dark:hover:bg-gray-800/50'
                  )}
                >
                  <span className="text-base opacity-70">{cmd.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[13px] text-gray-900 dark:text-gray-100">{cmd.command}</div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">{cmd.label}</div>
                  </div>
                </button>
              ))}
          </div>
        )}

        {/* Main Input Card */}
        <div 
          className={cn(
            "relative bg-white dark:bg-gray-900 border rounded-xl transition-all duration-150",
            isDragging 
              ? "border-gray-400 dark:border-gray-500 border-dashed bg-gray-50 dark:bg-gray-800/50" 
              : "border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700 focus-within:border-gray-300 dark:focus-within:border-gray-700 focus-within:shadow-md"
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Drag Overlay */}
          {isDragging && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
                <Upload className="w-6 h-6" />
                <span className="text-sm font-medium">Drop files here</span>
              </div>
            </div>
          )}
          
          {/* Quoted Text Reference */}
          {quotedText && (
            <div className="mx-3 mt-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex items-start gap-3 px-3 py-2.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-lg">
                <Quote className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-2">
                    "{quotedText}"
                  </p>
                </div>
                <button
                  onClick={onClearQuote}
                  className="flex-shrink-0 p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <XIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* File & Email Reference Previews */}
          {(files.length > 0 || emailReferences.length > 0) && (
            <div className="px-3 pt-3 flex flex-wrap gap-1.5">
              {files.map((file, index) => (
                <div key={`file-${index}`} className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md text-xs group">
                  {file.type.startsWith('image/') ? <ImageIcon className="w-3 h-3 text-gray-500" /> : <FileTextIcon className="w-3 h-3 text-gray-500" />}
                  <span className="max-w-[120px] truncate text-gray-600 dark:text-gray-300">{file.name}</span>
                  <button 
                    onClick={() => removeFile(index)}
                    className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <XIcon className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {emailReferences.map((ref, index) => (
                <div key={`ref-${index}`} className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md text-xs group">
                  <MailOpen className="w-3 h-3 text-gray-500" />
                  <span className="max-w-[140px] truncate text-gray-600 dark:text-gray-300" title={ref.conversationTitle}>
                    {ref.preview.slice(0, 30)}...
                  </span>
                  <button 
                    onClick={() => setEmailReferences(prev => prev.filter((_, i) => i !== index))}
                    className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <XIcon className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="px-4 pt-3 pb-2">
            <textarea
              ref={textareaRef}
              value={message + (interimVoiceText ? (message ? ' ' : '') + interimVoiceText : '')}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={isGenerating ? "Type your next message..." : getPlaceholder()}
              disabled={disabled}
              rows={1}
              className="w-full text-[15px] leading-relaxed bg-transparent border-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-0 resize-none max-h-32 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
            />
          </div>
          
          {/* Bottom Controls Bar */}
          <div className="flex items-center justify-between px-2 sm:px-3 pb-2">
            {/* Left: Attachments & Options */}
            <div className="flex items-center">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                multiple 
                onChange={handleFileSelect}
              />
              
              {/* Attachment Button */}
              <div className="relative" ref={attachmentMenuRef}>
                <button
                  onClick={() => {
                    if (!brandId) {
                      fileInputRef.current?.click();
                    } else {
                      setShowAttachmentMenu(!showAttachmentMenu);
                    }
                  }}
                  className={cn(
                    "p-1.5 rounded-md transition-colors",
                    showAttachmentMenu
                      ? "text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800"
                      : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  )}
                  title="Attach"
                >
                  <PaperclipIcon className="w-4 h-4" />
                </button>
                
                {showAttachmentMenu && (
                  <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg min-w-[180px] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-bottom-left">
                    <div className="p-1">
                      <button
                        onClick={() => {
                          fileInputRef.current?.click();
                          setShowAttachmentMenu(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <Upload className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700 dark:text-gray-200">Upload file</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowEmailPicker(true);
                          setShowAttachmentMenu(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <MailOpen className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-700 dark:text-gray-200">Reference email</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Divider */}
              {!isSimpleMode && <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />}

              {/* Options - Clean inline style */}
              {!isSimpleMode && (
              <div className="flex items-center">
                {/* Model Dropdown - First */}
                {models.length > 1 && (
                  <>
                    <div className="relative" ref={modelPickerRef}>
                      <button
                        onClick={() => setShowModelPicker(!showModelPicker)}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <span>{getModelName(selectedModel)}</span>
                        <ChevronDown className={cn("w-3 h-3 opacity-50", showModelPicker && "rotate-180")} />
                      </button>
                      
                      {showModelPicker && (
                        <div 
                          className="absolute bottom-full left-0 mb-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg min-w-[140px] z-50 p-1 animate-in fade-in zoom-in-95 duration-100 origin-bottom-left"
                          onKeyDown={(e) => {
                            if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              setSelectedModelIndex(prev => prev < models.length - 1 ? prev + 1 : 0);
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              setSelectedModelIndex(prev => prev > 0 ? prev - 1 : models.length - 1);
                            } else if (e.key === 'Enter') {
                              e.preventDefault();
                              onModelChange?.(models[selectedModelIndex].id);
                              setShowModelPicker(false);
                            } else if (e.key === 'Escape') {
                              setShowModelPicker(false);
                            }
                          }}
                          tabIndex={0}
                          ref={(el) => el?.focus()}
                        >
                          {models.map((model, index) => (
                            <button
                              key={model.id}
                              onClick={() => {
                                onModelChange?.(model.id);
                                setShowModelPicker(false);
                              }}
                              onMouseEnter={() => setSelectedModelIndex(index)}
                              className={cn(
                                "w-full px-2.5 py-1.5 text-left text-xs font-medium rounded-md flex items-center gap-2 transition-colors",
                                selectedModel === model.id && "text-gray-900 dark:text-white",
                                index === selectedModelIndex 
                                  ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white" 
                                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                              )}
                            >
                              {model.name}
                              {selectedModel === model.id && <Check className="w-3 h-3 ml-auto opacity-60" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-gray-300 dark:text-gray-700 text-xs mx-0.5">/</span>
                  </>
                )}

                {/* Mode Dropdown with Custom Modes Support - Second */}
                <InlineModePicker
                  value={mode}
                  onChange={(newMode) => onModeChange?.(newMode)}
                  disabled={hasMessages}
                  compact={false}
                  minimal={true}
                />
                
                <span className="text-gray-300 dark:text-gray-700 text-xs mx-0.5">/</span>

                {/* Email Type Dropdown - Show for email_copy and custom modes (which are based on email_copy) */}
                {(mode === 'email_copy' || mode.startsWith('custom_')) && (
                  <div className="relative" ref={emailTypePickerRef}>
                    <button
                      onClick={() => setShowEmailTypePicker(!showEmailTypePicker)}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <span>{getEmailTypeName(emailType)}</span>
                      <ChevronDown className={cn("w-3 h-3 opacity-50", showEmailTypePicker && "rotate-180")} />
                    </button>
                    
                    {showEmailTypePicker && (
                      <div 
                        className="absolute bottom-full left-0 mb-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg min-w-[120px] z-50 p-1 animate-in fade-in zoom-in-95 duration-100 origin-bottom-left"
                        onKeyDown={async (e) => {
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setSelectedEmailTypeIndex(prev => prev < availableEmailTypes.length - 1 ? prev + 1 : 0);
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setSelectedEmailTypeIndex(prev => prev > 0 ? prev - 1 : availableEmailTypes.length - 1);
                          } else if (e.key === 'Enter') {
                            e.preventDefault();
                            const selected = availableEmailTypes[selectedEmailTypeIndex];
                            onEmailTypeChange?.(selected.id);
                            setShowEmailTypePicker(false);
                          } else if (e.key === 'Escape') {
                            setShowEmailTypePicker(false);
                          }
                        }}
                        tabIndex={0}
                        ref={(el) => el?.focus()}
                      >
                        {availableEmailTypes.map((type, index) => {
                          const Icon = type.icon;
                          return (
                            <button
                              key={type.id}
                              onClick={() => {
                                onEmailTypeChange?.(type.id);
                                setShowEmailTypePicker(false);
                              }}
                              onMouseEnter={() => setSelectedEmailTypeIndex(index)}
                              className={cn(
                                "w-full px-2.5 py-1.5 text-left text-xs font-medium rounded-md flex items-center gap-2 transition-colors",
                                emailType === type.id && "text-gray-900 dark:text-white",
                                index === selectedEmailTypeIndex 
                                  ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white" 
                                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                              )}
                            >
                              <Icon className="w-3.5 h-3.5 opacity-60" />
                              {type.name}
                              {emailType === type.id && <Check className="w-3 h-3 ml-auto opacity-60" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
              )}
            </div>

            {/* Right: Voice & Send */}
            <div className="flex items-center gap-1">
              {lastSavedTime && !isGenerating && message.length > 0 && (
                <span className="text-[10px] text-gray-400 dark:text-gray-500 hidden sm:inline mr-1.5">
                  Saved {lastSavedTime}
                </span>
              )}
              
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
              
              {!isRecordingVoice && (
                <>
                  {/* Stop button - shows during generation */}
                  {isGenerating && onStop && (
                    <button
                      onClick={onStop}
                      className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-150"
                      title="Stop generating"
                    >
                      <Square className="w-3 h-3 fill-current" />
                    </button>
                  )}
                  
                  {/* Send button - hidden during generation */}
                  {!isGenerating && (
                    <button
                      onClick={handleSend}
                      disabled={(!message.trim() && files.length === 0 && !quotedText && emailReferences.length === 0) || disabled}
                      className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150",
                        (!message.trim() && files.length === 0 && !quotedText && emailReferences.length === 0) || disabled
                          ? "bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed"
                          : "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 hover:scale-105 active:scale-95 shadow-sm hover:shadow"
                      )}
                    >
                      <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Email Reference Picker Modal */}
      {brandId && (
        <EmailReferencePicker
          open={showEmailPicker}
          onOpenChange={setShowEmailPicker}
          brandId={brandId}
          currentConversationId={conversationId}
          onSelect={(reference) => {
            setEmailReferences(prev => [...prev, reference]);
          }}
        />
      )}
    </div>
  );
});

export default ChatInput;
