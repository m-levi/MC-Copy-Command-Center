'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Brand } from '@/types';
import { useRouter } from 'next/navigation';
import { SpeechButton } from '@/components/chat/SpeechButton';
import { PERSONAL_AI_INFO } from '@/lib/personal-ai';
import { AI_MODELS } from '@/lib/ai-models';
import { useEnabledModels } from '@/hooks/useEnabledModels';
import InlineModePicker from '@/components/modes/InlineModePicker';
import ModelPicker from '@/components/ModelPicker';
import { ConversationMode } from '@/types';
import {
  ChevronDown,
  Check,
  ArrowUp,
  Search,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StickyComposeBoxProps {
  brands: Brand[];
  defaultBrandId?: string;
  brandActivityMap?: Map<string, string>;
}

export default function StickyComposeBox({ brands, defaultBrandId, brandActivityMap }: StickyComposeBoxProps) {
  // Use user's enabled AI models (respects settings preferences)
  const { models: enabledModels, defaultModel } = useEnabledModels();
  // Use ALL enabled models (no artificial limit)
  
  const [prompt, setPrompt] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState<string>(defaultBrandId || '');
  const [mode, setMode] = useState<ConversationMode>('assistant');
  const [selectedModel, setSelectedModel] = useState(defaultModel || enabledModels[0]?.id || AI_MODELS[0].id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBrandPicker, setShowBrandPicker] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [interimVoiceText, setInterimVoiceText] = useState('');
  const [brandSearchQuery, setBrandSearchQuery] = useState('');
  const [selectedBrandIndex, setSelectedBrandIndex] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const brandButtonRef = useRef<HTMLButtonElement>(null);
  const brandPickerRef = useRef<HTMLDivElement>(null);
  const brandSearchRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [prompt, interimVoiceText]);

  // Set default brand if available
  useEffect(() => {
    if (!selectedBrandId) {
      setSelectedBrandId(defaultBrandId || PERSONAL_AI_INFO.id);
    }
  }, [defaultBrandId, selectedBrandId]);

  // Update selected model when user's default model preference loads
  useEffect(() => {
    if (defaultModel && enabledModels.some(m => m.id === defaultModel)) {
      setSelectedModel(defaultModel);
    }
  }, [defaultModel, enabledModels]);

  // Auto-focus brand search when picker opens
  useEffect(() => {
    if (showBrandPicker && brandSearchRef.current) {
      setTimeout(() => brandSearchRef.current?.focus(), 50);
    } else {
      setBrandSearchQuery('');
    }
  }, [showBrandPicker]);

  // Helper functions to open dropdowns with correct position (calculate before showing to prevent jank)
  const openBrandPicker = () => {
    if (brandButtonRef.current) {
      const rect = brandButtonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
      });
    }
    setShowBrandPicker(true);
  };

  // Close pickers on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (showBrandPicker && brandPickerRef.current && !brandPickerRef.current.contains(target) && !brandButtonRef.current?.contains(target)) {
        setShowBrandPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showBrandPicker]);

  // Brands list with Personal AI as first option
  const brandsWithPersonalAI = useMemo(() => {
    return [
      {
        id: PERSONAL_AI_INFO.id,
        name: PERSONAL_AI_INFO.name,
        organization_id: '',
        user_id: '',
        created_at: '',
        updated_at: ''
      } as Brand,
      ...brands
    ];
  }, [brands]);

  // Get recent brands (most recently used)
  const recentBrands = useMemo(() => {
    if (!brandActivityMap || brandActivityMap.size === 0) return [];

    const sorted = [...brandActivityMap.entries()]
      .sort((a, b) => new Date(b[1]).getTime() - new Date(a[1]).getTime())
      .slice(0, 3)
      .map(([brandId]) => brandsWithPersonalAI.find(b => b.id === brandId))
      .filter(Boolean) as Brand[];

    return sorted;
  }, [brandActivityMap, brandsWithPersonalAI]);

  // Filtered brands based on search
  const filteredBrands = useMemo(() => {
    if (!brandSearchQuery.trim()) return brandsWithPersonalAI;
    const query = brandSearchQuery.toLowerCase();
    return brandsWithPersonalAI.filter(brand => brand.name.toLowerCase().includes(query));
  }, [brandsWithPersonalAI, brandSearchQuery]);

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
    };

    if (showBrandPicker) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showBrandPicker, selectedBrandIndex, filteredBrands]);

  useEffect(() => {
    if (showBrandPicker) {
      const currentIndex = filteredBrands.findIndex(b => b.id === selectedBrandId);
      setSelectedBrandIndex(currentIndex >= 0 ? currentIndex : 0);
    }
  }, [showBrandPicker, selectedBrandId, filteredBrands]);

  const handleSubmit = async () => {
    if (!prompt.trim() || !selectedBrandId) return;

    setIsSubmitting(true);

    try {
      const params = new URLSearchParams();
      params.set('initialPrompt', prompt);
      params.set('mode', mode);
      params.set('model', selectedModel);

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

  const handleVoiceTranscript = (transcript: string, isFinal: boolean) => {
    if (isFinal) {
      const newMessage = prompt ? `${prompt} ${transcript}` : transcript;
      setPrompt(newMessage);
      setInterimVoiceText('');
    } else {
      setInterimVoiceText(transcript);
    }
    textareaRef.current?.focus();
  };

  const selectedBrand = brandsWithPersonalAI.find(b => b.id === selectedBrandId);
  const isPersonalAI = selectedBrandId === PERSONAL_AI_INFO.id;

  // Brand Picker Dropdown (rendered via portal) - opens DOWNWARD
  const brandPickerDropdown = showBrandPicker && typeof document !== 'undefined' && createPortal(
    <div
      ref={brandPickerRef}
      style={{
        position: 'fixed',
        top: dropdownPosition.top,
        left: dropdownPosition.left,
      }}
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg w-[280px] z-[100] overflow-hidden"
    >
      {/* Search */}
      <div className="p-2 border-b border-gray-100 dark:border-gray-800">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            ref={brandSearchRef}
            type="text"
            value={brandSearchQuery}
            onChange={(e) => setBrandSearchQuery(e.target.value)}
            placeholder="Search brands..."
            className="w-full pl-8 pr-8 py-1.5 text-sm rounded-md bg-gray-50 dark:bg-gray-800 border-0 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none"
          />
          {brandSearchQuery && (
            <button onClick={() => setBrandSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
              <X className="w-3 h-3 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Brand List */}
      <div className="max-h-[320px] overflow-y-auto p-1">
        {filteredBrands.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-gray-500">No brands found</div>
        ) : (
          <>
            {/* Recent Section */}
            {!brandSearchQuery && recentBrands.length > 0 && (
              <>
                <div className="px-2.5 py-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Recent</div>
                {recentBrands.map((brand) => (
                  <BrandOption
                    key={`recent-${brand.id}`}
                    brand={brand}
                    isSelected={selectedBrandId === brand.id}
                    onClick={() => { setSelectedBrandId(brand.id); setShowBrandPicker(false); }}
                  />
                ))}
                <div className="my-1.5 mx-2 border-t border-gray-100 dark:border-gray-800" />
                <div className="px-2.5 py-1.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">All Brands</div>
              </>
            )}
            {filteredBrands.map((brand) => (
              <BrandOption
                key={brand.id}
                brand={brand}
                isSelected={selectedBrandId === brand.id}
                onClick={() => { setSelectedBrandId(brand.id); setShowBrandPicker(false); }}
              />
            ))}
          </>
        )}
      </div>
    </div>,
    document.body
  );

  return (
    <div className={cn(
      "relative bg-white dark:bg-gray-900 border rounded-2xl transition-all duration-200 min-h-[120px] flex flex-col",
      "border-gray-200 dark:border-gray-800",
      "shadow-sm hover:shadow-md",
      "focus-within:border-gray-300 dark:focus-within:border-gray-700",
      "focus-within:shadow-md"
    )}>
      {/* Text Input Area */}
      <div className="px-4 pt-4 pb-2">
        <textarea
          ref={textareaRef}
          value={prompt + (interimVoiceText ? (prompt ? ' ' : '') + interimVoiceText : '')}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What would you like to create today?"
          disabled={isSubmitting}
          rows={1}
          className="w-full text-[15px] leading-relaxed bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none disabled:opacity-50 min-h-[48px] max-h-[200px] border-0 outline-0 ring-0 focus:border-0 focus:outline-0 focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0"
        />
      </div>

      {/* Bottom Controls Bar */}
      <div className="flex items-center justify-between px-3 pb-3 mt-auto">
        {/* Left: Model, Brand & Mode Selectors */}
        <div className="flex items-center gap-0.5 flex-wrap">
          {/* Model Selector - Uses all enabled models with search */}
          <ModelPicker
            models={enabledModels}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            dropdownPosition="below"
            compact
          />

          <span className="text-gray-200 dark:text-gray-800 mx-0.5 select-none">·</span>

          {/* Brand Selector */}
          <button
            ref={brandButtonRef}
            onClick={() => showBrandPicker ? setShowBrandPicker(false) : openBrandPicker()}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150",
              showBrandPicker
                ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/70"
            )}
          >
            {isPersonalAI && <span className="text-xs">✨</span>}
            <span className="max-w-[120px] truncate">{selectedBrand?.name || 'Select brand'}</span>
            <ChevronDown className={cn("w-3 h-3 opacity-40 transition-transform duration-200", showBrandPicker && "rotate-180")} />
          </button>

          <span className="text-gray-200 dark:text-gray-800 mx-0.5 select-none">·</span>

          {/* Mode Selector (using InlineModePicker) */}
          <InlineModePicker
            value={mode}
            onChange={(newMode) => setMode(newMode)}
            minimal={true}
          />
        </div>

        {/* Right: Voice & Send */}
        <div className="flex items-center gap-1.5">
          <SpeechButton
            onTranscript={handleVoiceTranscript}
            disabled={isSubmitting}
            onStateChange={setIsRecordingVoice}
          />

          {!isRecordingVoice && (
            <button
              onClick={handleSubmit}
              disabled={!prompt.trim() || !selectedBrandId || isSubmitting}
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200",
                !prompt.trim() || !selectedBrandId || isSubmitting
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed"
                  : "bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md"
              )}
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

      {/* Portal-rendered dropdowns */}
      {brandPickerDropdown}
    </div>
  );
}

// Brand option component
function BrandOption({ brand, isSelected, onClick }: {
  brand: Brand;
  isSelected: boolean;
  onClick: () => void;
}) {
  const isPersonalAI = brand.id === PERSONAL_AI_INFO.id;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full px-2.5 py-2 text-left text-sm rounded-md flex items-center gap-2.5 transition-colors",
        isSelected
          ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
          : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white"
      )}
    >
      {isPersonalAI ? (
        <span className="w-5 h-5 flex items-center justify-center text-sm">✨</span>
      ) : (
        <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 text-[10px] font-bold bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
          {brand.name.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="truncate flex-1">{brand.name}</span>
      {isSelected && <Check className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
    </button>
  );
}
