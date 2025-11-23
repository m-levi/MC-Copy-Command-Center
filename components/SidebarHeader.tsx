'use client';

import { Brand } from '@/types';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface SidebarHeaderProps {
  brandName: string;
  brandId?: string;
  allBrands?: Brand[];
  isCollapsed: boolean;
  toggleCollapse?: () => void;
  onBrandSwitch?: (brandId: string) => void;
  onNavigateHome?: () => void;
  onMobileToggle?: (isOpen: boolean) => void;
  onOpenExplorer?: () => void;
  isMobile?: boolean;
}

export default function SidebarHeader({
  brandName,
  brandId,
  allBrands = [],
  isCollapsed,
  toggleCollapse,
  onBrandSwitch,
  onNavigateHome,
  onMobileToggle,
  onOpenExplorer,
  isMobile = false,
}: SidebarHeaderProps) {
  const [showBrandSwitcher, setShowBrandSwitcher] = useState(false);
  const [focusedBrandIndex, setFocusedBrandIndex] = useState<number>(-1);
  const brandSwitcherRef = useRef<HTMLButtonElement>(null);
  const brandDropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Brand switcher keyboard navigation
  const handleBrandKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showBrandSwitcher || allBrands.length <= 1) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedBrandIndex(prev => 
          prev < allBrands.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedBrandIndex(prev => 
          prev > 0 ? prev - 1 : allBrands.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedBrandIndex >= 0 && focusedBrandIndex < allBrands.length) {
          const selectedBrand = allBrands[focusedBrandIndex];
          onBrandSwitch?.(selectedBrand.id);
          setShowBrandSwitcher(false);
          setFocusedBrandIndex(-1);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowBrandSwitcher(false);
        setFocusedBrandIndex(-1);
        brandSwitcherRef.current?.focus();
        break;
    }
  }, [showBrandSwitcher, allBrands, focusedBrandIndex, onBrandSwitch]);

  // Open brand switcher and set initial focus
  const handleOpenBrandSwitcher = useCallback(() => {
    setShowBrandSwitcher(true);
    // Set focus to current brand
    const currentIndex = allBrands.findIndex(b => b.id === brandId);
    setFocusedBrandIndex(currentIndex >= 0 ? currentIndex : 0);
  }, [allBrands, brandId]);

  // Close brand switcher dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showBrandSwitcher &&
        brandSwitcherRef.current &&
        !brandSwitcherRef.current.contains(event.target as Node) &&
        brandDropdownRef.current &&
        !brandDropdownRef.current.contains(event.target as Node)
      ) {
        setShowBrandSwitcher(false);
      }
    };

    if (showBrandSwitcher) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showBrandSwitcher]);

  if (!isCollapsed) {
    return (
      <div className="p-3">
        {/* Single Row: Brand Name and Switcher */}
        <div className="flex items-center justify-between gap-2">
          {/* Brand Switcher */}
          <div className="relative flex-1 min-w-0">
            <button
              ref={brandSwitcherRef}
              onClick={handleOpenBrandSwitcher}
              onKeyDown={handleBrandKeyDown}
              className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-2 rounded-lg transition-all cursor-pointer w-full group"
            >
              <div className="flex-1 min-w-0 text-left">
                <h2 className="text-sm font-bold truncate text-gray-900 dark:text-white tracking-tight">{brandName}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Switch brand</p>
              </div>
              {allBrands.length > 1 && (
                <svg 
                  className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${showBrandSwitcher ? 'rotate-180' : ''} group-hover:text-gray-600 dark:group-hover:text-gray-300`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>

            {/* Brand Switcher Dropdown with Keyboard Navigation */}
            {showBrandSwitcher && allBrands.length > 1 && (
              <div 
                ref={brandDropdownRef}
                className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 origin-top"
                onKeyDown={handleBrandKeyDown}
              >
                <div className="p-1.5">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Your Brands
                  </div>
                  <div className="max-h-[280px] overflow-y-auto space-y-0.5">
                    {allBrands.map((b, index) => (
                      <button
                        key={b.id}
                        onClick={() => {
                          onBrandSwitch?.(b.id);
                          setShowBrandSwitcher(false);
                          setFocusedBrandIndex(-1);
                        }}
                        className={`
                          w-full px-3 py-2.5 text-sm text-left transition-all cursor-pointer flex items-center justify-between rounded-lg
                          ${index === focusedBrandIndex
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : b.id === brandId
                              ? 'bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white font-medium'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                          }
                        `}
                      >
                        <span className="truncate">{b.name}</span>
                        {b.id === brandId && (
                          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="mt-1 pt-1 border-t border-gray-100 dark:border-gray-700/50">
                    <button
                      onClick={onNavigateHome}
                      className="w-full px-3 py-2.5 text-sm text-left text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                      All Brands
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Simplified Actions */}
          <div className="flex items-center">
            {brandId && (
              <button
                onClick={() => router.push(`/brands/${brandId}`)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                title="Brand Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
            {toggleCollapse && (
              <button
                onClick={toggleCollapse}
                className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all hidden lg:block"
                title="Collapse Sidebar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
            )}
            {isMobile && (
              <button
                onClick={() => onMobileToggle?.(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all lg:hidden"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Collapsed header - icon only
  return (
    <div className="hidden lg:flex flex-col items-center py-3 px-2 gap-2">
      {toggleCollapse && (
        <button
          onClick={toggleCollapse}
          className="w-11 h-11 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
          title="Expand sidebar"
        >
          <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      )}
      <button
        onClick={onNavigateHome}
        className="w-11 h-11 flex items-center justify-center hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors cursor-pointer"
        title="All Brands"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    </div>
  );
}
