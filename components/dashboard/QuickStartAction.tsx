'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Brand } from '@/types';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SpeechButton } from '@/components/chat/SpeechButton';
import { 
  LayoutTemplate, 
  Mail, 
  GitMerge, 
  ChevronDown, 
  Check, 
  ArrowUp, 
  Sparkles,
  Search,
  X 
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [brandSearchQuery, setBrandSearchQuery] = useState('');
  const [selectedBrandIndex, setSelectedBrandIndex] = useState(0);
  const [selectedModeIndex, setSelectedModeIndex] = useState(0);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const brandPickerRef = useRef<HTMLDivElement>(null);
  const modePickerRef = useRef<HTMLDivElement>(null);
  const brandSearchRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [prompt, interimVoiceText]);

  // Set default brand if available
  useEffect(() => {
    if (brands.length > 0 && !selectedBrandId) {
      setSelectedBrandId(brands[0].id);
    }
  }, [brands, selectedBrandId]);

  // Auto-focus brand search when picker opens
  useEffect(() => {
    if (showBrandPicker && brandSearchRef.current) {
      setTimeout(() => brandSearchRef.current?.focus(), 50);
    } else {
      setBrandSearchQuery('');
    }
  }, [showBrandPicker]);

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

  // Filtered brands based on search
  const filteredBrands = useMemo(() => {
    if (!brandSearchQuery.trim()) return brands;
    const query = brandSearchQuery.toLowerCase();
    return brands.filter(brand => brand.name.toLowerCase().includes(query));
  }, [brands, brandSearchQuery]);

  // Keyboard navigation for brand picker
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (showBrandPicker) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedBrandIndex(prev => {
            if (e.key === 'ArrowDown') return prev < filteredBrands.length - 1 ? prev + 1 : 0;
            return prev > 0 ? prev - 1 : filteredBrands.length - 1;
          });
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const selected = filteredBrands[selectedBrandIndex];
          if (selected) {
            setSelectedBrandId(selected.id);
            setShowBrandPicker(false);
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setShowBrandPicker(false);
        }
        return;
      }
      
      if (showModePicker) {
        const modes: WritingMode[] = ['email_design', 'email_text', 'flow'];
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedModeIndex(prev => {
            if (e.key === 'ArrowDown') return prev < modes.length - 1 ? prev + 1 : 0;
            return prev > 0 ? prev - 1 : modes.length - 1;
          });
        } else if (e.key === 'Enter') {
          e.preventDefault();
          setMode(modes[selectedModeIndex]);
          setShowModePicker(false);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setShowModePicker(false);
        }
        return;
      }
    };

    if (showBrandPicker || showModePicker) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showBrandPicker, showModePicker, selectedBrandIndex, selectedModeIndex, filteredBrands]);

  // Reset selected index when opening pickers
  useEffect(() => {
    if (showBrandPicker) {
      const currentIndex = filteredBrands.findIndex(b => b.id === selectedBrandId);
      setSelectedBrandIndex(currentIndex >= 0 ? currentIndex : 0);
    }
  }, [showBrandPicker, selectedBrandId, filteredBrands]);

  useEffect(() => {
    if (showModePicker) {
      const modes: WritingMode[] = ['email_design', 'email_text', 'flow'];
      const currentIndex = modes.indexOf(mode);
      setSelectedModeIndex(currentIndex >= 0 ? currentIndex : 0);
    }
  }, [showModePicker, mode]);

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

  const getModeLabel = (m: WritingMode) => {
    switch (m) {
      case 'email_design': return 'Design Email';
      case 'email_text': return 'Text Letter';
      case 'flow': return 'Automation Flow';
    }
  };

  const getModeIcon = (m: WritingMode) => {
    switch (m) {
      case 'email_design': return <LayoutTemplate className="w-3.5 h-3.5" />;
      case 'email_text': return <Mail className="w-3.5 h-3.5" />;
      case 'flow': return <GitMerge className="w-3.5 h-3.5" />;
    }
  };

  const handleVoiceTranscript = (transcript: string, isFinal: boolean) => {
    if (isFinal) {
      const newMessage = prompt ? `${prompt} ${transcript}` : transcript;
      setPrompt(newMessage);
      setInterimVoiceText('');
    } else {
      setInterimVoiceText(transcript);
    }
    
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const selectedBrand = brands.find(b => b.id === selectedBrandId);

  const modes: WritingMode[] = ['email_design', 'email_text', 'flow'];

  return (
    <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-150 min-h-[140px] flex flex-col focus-within:border-gray-300 dark:focus-within:border-gray-700">
      
      {/* Header with AI branding */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-gray-100 dark:border-gray-800">
        <Sparkles className="w-4 h-4 text-blue-500 dark:text-blue-400" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Start a new conversation
        </span>
      </div>

      {/* Text Input Area */}
      <div className="px-4 pt-3 pb-2 flex-1">
        <textarea
          ref={textareaRef}
          value={prompt + (interimVoiceText ? (prompt ? ' ' : '') + interimVoiceText : '')}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What would you like to create today? (Press Enter to start)"
          disabled={isSubmitting}
          className="w-full text-[15px] leading-relaxed bg-transparent border-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed min-h-[60px] max-h-[160px]"
          style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
        />
      </div>

      {/* Bottom Controls Bar */}
      <div className="flex items-center justify-between px-3 pb-2 mt-auto">
        <div className="flex items-center gap-1">
          {/* Brand Selector with Search */}
          <div className="relative" ref={brandPickerRef}>
            <button
              onClick={() => setShowBrandPicker(!showBrandPicker)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                showBrandPicker
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200"
              )}
            >
              <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                selectedBrand ? "bg-blue-500" : "bg-gray-300"
              )}></div>
              <span className="max-w-[120px] truncate">{selectedBrand?.name || 'Select Brand'}</span>
              <ChevronDown className={cn("w-3 h-3 transition-transform", showBrandPicker && "rotate-180")} />
            </button>

            {showBrandPicker && (
              <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg overflow-hidden min-w-[280px] max-w-[320px] z-50 animate-in fade-in zoom-in-95 duration-100 origin-bottom-left">
                {/* Search Header */}
                <div className="p-2 border-b border-gray-100 dark:border-gray-800">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      ref={brandSearchRef}
                      type="text"
                      value={brandSearchQuery}
                      onChange={(e) => setBrandSearchQuery(e.target.value)}
                      placeholder="Search brands..."
                      className="w-full pl-9 pr-8 py-2 text-xs rounded-lg bg-gray-50 dark:bg-gray-800/60 border-0 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-800"
                    />
                    {brandSearchQuery && (
                      <button
                        onClick={() => setBrandSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Brand List */}
                <div className="max-h-[280px] overflow-y-auto p-1">
                  {filteredBrands.length === 0 ? (
                    <div className="px-3 py-8 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        No brands found
                      </p>
                    </div>
                  ) : (
                    filteredBrands.map((brand, index) => (
                      <button
                        key={brand.id}
                        onClick={() => {
                          setSelectedBrandId(brand.id);
                          setShowBrandPicker(false);
                        }}
                        className={cn(
                          "w-full px-3 py-2.5 text-left text-sm rounded-lg transition-colors flex items-center justify-between group",
                          index === selectedBrandIndex
                            ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                            : selectedBrandId === brand.id
                              ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
                              : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className={cn(
                            "w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
                            selectedBrandId === brand.id
                              ? "bg-gradient-to-br from-blue-500 to-indigo-600"
                              : "bg-gradient-to-br from-gray-400 to-gray-500 group-hover:from-blue-400 group-hover:to-indigo-500"
                          )}>
                            <span className="text-white font-bold text-[10px]">
                              {brand.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="truncate">{brand.name}</span>
                        </div>
                        {selectedBrandId === brand.id && (
                          <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-2" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <span className="text-gray-300 dark:text-gray-700 text-xs mx-0.5">/</span>

          {/* Mode Selector */}
          <div className="relative" ref={modePickerRef}>
            <button
              onClick={() => setShowModePicker(!showModePicker)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                showModePicker
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200"
              )}
            >
              {getModeIcon(mode)}
              <span>{getModeLabel(mode)}</span>
              <ChevronDown className={cn("w-3 h-3 transition-transform", showModePicker && "rotate-180")} />
            </button>

            {showModePicker && (
              <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg overflow-hidden min-w-[200px] z-50 p-1 animate-in fade-in zoom-in-95 duration-100 origin-bottom-left">
                {modes.map((m, index) => {
                  const Icon = getModeIcon(m);
                  return (
                    <button
                      key={m}
                      onClick={() => {
                        setMode(m);
                        setShowModePicker(false);
                      }}
                      className={cn(
                        "w-full px-3 py-2.5 text-left text-xs font-medium rounded-lg transition-colors flex items-center gap-2.5",
                        index === selectedModeIndex
                          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                          : mode === m
                            ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      )}
                    >
                      {Icon}
                      <span className="flex-1">{getModeLabel(m)}</span>
                      {mode === m && (
                        <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
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
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150",
                !prompt.trim() || !selectedBrandId || isSubmitting
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed"
                  : "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 hover:scale-105 active:scale-95 shadow-sm"
              )}
              title="Start Writing"
            >
              {isSubmitting ? (
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
