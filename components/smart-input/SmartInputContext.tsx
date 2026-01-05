'use client';

import { 
  createContext, 
  useContext, 
  useState, 
  useCallback, 
  useRef, 
  type ReactNode,
  type RefObject,
  useMemo,
} from 'react';

export interface FileAttachment {
  id: string;
  file: File;
  preview?: string;
  type: 'image' | 'document';
}

export interface SmartInputContextValue {
  // Text state
  value: string;
  setValue: (value: string) => void;
  
  // Cursor/selection
  selectionStart: number;
  selectionEnd: number;
  setSelection: (start: number, end: number) => void;
  
  // Slash commands
  showCommands: boolean;
  setShowCommands: (show: boolean) => void;
  commandQuery: string;
  setCommandQuery: (query: string) => void;
  selectedCommandIndex: number;
  setSelectedCommandIndex: React.Dispatch<React.SetStateAction<number>>;
  
  // Markdown preview
  showMarkdownPreview: boolean;
  setShowMarkdownPreview: (show: boolean) => void;
  
  // Files/attachments
  files: FileAttachment[];
  addFiles: (files: File[]) => void;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  
  // Input ref for programmatic control
  inputRef: RefObject<HTMLTextAreaElement | null>;
  
  // Methods
  insertText: (text: string, replacePrevious?: number) => void;
  focus: () => void;
  clear: () => void;
  
  // State
  isDisabled: boolean;
  setIsDisabled: (disabled: boolean) => void;
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;
}

const SmartInputContext = createContext<SmartInputContextValue | null>(null);

export interface SmartInputProviderProps {
  children: ReactNode;
  initialValue?: string;
  onValueChange?: (value: string) => void;
}

export function SmartInputProvider({ 
  children, 
  initialValue = '',
  onValueChange,
}: SmartInputProviderProps) {
  const [value, setValueInternal] = useState(initialValue);
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);
  const [showCommands, setShowCommands] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [isDisabled, setIsDisabled] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const setValue = useCallback((newValue: string) => {
    setValueInternal(newValue);
    onValueChange?.(newValue);
  }, [onValueChange]);
  
  const setSelection = useCallback((start: number, end: number) => {
    setSelectionStart(start);
    setSelectionEnd(end);
    
    if (inputRef.current) {
      inputRef.current.setSelectionRange(start, end);
    }
  }, []);
  
  const addFiles = useCallback((newFiles: File[]) => {
    const attachments: FileAttachment[] = newFiles.map(file => ({
      id: crypto.randomUUID(),
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      type: file.type.startsWith('image/') ? 'image' : 'document',
    }));
    
    setFiles(prev => [...prev, ...attachments]);
  }, []);
  
  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  }, []);
  
  const clearFiles = useCallback(() => {
    setFiles(prev => {
      prev.forEach(f => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });
      return [];
    });
  }, []);
  
  const insertText = useCallback((text: string, replacePrevious = 0) => {
    const input = inputRef.current;
    if (!input) return;
    
    const start = input.selectionStart - replacePrevious;
    const end = input.selectionEnd;
    const currentValue = input.value;
    
    const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);
    setValue(newValue);
    
    // Set cursor position after inserted text
    requestAnimationFrame(() => {
      const newPosition = start + text.length;
      input.setSelectionRange(newPosition, newPosition);
      input.focus();
    });
  }, [setValue]);
  
  const focus = useCallback(() => {
    inputRef.current?.focus();
  }, []);
  
  const clear = useCallback(() => {
    setValue('');
    clearFiles();
    setShowCommands(false);
    setCommandQuery('');
  }, [setValue, clearFiles]);
  
  const contextValue = useMemo<SmartInputContextValue>(() => ({
    value,
    setValue,
    selectionStart,
    selectionEnd,
    setSelection,
    showCommands,
    setShowCommands,
    commandQuery,
    setCommandQuery,
    selectedCommandIndex,
    setSelectedCommandIndex,
    showMarkdownPreview,
    setShowMarkdownPreview,
    files,
    addFiles,
    removeFile,
    clearFiles,
    inputRef,
    insertText,
    focus,
    clear,
    isDisabled,
    setIsDisabled,
    isGenerating,
    setIsGenerating,
  }), [
    value, setValue, selectionStart, selectionEnd, setSelection,
    showCommands, commandQuery, selectedCommandIndex, showMarkdownPreview,
    files, addFiles, removeFile, clearFiles, insertText, focus, clear,
    isDisabled, isGenerating
  ]);
  
  return (
    <SmartInputContext.Provider value={contextValue}>
      {children}
    </SmartInputContext.Provider>
  );
}

export function useSmartInput() {
  const context = useContext(SmartInputContext);
  if (!context) {
    throw new Error('useSmartInput must be used within a SmartInputProvider');
  }
  return context;
}

export function useOptionalSmartInput() {
  return useContext(SmartInputContext);
}























