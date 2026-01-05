'use client';

import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle, useMemo } from 'react';
import { QUICK_ACTION_PROMPTS } from '@/lib/prompt-templates';
import { ConversationMode, EmailType } from '@/types';
import { useEnabledModels } from '@/hooks/useEnabledModels';
import { SpeechButton } from './chat/SpeechButton';
import { InlineModelPicker } from './ModelPicker';
import { LayoutTemplate, Mail, GitMerge, PaperclipIcon, XIcon, FileTextIcon, ImageIcon, Upload, Quote, ChevronDown, Check, MailOpen, ArrowUp, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SaveIndicator, type SaveStatus } from '@/components/ui/save-indicator';
import EmailReferencePicker, { EmailReference } from './chat/EmailReferencePicker';
import InlineModePicker from './modes/InlineModePicker';
import { 
  SmartInputProvider, 
  useSmartInput, 
  SlashCommandMenu,
  TipTapEditor,
  type TipTapEditorHandle,
  filterCommands,
  findCommand as baseFindCommand,
  type SlashCommand 
} from './smart-input';
import { useShortcutCommands } from '@/hooks/useShortcutCommands';

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
  onEmailTypeChange?: (type: EmailType) => void | Promise<boolean>;
  hasMessages?: boolean;
  autoFocus?: boolean;
  onStartFlow?: () => void;
  quotedText?: string;
  onClearQuote?: () => void;
  placeholder?: string;
  isSimpleMode?: boolean;
  /** Enable markdown preview while typing */
  showMarkdownPreview?: boolean;
}

export interface ChatInputHandle {
  addFiles: (files: File[]) => void;
  focus: () => void;
}

/**
 * Enhanced ChatInput using SmartInput primitives
 * Provides live markdown preview, smart slash commands, and all existing functionality
 */
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
  showMarkdownPreview = true,
}, ref) {
  return (
    <SmartInputProvider initialValue={draftContent} onValueChange={onDraftChange}>
      <ChatInputInternal
        ref={ref}
        onSend={onSend}
        onStop={onStop}
        disabled={disabled}
        isGenerating={isGenerating}
        conversationId={conversationId}
        brandId={brandId}
        mode={mode}
        draftContent={draftContent}
        onDraftChange={onDraftChange}
        onModeChange={onModeChange}
        placeholder={customPlaceholder}
        isSimpleMode={isSimpleMode}
        selectedModel={selectedModel}
        onModelChange={onModelChange}
        emailType={emailType}
        onEmailTypeChange={onEmailTypeChange}
        hasMessages={hasMessages}
        autoFocus={autoFocus}
        onStartFlow={onStartFlow}
        quotedText={quotedText}
        onClearQuote={onClearQuote}
        showMarkdownPreview={showMarkdownPreview}
      />
    </SmartInputProvider>
  );
});

/**
 * Internal ChatInput that uses SmartInput context
 */
