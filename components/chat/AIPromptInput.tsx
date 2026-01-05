'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputButton,
  PromptInputSubmit,
  PromptInputAttachments,
  PromptInputAttachment,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionAddAttachments,
  PromptInputActionMenuItem,
  PromptInputSpeechButton,
  PromptInputSelect,
  PromptInputSelectTrigger,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectValue,
  type PromptInputMessage,
} from '@/components/ai-elements/prompt-input';
import { Loader } from '@/components/ai-elements/loader';
import { cn } from '@/lib/utils';
import { AIModel, AIStatus, ConversationMode } from '@/types';
import {
  PlusIcon,
  MicIcon,
  PaperclipIcon,
  ImageIcon,
  StopCircleIcon,
  SparklesIcon,
} from 'lucide-react';

interface AIPromptInputProps {
  onSubmit: (content: string, files?: File[]) => void;
  onStop?: () => void;
  isLoading?: boolean;
  aiStatus?: AIStatus;
  placeholder?: string;
  disabled?: boolean;
  mode?: ConversationMode;
  selectedModel?: AIModel;
  onModelChange?: (model: AIModel) => void;
  showModelSelector?: boolean;
  className?: string;
}

// Model options for selector
const MODEL_OPTIONS = [
  { id: 'anthropic/claude-sonnet-4.5' as AIModel, name: 'Sonnet 4.5', provider: 'anthropic' },
  { id: 'google/gemini-3-pro' as AIModel, name: 'Gemini 3', provider: 'google' },
  { id: 'anthropic/claude-opus-4.5' as AIModel, name: 'Opus 4.5', provider: 'anthropic' },
  { id: 'openai/gpt-5.1-thinking' as AIModel, name: 'GPT 5.1', provider: 'openai' },
];

// Get status display info
function getStatusInfo(status: AIStatus, isLoading: boolean) {
  if (!isLoading) return null;
  
  const statusMap: Record<AIStatus, { label: string; color: string }> = {
    idle: { label: '', color: '' },
    thinking: { label: 'Thinking...', color: 'text-blue-500' },
    searching_web: { label: 'Searching web...', color: 'text-purple-500' },
    analyzing_brand: { label: 'Analyzing...', color: 'text-amber-500' },
    crafting_subject: { label: 'Crafting subject...', color: 'text-green-500' },
    writing_hero: { label: 'Writing hero...', color: 'text-green-500' },
    developing_body: { label: 'Writing body...', color: 'text-green-500' },
    creating_cta: { label: 'Creating CTA...', color: 'text-green-500' },
    finalizing: { label: 'Finalizing...', color: 'text-emerald-500' },
    saving_memory: { label: 'Saving to memory...', color: 'text-violet-500' },
    generating_image: { label: 'Generating image...', color: 'text-pink-500' },
  };
  
  return statusMap[status] || { label: 'Processing...', color: 'text-gray-500' };
}

export function AIPromptInput({
  onSubmit,
  onStop,
  isLoading = false,
  aiStatus = 'idle',
  placeholder = 'Describe your email campaign...',
  disabled = false,
  mode = 'email_copy',
  selectedModel = 'anthropic/claude-sonnet-4.5',
  onModelChange,
  showModelSelector = false,
  className,
}: AIPromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  
  // Get status display
  const statusInfo = getStatusInfo(aiStatus, isLoading);
  
  // Handle form submission
  const handleSubmit = useCallback(async (message: PromptInputMessage) => {
    if (!message.text.trim() && message.files.length === 0) return;
    
    // Convert FileUIPart to File objects if needed
    const files = message.files.length > 0 
      ? await Promise.all(message.files.map(async (f) => {
          if (f.url) {
            const response = await fetch(f.url);
            const blob = await response.blob();
            return new File([blob], f.filename || 'attachment', { type: f.mediaType });
          }
          return null;
        })).then(files => files.filter((f): f is File => f !== null))
      : undefined;
    
    onSubmit(message.text, files);
  }, [onSubmit]);
  
  // Handle voice input transcription
  const handleTranscriptionChange = useCallback((text: string) => {
    // Text is automatically updated via the speech button
  }, []);
  
  // Get appropriate models based on mode
  const availableModels = MODEL_OPTIONS;
  
  return (
    <div className={cn('relative', className)}>
      {/* Status indicator */}
      {statusInfo && (
        <div className="absolute -top-8 left-0 right-0 flex items-center justify-center">
          <div className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium',
            'bg-background/80 backdrop-blur-sm border shadow-sm',
            statusInfo.color
          )}>
            <Loader size={12} />
            {statusInfo.label}
          </div>
        </div>
      )}
      
      <PromptInput
        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm"
        onSubmit={handleSubmit}
        accept="image/*,.pdf,.txt,.doc,.docx"
        multiple
        maxFiles={5}
        maxFileSize={10 * 1024 * 1024} // 10MB
        globalDrop
      >
        {/* Attachments preview */}
        <PromptInputAttachments>
          {(attachment) => (
            <PromptInputAttachment data={attachment} />
          )}
        </PromptInputAttachments>
        
        <PromptInputBody>
          <PromptInputTextarea
            ref={textareaRef}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            className={cn(
              'resize-none border-0 focus:ring-0 bg-transparent',
              'min-h-[60px] max-h-[200px]'
            )}
          />
        </PromptInputBody>
        
        <PromptInputFooter className="border-t border-gray-100 dark:border-gray-800 px-3 py-2">
          <PromptInputTools>
            {/* Action menu for attachments and more */}
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger aria-label="Add attachment">
                <PlusIcon className="size-4" />
              </PromptInputActionMenuTrigger>
              <PromptInputActionMenuContent>
                <PromptInputActionAddAttachments label="Add images or files" />
                <PromptInputActionMenuItem onSelect={() => {}}>
                  <ImageIcon className="mr-2 size-4" />
                  Add screenshot
                </PromptInputActionMenuItem>
              </PromptInputActionMenuContent>
            </PromptInputActionMenu>
            
            {/* Voice input button */}
            <PromptInputSpeechButton
              textareaRef={textareaRef}
              onTranscriptionChange={handleTranscriptionChange}
              aria-label="Voice input"
              className={cn(
                isRecording && 'animate-pulse bg-red-100 dark:bg-red-900/30 text-red-600'
              )}
            />
            
            {/* Model selector (optional) */}
            {showModelSelector && onModelChange && (
              <PromptInputSelect 
                value={selectedModel} 
                onValueChange={(value) => onModelChange(value as AIModel)}
              >
                <PromptInputSelectTrigger className="w-auto min-w-[140px] h-8 text-xs">
                  <SparklesIcon className="size-3 mr-1.5" />
                  <PromptInputSelectValue placeholder="Select model" />
                </PromptInputSelectTrigger>
                <PromptInputSelectContent>
                  {availableModels.map((model) => (
                    <PromptInputSelectItem key={model.id} value={model.id}>
                      {model.name}
                    </PromptInputSelectItem>
                  ))}
                </PromptInputSelectContent>
              </PromptInputSelect>
            )}
          </PromptInputTools>
          
          {/* Submit/Stop button */}
          {isLoading ? (
            <PromptInputButton
              onClick={onStop}
              variant="destructive"
              size="icon-sm"
              aria-label="Stop generation"
            >
              <StopCircleIcon className="size-4" />
            </PromptInputButton>
          ) : (
            <PromptInputSubmit
              disabled={disabled}
              status={isLoading ? 'streaming' : undefined}
            />
          )}
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}

export default AIPromptInput;

