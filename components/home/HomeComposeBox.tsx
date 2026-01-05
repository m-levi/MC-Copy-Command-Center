'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SpeechButton } from '@/components/chat/SpeechButton';
import { AI_MODELS } from '@/lib/ai-models';
import { useEnabledModels } from '@/hooks/useEnabledModels';
import InlineModePicker from '@/components/modes/InlineModePicker';
import ModelPicker from '@/components/ModelPicker';
import { ConversationMode } from '@/types';
import { ArrowUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HomeComposeBoxProps {
  selectedBrandId: string;
  selectedModel: string;
  onModelChange: (model: string) => void;
  mode: ConversationMode;
  onModeChange: (mode: ConversationMode) => void;
  placeholder?: string;
}

export default function HomeComposeBox({
  selectedBrandId,
  selectedModel,
  onModelChange,
  mode,
  onModeChange,
  placeholder = 'What would you like to create today?',
}: HomeComposeBoxProps) {
  const { models: enabledModels } = useEnabledModels();
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [interimVoiceText, setInterimVoiceText] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [prompt, interimVoiceText]);

  // Auto-focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(async () => {
    const finalPrompt = prompt.trim();
    if (!finalPrompt || !selectedBrandId) return;

    setIsSubmitting(true);

    try {
      const params = new URLSearchParams();
      params.set('initialPrompt', finalPrompt);
      params.set('mode', mode);
      params.set('model', selectedModel);

      router.push(`/brands/${selectedBrandId}/chat?${params.toString()}`);
    } catch (error) {
      console.error('Error starting conversation:', error);
      setIsSubmitting(false);
    }
  }, [prompt, selectedBrandId, mode, selectedModel, router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleVoiceTranscript = (text: string, isFinal: boolean) => {
    if (isFinal) {
      setPrompt(prev => prev + (prev ? ' ' : '') + text);
      setInterimVoiceText('');
    } else {
      setInterimVoiceText(text);
    }
  };

  const displayText = prompt + (interimVoiceText ? ` ${interimVoiceText}` : '');
  const canSubmit = prompt.trim().length > 0 && !isSubmitting;

  return (
    <div
      className={cn(
        "relative bg-white dark:bg-gray-900",
        "border border-gray-200 dark:border-gray-800",
        "rounded-2xl shadow-sm",
        "hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700",
        "focus-within:shadow-md focus-within:border-gray-300 dark:focus-within:border-gray-700",
        "transition-all duration-200"
      )}
    >
      {/* Textarea */}
      <div className="px-5 pt-5 pb-3">
        <textarea
          ref={textareaRef}
          value={displayText}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isSubmitting}
          rows={1}
          className={cn(
            "w-full text-base bg-transparent resize-none border-0",
            "text-gray-900 dark:text-white",
            "placeholder:text-gray-400 dark:placeholder:text-gray-500",
            "focus:outline-none focus:ring-0",
            "min-h-[48px] max-h-[200px]",
            "disabled:opacity-50"
          )}
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 pb-4">
        <div className="flex items-center gap-2">
          {/* Model Picker */}
          {enabledModels.length > 1 && (
            <>
              <ModelPicker
                models={enabledModels}
                selectedModel={selectedModel}
                onModelChange={onModelChange}
                dropdownPosition="above"
                compact
              />
              <span className="text-gray-200 dark:text-gray-700">|</span>
            </>
          )}

          {/* Mode Picker */}
          <InlineModePicker
            value={mode}
            onChange={onModeChange}
            minimal
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Voice Input */}
          <SpeechButton
            onTranscript={handleVoiceTranscript}
            onStateChange={setIsRecordingVoice}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          />

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              "p-2.5 rounded-xl transition-all",
              canSubmit
                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 shadow-sm cursor-pointer"
                : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ArrowUp className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
