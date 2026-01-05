'use client';

import { 
  useState, 
  useRef, 
  useCallback, 
  useEffect,
  forwardRef,
  useImperativeHandle,
  type KeyboardEvent,
  type DragEvent,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';
import { 
  PaperclipIcon, 
  XIcon, 
  FileTextIcon, 
  ImageIcon, 
  Upload,
  ArrowUp,
  Square,
  Sparkles,
} from 'lucide-react';
import { SmartInputProvider, useSmartInput, type FileAttachment } from './SmartInputContext';
import { SlashCommandMenu, SlashCommandInline } from './SlashCommandMenu';
import { MarkdownPreview, hasSignificantMarkdown } from './MarkdownPreview';
import { findCommand, filterCommands, type SlashCommand } from './slash-commands';

// ============================================================================
// Types
// ============================================================================

export interface SmartInputHandle {
  focus: () => void;
  clear: () => void;
  addFiles: (files: File[]) => void;
  setValue: (value: string) => void;
  getValue: () => string;
}

export interface SmartInputProps {
  /** Called when user submits (Enter or send button) */
  onSubmit?: (message: string, files?: File[]) => void | Promise<void>;
  /** Called when user selects a prompt command */
  onCommandExecute?: (command: SlashCommand) => void;
  /** Called when AI is generating and user clicks stop */
  onStop?: () => void;
  /** Called when value changes */
  onChange?: (value: string) => void;
  /** Initial/controlled value */
  value?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether input is disabled */
  disabled?: boolean;
  /** Whether AI is currently generating */
  isGenerating?: boolean;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Show markdown preview while typing */
  showMarkdownPreview?: boolean;
  /** Preview mode: inline or floating */
  markdownPreviewMode?: 'inline' | 'floating' | 'auto';
  /** Show slash command suggestions */
  enableSlashCommands?: boolean;
  /** Slash command menu style */
  slashCommandStyle?: 'full' | 'inline';
  /** Enable file attachments */
  enableAttachments?: boolean;
  /** Maximum file size in bytes */
  maxFileSize?: number;
  /** Accepted file types */
  acceptedFileTypes?: string;
  /** Custom className for the container */
  className?: string;
  /** Custom className for the textarea */
  textareaClassName?: string;
  /** Min height of textarea */
  minHeight?: string;
  /** Max height of textarea */
  maxHeight?: string;
  /** Render custom header content */
  renderHeader?: () => ReactNode;
  /** Render custom footer/toolbar content */
  renderFooter?: () => ReactNode;
  /** Render custom left toolbar items */
  renderLeftTools?: () => ReactNode;
  /** Render custom right toolbar items (before send button) */
  renderRightTools?: () => ReactNode;
  /** Children to render inside the input container */
  children?: ReactNode;
}

// ============================================================================
// Internal Input Component (uses context)
// ============================================================================

interface SmartInputInternalProps extends Omit<SmartInputProps, 'value' | 'onChange'> {}

const SmartInputInternal = forwardRef<SmartInputHandle, SmartInputInternalProps>(function SmartInputInternal({
  onSubmit,
  onCommandExecute,
  onStop,
  placeholder = 'Type your message... (use / for commands)',
  disabled = false,
  isGenerating = false,
  autoFocus = false,
  showMarkdownPreview: showPreviewProp = true,
  markdownPreviewMode = 'auto',
  enableSlashCommands = true,
  slashCommandStyle = 'full',
  enableAttachments = true,
  maxFileSize,
  acceptedFileTypes,
  className,
  textareaClassName,
  minHeight = '24px',
  maxHeight = '200px',
  renderHeader,
  renderFooter,
  renderLeftTools,
  renderRightTools,
  children,
}, ref) {
  const {
    value,
    setValue,
    showCommands,
    setShowCommands,
    commandQuery,
    setCommandQuery,
    selectedCommandIndex,
    setSelectedCommandIndex,
    files,
    addFiles,
    removeFile,
    inputRef,
    clear,
    focus,
    setIsGenerating,
    setIsDisabled,
  } = useSmartInput();
  
  const [isDragging, setIsDragging] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  
  // Sync external props with context
  useEffect(() => {
    setIsGenerating(isGenerating);
  }, [isGenerating, setIsGenerating]);
  
  useEffect(() => {
    setIsDisabled(disabled);
  }, [disabled, setIsDisabled]);
  
  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    focus,
    clear,
    addFiles,
    setValue,
    getValue: () => value,
  }), [focus, clear, addFiles, setValue, value]);
  
  // Auto-focus
  useEffect(() => {
    if (autoFocus) {
      focus();
    }
  }, [autoFocus, focus]);
  
  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, parseInt(maxHeight))}px`;
    }
  }, [inputRef, maxHeight]);
  
  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);
  
  // Determine if we should show markdown preview
  useEffect(() => {
    if (!showPreviewProp) {
      setShowPreview(false);
      return;
    }
    
    if (markdownPreviewMode === 'auto') {
      setShowPreview(hasSignificantMarkdown(value));
    } else {
      setShowPreview(showPreviewProp && value.length > 0);
    }
  }, [value, showPreviewProp, markdownPreviewMode]);
  
  // Handle slash commands detection
  const detectSlashCommand = useCallback((text: string, cursorPos: number) => {
    if (!enableSlashCommands) return;
    
    // Find the start of the current word
    const beforeCursor = text.slice(0, cursorPos);
    const lastSpaceIndex = beforeCursor.lastIndexOf(' ');
    const lastNewlineIndex = beforeCursor.lastIndexOf('\n');
    const wordStart = Math.max(lastSpaceIndex, lastNewlineIndex) + 1;
    const currentWord = beforeCursor.slice(wordStart);
    
    if (currentWord.startsWith('/')) {
      setShowCommands(true);
      setCommandQuery(currentWord);
    } else {
      setShowCommands(false);
      setCommandQuery('');
    }
  }, [enableSlashCommands, setShowCommands, setCommandQuery]);
  
  // Handle input change
  const handleChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    detectSlashCommand(newValue, e.target.selectionStart);
  }, [setValue, detectSlashCommand]);
  
  // Handle command selection
  const handleCommandSelect = useCallback((command: SlashCommand) => {
    if (command.isFormatting && command.syntax) {
      // For formatting commands, insert the syntax
      const textarea = inputRef.current;
      if (textarea) {
        const beforeCursor = value.slice(0, textarea.selectionStart);
        const lastSpaceIndex = Math.max(beforeCursor.lastIndexOf(' '), beforeCursor.lastIndexOf('\n')) + 1;
        const syntax = command.syntax || '';
        const newValue = value.slice(0, lastSpaceIndex) + syntax + value.slice(textarea.selectionStart);
        setValue(newValue);

        // Position cursor after inserted syntax
        requestAnimationFrame(() => {
          const newPos = lastSpaceIndex + syntax.length;
          textarea.setSelectionRange(newPos, newPos);
          textarea.focus();
        });
      }
    } else if (command.prompt) {
      // For prompt commands, either replace or call handler
      if (onCommandExecute) {
        onCommandExecute(command);
      } else {
        // Replace the command text with the prompt
        const textarea = inputRef.current;
        if (textarea) {
          const beforeCursor = value.slice(0, textarea.selectionStart);
          const lastSpaceIndex = Math.max(beforeCursor.lastIndexOf(' '), beforeCursor.lastIndexOf('\n')) + 1;
          setValue(value.slice(0, lastSpaceIndex) + command.prompt + value.slice(textarea.selectionStart));
        }
      }
    }
    
    setShowCommands(false);
    setCommandQuery('');
    setSelectedCommandIndex(0);
  }, [value, setValue, inputRef, onCommandExecute, setShowCommands, setCommandQuery, setSelectedCommandIndex]);
  
  // Handle keyboard events
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Slash command navigation
    if (showCommands) {
      const filteredCommands = filterCommands(commandQuery);
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCommandIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCommandIndex(prev => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        const selectedCommand = filteredCommands[selectedCommandIndex];
        if (selectedCommand) {
          handleCommandSelect(selectedCommand);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowCommands(false);
        setCommandQuery('');
        return;
      }
    }
    
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey && !isGenerating) {
      e.preventDefault();
      handleSubmit();
    }
  }, [showCommands, commandQuery, selectedCommandIndex, isGenerating, setSelectedCommandIndex, setShowCommands, setCommandQuery, handleCommandSelect]);
  
  // Handle submit
  const handleSubmit = useCallback(() => {
    const trimmedValue = value.trim();
    if (!trimmedValue && files.length === 0) return;
    if (disabled || isGenerating) return;
    
    // Check if it's a slash command
    if (trimmedValue.startsWith('/')) {
      const command = findCommand(trimmedValue.split(' ')[0]);
      if (command && command.prompt) {
        if (onCommandExecute) {
          onCommandExecute(command);
        } else if (onSubmit) {
          onSubmit(command.prompt, files.map(f => f.file));
        }
        clear();
        return;
      }
    }
    
    if (onSubmit) {
      onSubmit(trimmedValue, files.length > 0 ? files.map(f => f.file) : undefined);
    }
    clear();
  }, [value, files, disabled, isGenerating, onSubmit, onCommandExecute, clear]);
  
  // Drag and drop handlers
  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items?.length) {
      setIsDragging(true);
    }
  }, []);
  
  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);
  
  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  
  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    
    if (e.dataTransfer.files?.length) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      addFiles(droppedFiles);
    }
  }, [addFiles]);
  
  // File input handler
  const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      addFiles(Array.from(e.target.files));
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [addFiles]);
  
  const canSubmit = (value.trim() || files.length > 0) && !disabled;
  
  return (
    <div className={cn("relative", className)}>
      {/* Slash Command Menu */}
      {slashCommandStyle === 'full' && (
        <SlashCommandMenu onSelectCommand={handleCommandSelect} />
      )}
      
      {/* Main Input Card */}
      <div
        className={cn(
          "relative bg-white dark:bg-gray-900 border rounded-xl transition-all duration-150",
          isDragging
            ? "border-gray-400 dark:border-gray-500 border-dashed bg-gray-50 dark:bg-gray-800/50"
            : "border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700 focus-within:border-gray-300 dark:focus-within:border-gray-700 focus-within:shadow-md"
        )}
        onDragEnter={enableAttachments ? handleDragEnter : undefined}
        onDragLeave={enableAttachments ? handleDragLeave : undefined}
        onDragOver={enableAttachments ? handleDragOver : undefined}
        onDrop={enableAttachments ? handleDrop : undefined}
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
        
        {/* Custom Header */}
        {renderHeader?.()}
        
        {/* Children (e.g., quoted text, email references) */}
        {children}
        
        {/* File Attachments Preview */}
        {files.length > 0 && (
          <div className="px-3 pt-3 flex flex-wrap gap-1.5">
            {files.map((file) => (
              <FileAttachmentChip
                key={file.id}
                file={file}
                onRemove={() => removeFile(file.id)}
              />
            ))}
          </div>
        )}
        
        {/* Textarea */}
        <div className="px-4 pt-3 pb-2">
          <textarea
            ref={inputRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={isGenerating ? "AI is generating..." : placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              "w-full text-[15px] leading-relaxed bg-transparent border-none",
              "text-gray-900 dark:text-gray-100",
              "placeholder:text-gray-400 dark:placeholder:text-gray-500",
              "focus:outline-none focus:ring-0 resize-none",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              textareaClassName
            )}
            style={{ 
              minHeight,
              maxHeight,
              border: 'none', 
              outline: 'none', 
              boxShadow: 'none' 
            }}
          />
        </div>
        
        {/* Inline slash command suggestions */}
        {slashCommandStyle === 'inline' && showCommands && (
          <SlashCommandInline onSelectCommand={handleCommandSelect} />
        )}
        
        {/* Markdown Preview */}
        {showPreview && <MarkdownPreview content={value} />}
        
        {/* Bottom Toolbar */}
        <div className="flex items-center justify-between px-2 sm:px-3 pb-2">
          {/* Left Tools */}
          <div className="flex items-center">
            {/* File Input */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              accept={acceptedFileTypes}
              onChange={handleFileSelect}
            />
            
            {/* Attachment Button */}
            {enableAttachments && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
                  "hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
                title="Attach files"
              >
                <PaperclipIcon className="w-4 h-4" />
              </button>
            )}
            
            {/* Custom Left Tools */}
            {renderLeftTools?.()}
          </div>
          
          {/* Right Tools */}
          <div className="flex items-center gap-1">
            {/* Custom Right Tools */}
            {renderRightTools?.()}
            
            {/* Stop Button (during generation) */}
            {isGenerating && onStop && (
              <button
                type="button"
                onClick={onStop}
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-150"
                title="Stop generating"
              >
                <Square className="w-3 h-3 fill-current" />
              </button>
            )}
            
            {/* Send Button */}
            {!isGenerating && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150",
                  canSubmit
                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 hover:scale-105 active:scale-95 shadow-sm hover:shadow"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed"
                )}
              >
                <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
        
        {/* Custom Footer */}
        {renderFooter?.()}
      </div>
    </div>
  );
});

// ============================================================================
// File Attachment Chip
// ============================================================================

function FileAttachmentChip({ 
  file, 
  onRemove 
}: { 
  file: FileAttachment; 
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md text-xs group">
      {file.type === 'image' ? (
        <ImageIcon className="w-3 h-3 text-gray-500" />
      ) : (
        <FileTextIcon className="w-3 h-3 text-gray-500" />
      )}
      <span className="max-w-[120px] truncate text-gray-600 dark:text-gray-300">
        {file.file.name}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        <XIcon className="w-3 h-3" />
      </button>
    </div>
  );
}

// ============================================================================
// Main Export (with Provider wrapper)
// ============================================================================

export const SmartInput = forwardRef<SmartInputHandle, SmartInputProps>(function SmartInput({
  value,
  onChange,
  ...props
}, ref) {
  return (
    <SmartInputProvider initialValue={value} onValueChange={onChange}>
      <SmartInputInternal ref={ref} {...props} />
    </SmartInputProvider>
  );
});

// ============================================================================
// Standalone components for advanced usage
// ============================================================================

export { SmartInputProvider, useSmartInput } from './SmartInputContext';
export { SlashCommandMenu, SlashCommandInline } from './SlashCommandMenu';
export { MarkdownPreview, hasSignificantMarkdown } from './MarkdownPreview';
export * from './slash-commands';