const ChatInputInternal = forwardRef<ChatInputHandle, ChatInputProps>(function ChatInputInternal({ 
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
  quotedText,
  onClearQuote,
  showMarkdownPreview = true,
}, ref) {
  const {
    value: message,
    setValue: setMessage,
    files,
    addFiles,
    removeFile,
    clearFiles,
    showCommands: showSlashCommands,
    setShowCommands: setShowSlashCommands,
    commandQuery,
    setCommandQuery,
    selectedCommandIndex,
    setSelectedCommandIndex,
    clear,
  } = useSmartInput();
  
  const editorRef = useRef<TipTapEditorHandle>(null);

  // Determine if email type picker should be shown
  // Only show for regular email_copy mode (custom modes don't have email format settings)
  const shouldShowEmailTypePicker = useMemo(() => {
    return mode === 'email_copy';
  }, [mode]);

  const [emailReferences, setEmailReferences] = useState<EmailReference[]>([]);
  const [showEmailPicker, setShowEmailPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showEmailTypePicker, setShowEmailTypePicker] = useState(false);
  const [selectedEmailTypeIndex, setSelectedEmailTypeIndex] = useState(0);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [interimVoiceText, setInterimVoiceText] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emailTypePickerRef = useRef<HTMLDivElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onDraftChangeRef = useRef(onDraftChange);
  const justSentRef = useRef(false);
  const dragCounter = useRef(0);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    addFiles: (newFiles: File[]) => addFiles(newFiles),
    focus: () => editorRef.current?.focus(),
  }), [addFiles]);

  // Use user's enabled AI models (respects settings preferences)
  const { models: enabledModels, defaultModel } = useEnabledModels();
  // Use ALL enabled models (no artificial limit)

  // Get user's custom shortcuts as slash commands
  const { shortcutCommands, filterCommands: filterAllCommands, findCommand } = useShortcutCommands({ mode });

  const emailTypes = [
    { id: 'design' as const, name: 'Design', description: 'Full structured marketing email', icon: LayoutTemplate },
    { id: 'letter' as const, name: 'Letter', description: 'Short personal letter', icon: Mail },
    { id: 'flow' as const, name: 'Flow', description: 'Multi-email automation', icon: GitMerge },
  ];

  const availableEmailTypes = emailTypes;

  const getEmailTypeName = (type: string) => {
    return emailTypes.find(t => t.id === type)?.name || 'Design';
  };

  // Sync draftContent with message
  useEffect(() => {
    if (draftContent !== message) {
      setMessage(draftContent);
    }
  }, [draftContent]);

  useEffect(() => {
    onDraftChangeRef.current = onDraftChange;
  }, [onDraftChange]);


  // Close pickers on outside click
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

  // Keyboard navigation for email type picker
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
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

    if (showEmailTypePicker) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showEmailTypePicker, selectedEmailTypeIndex, availableEmailTypes, onEmailTypeChange]);

  // Reset selected index when opening email type picker
  useEffect(() => {
    if (showEmailTypePicker) {
      const currentIndex = availableEmailTypes.findIndex(t => t.id === emailType);
      setSelectedEmailTypeIndex(currentIndex >= 0 ? currentIndex : 0);
    }
  }, [showEmailTypePicker, emailType, availableEmailTypes]);

  // Get filtered commands for current query (includes user shortcuts)
  const filteredCommands = useMemo(() => {
    return filterAllCommands(commandQuery);
  }, [commandQuery, filterAllCommands]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
      e.dataTransfer.clearData();
    }
  }, [addFiles]);

  const handleSend = useCallback(() => {
    if ((message.trim() || files.length > 0 || quotedText || emailReferences.length > 0) && !disabled) {
      const trimmed = message.trim();
      let finalMessage = trimmed;

      // Check for slash commands
      if (trimmed.startsWith('/')) {
        const commandStr = trimmed.split(' ')[0].toLowerCase();
        const command = findCommand(commandStr);
        
        if (command?.prompt) {
          finalMessage = command.prompt;
        } else {
          // Legacy command support
          if (commandStr === '/shorten') finalMessage = QUICK_ACTION_PROMPTS.make_shorter;
          else if (commandStr === '/urgent') finalMessage = QUICK_ACTION_PROMPTS.add_urgency;
          else if (commandStr === '/casual') finalMessage = QUICK_ACTION_PROMPTS.change_tone_casual;
          else if (commandStr === '/professional') finalMessage = QUICK_ACTION_PROMPTS.change_tone_professional;
          else if (commandStr === '/proof') finalMessage = QUICK_ACTION_PROMPTS.add_social_proof;
          else if (commandStr === '/cta') finalMessage = QUICK_ACTION_PROMPTS.improve_cta;
        }
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
      editorRef.current?.clear(); // Clear TipTap editor

      if (onDraftChange) onDraftChange('');
      setSaveStatus('idle');
      setLastSavedTimestamp(null);
      
      onSend(finalMessage, files.length > 0 ? files.map(f => f.file) : undefined);
      clearFiles();
      setEmailReferences([]);
      
      setTimeout(() => {
        justSentRef.current = false;
      }, 100);
    }
  }, [message, files, quotedText, emailReferences, disabled, onClearQuote, onDraftChange, onSend, setMessage, clearFiles]);

  const debouncedSave = useCallback((value: string) => {
    if (justSentRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    if (value.trim()) {
      setSaveStatus('saving');
      saveTimeoutRef.current = setTimeout(() => {
        if (!justSentRef.current && onDraftChangeRef.current) {
          onDraftChangeRef.current(value);
          setLastSavedTimestamp(Date.now());
          setSaveStatus('saved');
        } else {
          setSaveStatus('idle');
        }
      }, 1000);
    } else {
      setSaveStatus('idle');
      setLastSavedTimestamp(null);
    }
  }, []);

  // Detect slash commands in input
  const detectSlashCommand = useCallback((text: string) => {
    // Check if the last word (or whole text) starts with /
    const words = text.split(/[\s\n]/);
    const lastWord = words[words.length - 1] || '';
    
    if (lastWord.startsWith('/')) {
      setShowSlashCommands(true);
      setCommandQuery(lastWord);
    } else {
      setShowSlashCommands(false);
      setCommandQuery('');
    }
  }, [setShowSlashCommands, setCommandQuery]);

  const handleInput = (newValue: string) => {
    setMessage(newValue);
    debouncedSave(newValue);
    detectSlashCommand(newValue);
  };

  // Handle command selection
  const handleCommandSelect = useCallback((command: SlashCommand) => {
    // Find where the slash command starts in the message
    const lastSlashIndex = message.lastIndexOf('/');
    const beforeSlash = lastSlashIndex >= 0 ? message.slice(0, lastSlashIndex) : message;
    
    if (command.isFormatting && command.syntax) {
      // For formatting commands, replace the /command with the syntax
      const newValue = beforeSlash + command.syntax;
      setMessage(newValue);
      editorRef.current?.setContent(newValue);
    } else {
      // For action commands, replace with the command (user will press enter to execute)
      const newValue = beforeSlash + command.command + ' ';
      setMessage(newValue);
      editorRef.current?.setContent(newValue);
    }
    
    // Focus back on editor
    setTimeout(() => editorRef.current?.focus(), 0);
    
    setShowSlashCommands(false);
    setCommandQuery('');
    setSelectedCommandIndex(0);
  }, [message, setMessage, setShowSlashCommands, setCommandQuery, setSelectedCommandIndex]);

  // Handle keyboard events from TipTap editor
  const handleEditorKeyDown = useCallback((e: KeyboardEvent): boolean | void => {
    // Don't interfere with Shift+Enter (handled by TipTap for list continuation)
    if (e.key === 'Enter' && e.shiftKey) {
      return false; // Let TipTap handle it
    }
    
    // Slash command navigation
    if (showSlashCommands && filteredCommands.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCommandIndex((prev: number) => Math.min(prev + 1, filteredCommands.length - 1));
        return true;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCommandIndex((prev: number) => Math.max(prev - 1, 0));
        return true;
      } else if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        const selectedCommand = filteredCommands[selectedCommandIndex];
        if (selectedCommand) {
          handleCommandSelect(selectedCommand);
        }
        return true;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowSlashCommands(false);
        setCommandQuery('');
        return true;
      }
    }

    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      // Get current content directly from editor to avoid stale state
      const currentContent = editorRef.current?.getMarkdown() || message;
      if (!isGenerating && currentContent.trim()) {
        e.preventDefault();
        handleSend();
        return true; // Prevent TipTap default behavior
      }
    }
    
    return false;
  }, [showSlashCommands, filteredCommands, selectedCommandIndex, isGenerating, message, handleCommandSelect, handleSend, setSelectedCommandIndex, setShowSlashCommands, setCommandQuery]);

  const getPlaceholder = () => {
    if (customPlaceholder) return customPlaceholder;
    if (mode === 'planning') return "Ask a question, explore ideas, or plan a campaign...";
    if (mode === 'flow') return "Describe the automation flow you want to create...";
    return "Describe the email you'd like to create... (type / for commands)";
  };

  return (
    <div className="relative px-4 sm:px-6 lg:px-8 pt-0 pb-4 sm:pb-6 bg-transparent">
      <div className="max-w-5xl mx-auto relative">
        
        {/* Slash Command Menu */}
        {showSlashCommands && filteredCommands.length > 0 && (
          <SlashCommandMenu 
            onSelectCommand={handleCommandSelect} 
            additionalCommands={shortcutCommands}
          />
        )}

        {/* Main Input Card */}
        <div 
          className={cn(
            "relative bg-white dark:bg-gray-900 border rounded-xl transition-all duration-150 min-h-[98px] flex flex-col",
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
              {files.map((file) => (
                <div key={file.id} className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md text-xs group">
                  {file.type === 'image' ? <ImageIcon className="w-3 h-3 text-gray-500" /> : <FileTextIcon className="w-3 h-3 text-gray-500" />}
                  <span className="max-w-[120px] truncate text-gray-600 dark:text-gray-300">{file.file.name}</span>
                  <button 
                    onClick={() => removeFile(file.id)}
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
            <TipTapEditor
              ref={editorRef}
              value={message + (interimVoiceText ? (message ? ' ' : '') + interimVoiceText : '')}
              onChange={(val) => {
                if (!interimVoiceText) {
                  handleInput(val);
                }
              }}
              onKeyDown={handleEditorKeyDown}
              placeholder={isGenerating ? "Type your next message..." : getPlaceholder()}
              disabled={disabled}
              minHeight="24px"
              maxHeight="200px"
            />
          </div>
          
          {/* Bottom Controls Bar */}
          <div className="flex items-center justify-between px-2 sm:px-3 pb-2 mt-auto">
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
                {/* Model Picker - Uses all enabled models with search */}
                {enabledModels.length > 1 && (
                  <>
                    <InlineModelPicker
                      models={enabledModels}
                      selectedModel={selectedModel}
                      onModelChange={(modelId) => onModelChange?.(modelId)}
                    />
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

                {/* Email Type Dropdown - Show for email_copy or custom modes with email_format='any' */}
                {shouldShowEmailTypePicker && (
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
              {!isGenerating && message.length > 0 && (
                <SaveIndicator
                  status={saveStatus}
                  lastSaved={lastSavedTimestamp}
                  className="hidden sm:flex mr-1.5"
                  size="sm"
                />
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
