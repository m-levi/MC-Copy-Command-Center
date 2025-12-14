'use client';

import { useState, useRef, KeyboardEvent, useEffect, useCallback, DragEvent, forwardRef, useImperativeHandle } from 'react';
import { QUICK_ACTION_PROMPTS } from '@/lib/prompt-templates';
import { ConversationMode, EmailType, AIModel } from '@/types';
import { AI_MODELS } from '@/lib/ai-models';
import { SpeechButton } from './chat/SpeechButton';
import { LayoutTemplate, Mail, GitMerge, PaperclipIcon, XIcon, FileTextIcon, ImageIcon, Upload, Quote, ChevronDown, Pencil, Lightbulb, Check, MailOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import EmailReferencePicker, { EmailReference } from './chat/EmailReferencePicker';

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
  const [showModePicker, setShowModePicker] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showEmailTypePicker, setShowEmailTypePicker] = useState(false);
  const [selectedModeIndex, setSelectedModeIndex] = useState(0);
  const [selectedModelIndex, setSelectedModelIndex] = useState(0);
  const [selectedEmailTypeIndex, setSelectedEmailTypeIndex] = useState(0);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [interimVoiceText, setInterimVoiceText] = useState('');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modePickerRef = useRef<HTMLDivElement>(null);
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

  const modes = [
    { id: 'planning' as const, name: 'Chat', description: 'Ask questions & explore ideas', icon: Lightbulb },
    { id: 'email_copy' as const, name: 'Write', description: 'Generate email copy', icon: Pencil },
  ];

  const emailTypes = [
    { id: 'design' as const, name: 'Design', description: 'Full structured marketing email', icon: LayoutTemplate },
    { id: 'letter' as const, name: 'Letter', description: 'Short personal letter', icon: Mail },
    { id: 'flow' as const, name: 'Flow', description: 'Multi-email automation', icon: GitMerge },
  ];

  // Note: Flow filtering is temporarily removed since flow type is hidden
  // When flow is re-enabled, add back: if (hasMessages && type.id === 'flow' && emailType !== 'flow') return false;
  const availableEmailTypes = emailTypes;

  const getModeName = (modeId: string) => {
    return modes.find(m => m.id === modeId)?.name || 'Write';
  };

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

  // Close mode picker on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modePickerRef.current && !modePickerRef.current.contains(event.target as Node)) {
        setShowModePicker(false);
      }
    };
    if (showModePicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showModePicker]);

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
      // Mode picker keyboard nav
      if (showModePicker) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedModeIndex(prev => {
            if (e.key === 'ArrowDown') return prev < modes.length - 1 ? prev + 1 : 0;
            return prev > 0 ? prev - 1 : modes.length - 1;
          });
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const selected = modes[selectedModeIndex];
          if (selected) {
            onModeChange?.(selected.id);
            setShowModePicker(false);
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setShowModePicker(false);
        }
        return;
      }
      
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

    if (showModePicker || showModelPicker || showEmailTypePicker) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showModePicker, showModelPicker, showEmailTypePicker, selectedModeIndex, selectedModelIndex, selectedEmailTypeIndex, modes, models, availableEmailTypes, onModeChange, onModelChange, onEmailTypeChange, onStartFlow]);

  // Reset selected index when opening dropdowns
  useEffect(() => {
    if (showModePicker) {
      const currentIndex = modes.findIndex(m => m.id === mode);
      setSelectedModeIndex(currentIndex >= 0 ? currentIndex : 0);
    }
  }, [showModePicker, mode, modes]);

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
      handleSend();
    }
  };

  const getPlaceholder = () => {
    if (customPlaceholder) return customPlaceholder;
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

          {/* File & Email Reference Previews */}
          {(files.length > 0 || emailReferences.length > 0) && (
            <div className="px-4 pt-4 flex flex-wrap gap-2">
              {/* File Attachments */}
              {files.map((file, index) => (
                <div key={`file-${index}`} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700/50 px-3 py-1.5 rounded-lg text-xs group">
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
              
              {/* Email Reference Attachments */}
              {emailReferences.map((ref, index) => (
                <div key={`ref-${index}`} className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50 px-3 py-1.5 rounded-lg text-xs group">
                  <MailOpen className="w-3.5 h-3.5 text-blue-500" />
                  <span className="max-w-[180px] truncate text-blue-700 dark:text-blue-300" title={ref.conversationTitle}>
                    {ref.preview.slice(0, 40)}{ref.preview.length > 40 ? '...' : ''}
                  </span>
                  <button 
                    onClick={() => setEmailReferences(prev => prev.filter((_, i) => i !== index))}
                    className="ml-1 p-0.5 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-400 hover:text-blue-600"
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
          <div className="flex items-center justify-between px-3 sm:px-4 pb-3">
            {/* Left: Attachments & Options Pill */}
            <div className="flex items-center gap-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                multiple 
                onChange={handleFileSelect}
              />
              
              {/* Attachment Button with Menu */}
              <div className="relative" ref={attachmentMenuRef}>
                <button
                  onClick={() => {
                    // If no brandId (simple mode or no brand context), just open file picker
                    if (!brandId) {
                      fileInputRef.current?.click();
                    } else {
                      setShowAttachmentMenu(!showAttachmentMenu);
                    }
                  }}
                  className={cn(
                    "p-1.5 rounded-md cursor-pointer transition-colors",
                    showAttachmentMenu
                      ? "text-blue-500 bg-blue-50 dark:bg-blue-900/30"
                      : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  )}
                  title="Attach files or reference emails"
                >
                  <PaperclipIcon className="w-4 h-4" />
                </button>
                
                {/* Attachment Menu Dropdown */}
                {showAttachmentMenu && (
                  <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg min-w-[200px] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-bottom-left">
                    <div className="p-1">
                      <button
                        onClick={() => {
                          fileInputRef.current?.click();
                          setShowAttachmentMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors">
                          <Upload className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Upload File</p>
                          <p className="text-xs text-gray-500">Images, documents, etc.</p>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => {
                          setShowEmailPicker(true);
                          setShowAttachmentMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                          <MailOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Reference Email</p>
                          <p className="text-xs text-gray-500">From another conversation</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Options Pill Container - hidden in simple mode */}
              {!isSimpleMode && (
              <div className="flex items-center bg-gray-50 dark:bg-gray-800/60 rounded-full px-1 py-0.5 border border-gray-100 dark:border-gray-700/50">
                {/* Mode Dropdown (Plan/Write) */}
                <div className="relative" ref={modePickerRef}>
                  <button
                    onClick={() => !hasMessages && setShowModePicker(!showModePicker)}
                    disabled={hasMessages}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium select-none",
                      hasMessages
                        ? "text-gray-400 dark:text-gray-500 cursor-not-allowed"
                        : "cursor-pointer",
                      !hasMessages && showModePicker
                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                        : !hasMessages && "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                  >
                    <span>{getModeName(mode)}</span>
                    <ChevronDown className={cn("w-3 h-3", showModePicker && "rotate-180")} />
                  </button>
                  
                  {showModePicker && (
                    <div 
                      className="absolute bottom-full left-0 mb-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg min-w-[90px] z-50 p-1 outline-none animate-in fade-in zoom-in-95 duration-75 origin-bottom-left"
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setSelectedModeIndex(prev => prev < modes.length - 1 ? prev + 1 : 0);
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setSelectedModeIndex(prev => prev > 0 ? prev - 1 : modes.length - 1);
                        } else if (e.key === 'Enter') {
                          e.preventDefault();
                          onModeChange?.(modes[selectedModeIndex].id);
                          setShowModePicker(false);
                        } else if (e.key === 'Escape') {
                          setShowModePicker(false);
                        }
                      }}
                      tabIndex={0}
                      ref={(el) => el?.focus()}
                    >
                      {modes.map((m, index) => (
                        <button
                          key={m.id}
                          onClick={() => {
                            onModeChange?.(m.id);
                            setShowModePicker(false);
                          }}
                          onMouseEnter={() => setSelectedModeIndex(index)}
                          className={cn(
                            "w-full px-2.5 py-1.5 text-left text-[11px] font-medium rounded-md cursor-pointer select-none",
                            index === selectedModeIndex 
                              ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" 
                              : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                          )}
                        >
                          {m.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <span className="text-gray-300 dark:text-gray-600 text-[8px] mx-0.5">•</span>
                
                {/* Model Dropdown */}
                {models.length > 1 && (
                  <>
                    <div className="relative" ref={modelPickerRef}>
                      <button
                        onClick={() => setShowModelPicker(!showModelPicker)}
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium cursor-pointer select-none transition-colors",
                          showModelPicker
                            ? "bg-blue-500 dark:bg-blue-600 text-white"
                            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                        )}
                      >
                        <span>{getModelName(selectedModel)}</span>
                        <ChevronDown className={cn("w-3 h-3", showModelPicker && "rotate-180")} />
                      </button>
                      
                      {showModelPicker && (
                        <div 
                          className="absolute bottom-full left-0 mb-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg min-w-[120px] z-50 p-1 outline-none animate-in fade-in zoom-in-95 duration-75 origin-bottom-left"
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
                                "w-full px-2.5 py-1.5 text-left text-[11px] font-medium rounded-md cursor-pointer select-none",
                                index === selectedModelIndex 
                                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" 
                                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                              )}
                            >
                              {model.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-gray-300 dark:text-gray-600 text-[8px] mx-0.5">•</span>
                  </>
                )}

                {/* Email Type Dropdown */}
                {mode === 'email_copy' && (
                  <div className="relative" ref={emailTypePickerRef}>
                    <button
                      onClick={() => setShowEmailTypePicker(!showEmailTypePicker)}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium cursor-pointer select-none",
                        showEmailTypePicker
                          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                          : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      )}
                    >
                      <span>{getEmailTypeName(emailType)}</span>
                      <ChevronDown className={cn("w-3 h-3", showEmailTypePicker && "rotate-180")} />
                    </button>
                    
                    {showEmailTypePicker && (
                      <div 
                        className="absolute bottom-full left-0 mb-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg min-w-[90px] z-50 p-1 outline-none animate-in fade-in zoom-in-95 duration-75 origin-bottom-left"
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
                            // Note: Flow-specific handling temporarily removed since flow type is hidden
                            onEmailTypeChange?.(selected.id);
                            setShowEmailTypePicker(false);
                          } else if (e.key === 'Escape') {
                            setShowEmailTypePicker(false);
                          }
                        }}
                        tabIndex={0}
                        ref={(el) => el?.focus()}
                      >
                        {availableEmailTypes.map((type, index) => (
                          <button
                            key={type.id}
                            onClick={() => {
                              // Note: Flow-specific handling temporarily removed since flow type is hidden
                              onEmailTypeChange?.(type.id);
                              setShowEmailTypePicker(false);
                            }}
                            onMouseEnter={() => setSelectedEmailTypeIndex(index)}
                            className={cn(
                              "w-full px-2.5 py-1.5 text-left text-[11px] font-medium rounded-md cursor-pointer select-none",
                              index === selectedEmailTypeIndex 
                                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" 
                                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                            )}
                          >
                            {type.name}
                          </button>
                        ))}
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
                <span className="text-[10px] text-gray-400 hidden sm:inline mr-1">
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
                    className="flex items-center justify-center w-7 h-7 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer"
                    title="Stop generating"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  </button>
                )                 : (
                  <button
                    onClick={handleSend}
                    disabled={(!message.trim() && files.length === 0 && !quotedText && emailReferences.length === 0) || disabled}
                    className={cn(
                      "flex items-center justify-center w-7 h-7 rounded-full",
                      (!message.trim() && files.length === 0 && !quotedText && emailReferences.length === 0) || disabled
                        ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                        : "text-white bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 cursor-pointer"
                    )}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                    </svg>
                  </button>
                )
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
