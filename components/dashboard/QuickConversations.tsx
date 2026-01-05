'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, ArrowRight, Sparkles } from 'lucide-react';
import { Brand } from '@/types';
import { cn } from '@/lib/utils';
import { AI_MODELS } from '@/lib/ai-models';

interface AISuggestion {
  id: string;
  title: string;
  description: string;
  prompt: string;
  icon: string;
  category: 'campaign' | 'content' | 'strategy' | 'optimization';
  brandId: string;
  brandName: string;
  mode?: 'email_copy' | 'planning';
}

interface QuickConversationsProps {
  brands: Brand[];
  defaultBrandId?: string;
  brandActivityMap?: Map<string, string>;
  selectedModel?: string;
}

export default function QuickConversations({ brands, defaultBrandId, brandActivityMap, selectedModel }: QuickConversationsProps) {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const currentModel = useMemo(() => {
    const modelId = selectedModel || AI_MODELS[0].id;
    return AI_MODELS.find(m => m.id === modelId) || AI_MODELS[0];
  }, [selectedModel]);

  const topBrands = useMemo(() => {
    if (brands.length === 0) return [];

    if (brandActivityMap && brandActivityMap.size > 0) {
      const sorted = [...brandActivityMap.entries()]
        .sort((a, b) => new Date(b[1]).getTime() - new Date(a[1]).getTime())
        .slice(0, 3)
        .map(([brandId]) => brands.find(b => b.id === brandId))
        .filter(Boolean) as Brand[];

      if (sorted.length < 3) {
        const activeIds = new Set(sorted.map(b => b.id));
        const additional = brands.filter(b => !activeIds.has(b.id)).slice(0, 3 - sorted.length);
        return [...sorted, ...additional];
      }
      return sorted;
    }

    return brands.slice(0, 3);
  }, [brands, brandActivityMap]);

  const fetchSuggestionsForBrand = useCallback(async (brand: Brand): Promise<AISuggestion[]> => {
    try {
      const res = await fetch(`/api/chat-suggestions?brandId=${brand.id}&mode=email_copy`);
      if (res.ok) {
        const data = await res.json();
        return (data.suggestions || []).slice(0, 2).map((s: any, idx: number) => ({
          ...s,
          brandId: brand.id,
          brandName: brand.name,
          mode: idx % 2 === 0 ? 'email_copy' : 'planning',
        }));
      }
    } catch (error) {
      console.error(`Failed to fetch suggestions for ${brand.name}:`, error);
    }
    return [];
  }, []);

  const fetchAllSuggestions = useCallback(async () => {
    if (topBrands.length === 0) return;

    setLoading(true);
    try {
      const results = await Promise.all(
        topBrands.map(brand => fetchSuggestionsForBrand(brand))
      );

      const allSuggestions: AISuggestion[] = [];
      const maxPerBrand = 2;

      for (let i = 0; i < maxPerBrand; i++) {
        for (const brandSuggestions of results) {
          if (brandSuggestions[i]) {
            allSuggestions.push(brandSuggestions[i]);
          }
        }
      }

      setSuggestions(allSuggestions.slice(0, 6));
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    } finally {
      setLoading(false);
    }
  }, [topBrands, fetchSuggestionsForBrand]);

  useEffect(() => {
    if (topBrands.length > 0 && suggestions.length === 0) {
      fetchAllSuggestions();
    }
  }, [topBrands, fetchAllSuggestions, suggestions.length]);

  const handleSuggestionClick = (suggestion: AISuggestion) => {
    const params = new URLSearchParams();
    params.set('initialPrompt', suggestion.prompt);
    params.set('mode', suggestion.mode || 'email_copy');
    params.set('model', currentModel.id);
    router.push(`/brands/${suggestion.brandId}/chat?${params.toString()}`);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const num = parseInt(e.key);
      if (num >= 1 && num <= 6 && suggestions[num - 1]) {
        e.preventDefault();
        handleSuggestionClick(suggestions[num - 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [suggestions]);

  if (brands.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            Quick Start
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 hidden sm:inline">
            Press <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono text-[9px]">1</kbd>-<kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono text-[9px]">6</kbd>
          </span>
        </div>
        <button
          onClick={fetchAllSuggestions}
          disabled={loading}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
          title="Refresh suggestions"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
        </button>
      </div>

      {/* Suggestions */}
      {loading && suggestions.length === 0 ? (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {[1, 2, 3, 4].map(i => (
            <div 
              key={i} 
              className="flex-shrink-0 w-[220px] h-[76px] bg-gray-100 dark:bg-gray-800/50 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : suggestions.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1">
          {suggestions.map((suggestion, index) => {
            const isHovered = hoveredIndex === index;
            
            return (
              <button
                key={`${suggestion.brandId}-${suggestion.id}-${index}`}
                onClick={() => handleSuggestionClick(suggestion)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={cn(
                  "group relative flex flex-col px-3.5 py-3 rounded-xl flex-shrink-0 w-[220px] text-left cursor-pointer",
                  "bg-white dark:bg-gray-900/80 border border-gray-200/80 dark:border-gray-800/80",
                  "hover:border-gray-300 dark:hover:border-gray-700",
                  "hover:shadow-md",
                  "transition-all duration-200"
                )}
              >
                {/* Keyboard shortcut badge */}
                <div className={cn(
                  "absolute -top-1.5 -right-1.5 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold transition-all duration-200",
                  isHovered 
                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 scale-110" 
                    : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
                )}>
                  {index + 1}
                </div>

                {/* Content */}
                <div className="flex items-start gap-2.5 mb-1.5">
                  <span className="text-lg flex-shrink-0 mt-0.5">
                    {suggestion.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-gray-900 dark:text-gray-100 leading-tight line-clamp-2">
                      {suggestion.title}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-auto pt-1">
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                    {suggestion.brandName}
                  </span>
                  <ArrowRight className={cn(
                    "w-3.5 h-3.5 flex-shrink-0 transition-all duration-200",
                    isHovered 
                      ? "text-gray-500 dark:text-gray-400 translate-x-0.5" 
                      : "text-gray-300 dark:text-gray-700"
                  )} />
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
