'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Brand } from '@/types';
import { PERSONAL_AI_INFO } from '@/lib/personal-ai';
import { cn } from '@/lib/utils';
import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

interface ClientPickerChipsProps {
  brands: Brand[];
  selectedBrandId: string;
  onBrandSelect: (brandId: string) => void;
}

export default function ClientPickerChips({
  brands,
  selectedBrandId,
  onBrandSelect,
}: ClientPickerChipsProps) {
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // All brands with Personal AI at the start
  const allBrands = useMemo(() => {
    const personalAI = {
      id: PERSONAL_AI_INFO.id,
      name: PERSONAL_AI_INFO.name,
      organization_id: '',
      user_id: '',
      created_at: '',
      updated_at: ''
    } as Brand;
    return [personalAI, ...brands];
  }, [brands]);

  // Check scroll arrows visibility
  const updateScrollArrows = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const hasOverflow = container.scrollWidth > container.clientWidth;
    setShowLeftArrow(hasOverflow && container.scrollLeft > 0);
    setShowRightArrow(
      hasOverflow && container.scrollLeft < container.scrollWidth - container.clientWidth - 1
    );
  }, []);

  useEffect(() => {
    updateScrollArrows();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', updateScrollArrows);
      window.addEventListener('resize', updateScrollArrows);
      return () => {
        container.removeEventListener('scroll', updateScrollArrows);
        window.removeEventListener('resize', updateScrollArrows);
      };
    }
  }, [updateScrollArrows, allBrands]);

  // Auto-focus the first chip on mount so Tab works immediately
  useEffect(() => {
    // Small delay to ensure component is fully mounted
    const timer = setTimeout(() => {
      if (chipRefs.current[0]) {
        chipRefs.current[0].focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Focus the compose box textarea
  const focusComposeBox = useCallback(() => {
    // Small delay to ensure state updates complete
    setTimeout(() => {
      const textarea = document.querySelector('textarea[placeholder*="What would you like"]') as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
      }
    }, 50);
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault();
      const nextIndex = (index + 1) % allBrands.length;
      chipRefs.current[nextIndex]?.focus();
      chipRefs.current[nextIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    } else if (e.key === 'ArrowLeft' || (e.key === 'Tab' && e.shiftKey)) {
      e.preventDefault();
      const prevIndex = (index - 1 + allBrands.length) % allBrands.length;
      chipRefs.current[prevIndex]?.focus();
      chipRefs.current[prevIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onBrandSelect(allBrands[index].id);
      // Focus the compose box after selecting
      focusComposeBox();
    }
  }, [allBrands, onBrandSelect, focusComposeBox]);

  const scrollBy = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = 200;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  return (
    <div className="mb-4 w-full relative">
      {/* Left scroll arrow */}
      <button
        onClick={() => scrollBy('left')}
        tabIndex={-1}
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 z-10",
          "w-7 h-7 flex items-center justify-center",
          "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700",
          "rounded-full shadow-md",
          "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300",
          "transition-all cursor-pointer",
          showLeftArrow ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Scrollable chips container */}
      <div
        ref={scrollContainerRef}
        className="flex items-center gap-2 overflow-x-auto px-1 py-1"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {allBrands.map((brand, index) => {
          const isSelected = brand.id === selectedBrandId;
          const isPersonalAI = brand.id === PERSONAL_AI_INFO.id;

          return (
            <button
              key={brand.id}
              ref={(el) => { chipRefs.current[index] = el; }}
              onClick={() => onBrandSelect(brand.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={cn(
                "flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm cursor-pointer",
                "transition-all duration-150",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950",
                isSelected
                  ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
            >
              {isPersonalAI ? (
                <Sparkles className={cn(
                  "w-3.5 h-3.5",
                  isSelected ? "text-white dark:text-gray-900" : "text-violet-500"
                )} />
              ) : (
                <div className={cn(
                  "w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold",
                  isSelected
                    ? "bg-white/20 text-white dark:bg-gray-900/20 dark:text-gray-900"
                    : "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
                )}>
                  {brand.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="whitespace-nowrap">{brand.name}</span>
            </button>
          );
        })}
      </div>

      {/* Right scroll arrow */}
      <button
        onClick={() => scrollBy('right')}
        tabIndex={-1}
        className={cn(
          "absolute right-0 top-1/2 -translate-y-1/2 z-10",
          "w-7 h-7 flex items-center justify-center",
          "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700",
          "rounded-full shadow-md",
          "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300",
          "transition-all cursor-pointer",
          showRightArrow ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Hide scrollbar CSS */}
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
