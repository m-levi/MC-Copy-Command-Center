'use client';

import { useState, useRef, useEffect } from 'react';
import { Brand } from '@/types';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SpeechButton } from '@/components/chat/SpeechButton';
import { LayoutTemplate, Mail, GitMerge } from 'lucide-react';

interface QuickStartActionProps {
  brands: Brand[];
}

type WritingMode = 'email_design' | 'email_text' | 'flow';

export default function QuickStartAction({ brands }: QuickStartActionProps) {
  const [prompt, setPrompt] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [mode, setMode] = useState<WritingMode>('email_design');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBrandPicker, setShowBrandPicker] = useState(false);
  const [showModePicker, setShowModePicker] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [interimVoiceText, setInterimVoiceText] = useState('');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const brandPickerRef = useRef<HTMLDivElement>(null);
  const modePickerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const suggestions = [
    "Black Friday Sale Announcement",
    "Welcome Series Email #1",
    "Product Launch Teaser",
    "Winback Campaign"
  ];

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [prompt, interimVoiceText]);

  // Set default brand if available
  useEffect(() => {
    if (brands.length > 0 && !selectedBrandId) {
      setSelectedBrandId(brands[0].id);
    }
  }, [brands, selectedBrandId]);

  // Close pickers on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (brandPickerRef.current && !brandPickerRef.current.contains(event.target as Node)) {
        setShowBrandPicker(false);
      }
      if (modePickerRef.current && !modePickerRef.current.contains(event.target as Node)) {
        setShowModePicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async () => {
    if (!prompt.trim() || !selectedBrandId) return;
    
    setIsSubmitting(true);

    try {
      // Prepare conversation params
      const params = new URLSearchParams();
      params.set('initialPrompt', prompt);
      
      if (mode === 'flow') {
        params.set('mode', 'flow');
      } else {
        params.set('mode', 'email_copy');
        params.set('emailType', mode === 'email_design' ? 'design' : 'letter');
      }

      // Navigate to chat page with params
      router.push(`/brands/${selectedBrandId}/chat?${params.toString()}`);
      
    } catch (error) {
      console.error('Error starting conversation:', error);
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const getModeLabel = (m: WritingMode) => {
    switch (m) {
      case 'email_design': return 'Design Email';
      case 'email_text': return 'Text Letter';
      case 'flow': return 'Automation Flow';
    }
  };

  const getModeIcon = (m: WritingMode) => {
    switch (m) {
      case 'email_design': return <LayoutTemplate className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />;
      case 'email_text': return <Mail className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />;
      case 'flow': return <GitMerge className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />;
    }
  };

  const handleVoiceTranscript = (transcript: string, isFinal: boolean) => {
    if (isFinal) {
      // Append final transcript to current message
      const newMessage = prompt ? `${prompt} ${transcript}` : transcript;
      setPrompt(newMessage);
      setInterimVoiceText('');
    } else {
      // Update interim text for live preview
      setInterimVoiceText(transcript);
    }
    
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const selectedBrand = brands.find(b => b.id === selectedBrandId);

  return (
    <div className="flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500/50">
      <div className="px-4 sm:px-6 pt-4 pb-2">
        <textarea
          ref={textareaRef}
          value={prompt + (interimVoiceText ? (prompt ? ' ' : '') + interimVoiceText : '')}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What would you like to write today?"
          disabled={isSubmitting}
          className="w-full text-[15px] sm:text-base leading-relaxed bg-transparent border-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-0 focus:border-none outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed min-h-[100px]"
          style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
        />
        
        {!prompt && !interimVoiceText && (
          <div className="flex flex-wrap gap-2 mt-4 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs text-gray-600 dark:text-gray-300 rounded-full border border-gray-200 dark:border-gray-600 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div className="flex items-center justify-between px-3 sm:px-5 pb-3 mt-auto">
        <div className="flex items-center gap-2">
          {/* Brand Selector */}
          <div className="relative" ref={brandPickerRef}>
            <button
              onClick={() => setShowBrandPicker(!showBrandPicker)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
              <span>{selectedBrand?.name || 'Select Brand'}</span>
              <svg 
                className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${showBrandPicker ? 'rotate-180' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showBrandPicker && (
              <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden min-w-[200px] z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
                <div className="max-h-[240px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
                  {brands.map((brand) => (
                    <button
                      key={brand.id}
                      onClick={() => {
                        setSelectedBrandId(brand.id);
                        setShowBrandPicker(false);
                      }}
                      className={`
                        w-full px-3 py-2 text-left text-xs font-medium transition-colors
                        ${selectedBrandId === brand.id
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }
                      `}
                    >
                      {brand.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mode Selector */}
          <div className="relative" ref={modePickerRef}>
            <button
              onClick={() => setShowModePicker(!showModePicker)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {getModeIcon(mode)}
              <span>{getModeLabel(mode)}</span>
              <svg 
                className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${showModePicker ? 'rotate-180' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showModePicker && (
              <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden min-w-[180px] z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
                {(['email_design', 'email_text', 'flow'] as WritingMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setMode(m);
                      setShowModePicker(false);
                    }}
                    className={`
                      w-full px-3 py-2 text-left text-xs font-medium transition-colors flex items-center gap-2
                      ${mode === m
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    {getModeIcon(m)}
                    {getModeLabel(m)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Voice Input Button */}
          <SpeechButton
            onTranscript={handleVoiceTranscript}
            disabled={isSubmitting}
            onStateChange={setIsRecordingVoice}
          />

          {/* Submit Button */}
          {!isRecordingVoice && (
            <button
              onClick={handleSubmit}
              disabled={!prompt.trim() || !selectedBrandId || isSubmitting}
              className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${
                !prompt.trim() || !selectedBrandId || isSubmitting
                  ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  : 'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20'
              }`}
              title="Start Writing"
            >
              {isSubmitting ? (
                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
