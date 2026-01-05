'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Brand } from '@/types';
import { PERSONAL_AI_INFO } from '@/lib/personal-ai';
import { cn } from '@/lib/utils';
import { 
  Search, 
  Home, 
  Sparkles, 
  Check, 
  X,
  Clock
} from 'lucide-react';

const RECENT_BRANDS_KEY = 'recent-brands';
const MAX_RECENT_BRANDS = 3;

interface BrandSelectorDropdownProps {
  allBrands: Brand[];
  currentBrandId?: string;
  onBrandSelect: (brandId: string) => void;
  onNavigateHome?: () => void;
  onClose: () => void;
  isMobile?: boolean;
}

export default function BrandSelectorDropdown({
  allBrands,
  currentBrandId,
  onBrandSelect,
  onNavigateHome,
  onClose,
  isMobile = false,
}: BrandSelectorDropdownProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [recentBrandIds, setRecentBrandIds] = useState<string[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Load recent brands from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_BRANDS_KEY);
      if (stored) {
        setRecentBrandIds(JSON.parse(stored));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Save brand to recent list
  const saveToRecent = useCallback((brandId: string) => {
    // Don't save personal AI to recent
    if (brandId === PERSONAL_AI_INFO.id) return;
    
    setRecentBrandIds(prev => {
      const filtered = prev.filter(id => id !== brandId);
      const updated = [brandId, ...filtered].slice(0, MAX_RECENT_BRANDS);
      try {
        localStorage.setItem(RECENT_BRANDS_KEY, JSON.stringify(updated));
      } catch {
        // Ignore localStorage errors
      }
      return updated;
    });
  }, []);

  // Filter brands based on search query
  const filteredBrands = useMemo(() => {
    if (!searchQuery.trim()) return allBrands;
    
    const query = searchQuery.toLowerCase().trim();
    return allBrands.filter(brand => 
      brand.name.toLowerCase().includes(query)
    );
  }, [allBrands, searchQuery]);

  // Get recent brands that exist in allBrands
  const recentBrands = useMemo(() => {
    if (searchQuery.trim()) return []; // Don't show recent when searching
    return recentBrandIds
      .map(id => allBrands.find(b => b.id === id))
      .filter((b): b is Brand => b !== undefined && b.id !== currentBrandId)
      .slice(0, MAX_RECENT_BRANDS);
  }, [recentBrandIds, allBrands, searchQuery, currentBrandId]);

  // Build navigable items list for keyboard navigation
  // Order: [Home, AI Assistant, ...Recent, ...Filtered Brands]
  const navigableItems = useMemo(() => {
    const items: { type: 'action' | 'recent' | 'brand'; id: string; label: string }[] = [];
    
    // Quick actions
    if (onNavigateHome) {
      items.push({ type: 'action', id: 'home', label: 'All Brands' });
    }
    items.push({ type: 'action', id: 'ai', label: PERSONAL_AI_INFO.name });
    
    // Recent brands (only when not searching)
    if (!searchQuery.trim()) {
      recentBrands.forEach(brand => {
        items.push({ type: 'recent', id: brand.id, label: brand.name });
      });
    }
    
    // Filtered brands
    filteredBrands.forEach(brand => {
      // Skip if already in recent
      if (recentBrands.some(r => r.id === brand.id)) return;
      items.push({ type: 'brand', id: brand.id, label: brand.name });
    });
    
    return items;
  }, [onNavigateHome, recentBrands, filteredBrands, searchQuery]);

  // Auto-focus search on mount
  useEffect(() => {
    // Small delay to ensure smooth animation
    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Global escape key handler - ensures escape always closes dropdown
  useEffect(() => {
    const handleGlobalEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleGlobalEscape, true); // Use capture phase
    return () => document.removeEventListener('keydown', handleGlobalEscape, true);
  }, [onClose]);

  // Reset focus when search changes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [searchQuery]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && focusedIndex < navigableItems.length) {
      const item = navigableItems[focusedIndex];
      const element = itemRefs.current.get(`${item.type}-${item.id}`);
      element?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusedIndex, navigableItems]);

  // Handle brand selection
  const handleSelect = useCallback((brandId: string, type: 'action' | 'recent' | 'brand') => {
    if (type === 'action') {
      if (brandId === 'home') {
        onNavigateHome?.();
        onClose();
      } else if (brandId === 'ai') {
        router.push(`/brands/${PERSONAL_AI_INFO.id}/chat`);
        onClose();
      }
      return;
    }
    
    saveToRecent(brandId);
    onBrandSelect(brandId);
    onClose();
  }, [onNavigateHome, onClose, router, saveToRecent, onBrandSelect]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        e.stopPropagation(); // Prevent double-firing when event bubbles
        setFocusedIndex(prev => 
          prev < navigableItems.length - 1 ? prev + 1 : 0
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        e.stopPropagation(); // Prevent double-firing when event bubbles
        setFocusedIndex(prev => 
          prev > 0 ? prev - 1 : navigableItems.length - 1
        );
        break;
        
      case 'Enter':
        e.preventDefault();
        e.stopPropagation();
        if (focusedIndex >= 0 && focusedIndex < navigableItems.length) {
          const item = navigableItems[focusedIndex];
          handleSelect(item.id, item.type);
        } else if (searchQuery.trim() && filteredBrands.length === 1) {
          // Auto-select single match
          handleSelect(filteredBrands[0].id, 'brand');
        }
        break;
        
      case 'Escape':
        // Handled by global listener
        break;
        
      case 'Home':
        e.preventDefault();
        e.stopPropagation();
        setFocusedIndex(0);
        break;
        
      case 'End':
        e.preventDefault();
        e.stopPropagation();
        setFocusedIndex(navigableItems.length - 1);
        break;
        
      case 'Tab':
        // Close on tab out
        e.preventDefault();
        e.stopPropagation();
        onClose();
        break;
    }
  }, [navigableItems, focusedIndex, handleSelect, onClose, searchQuery, filteredBrands]);

  // Highlight matching text in brand name
  const highlightMatch = useCallback((text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-900/50 text-inherit rounded px-0.5">
          {part}
        </mark>
      ) : part
    );
  }, []);

  // Get item index for focus tracking
  const getItemIndex = useCallback((type: 'action' | 'recent' | 'brand', id: string) => {
    return navigableItems.findIndex(item => item.type === type && item.id === id);
  }, [navigableItems]);

  return (
    <div 
      ref={containerRef}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden"
      style={{ 
        maxHeight: isMobile ? '70vh' : '480px',
        width: isMobile ? 'calc(100vw - 2rem)' : '300px',
        maxWidth: '340px'
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={handleKeyDown}
      role="listbox"
      aria-label="Select a brand"
    >
      {/* Search Input */}
      <div className="p-2 border-b border-gray-100 dark:border-gray-700/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search brands..."
            className={cn(
              "w-full pl-9 pr-8 py-2.5 text-sm rounded-lg",
              "bg-gray-100/80 dark:bg-gray-900/60",
              "border-0",
              "text-gray-900 dark:text-white",
              "placeholder:text-gray-400 dark:placeholder:text-gray-500",
              "focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-900/80",
              "transition-colors duration-150"
            )}
            aria-label="Search brands"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {/* Keyboard hint */}
        <div className="flex items-center gap-2 mt-2 px-1 text-[10px] text-gray-400 dark:text-gray-500">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[9px] font-mono">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[9px] font-mono">↵</kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[9px] font-mono">esc</kbd>
            close
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-2 border-b border-gray-100 dark:border-gray-700/50 space-y-0.5">
        {onNavigateHome && (
          <button
            ref={(el) => { if (el) itemRefs.current.set('action-home', el); }}
            onClick={() => handleSelect('home', 'action')}
            className={cn(
              "w-full px-3 py-2.5 text-sm text-left rounded-lg transition-all flex items-center gap-2.5 font-medium",
              getItemIndex('action', 'home') === focusedIndex
                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            )}
          >
            <Home className="w-4 h-4" />
            All Brands
          </button>
        )}
        
        <button
          ref={(el) => { if (el) itemRefs.current.set('action-ai', el); }}
          onClick={() => handleSelect('ai', 'action')}
          className={cn(
            "w-full px-3 py-2.5 text-sm text-left rounded-lg transition-all flex items-center gap-2.5 font-medium",
            getItemIndex('action', 'ai') === focusedIndex
              ? "bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
              : "text-gray-700 dark:text-gray-300 hover:bg-violet-50 dark:hover:bg-violet-900/30 hover:text-violet-700 dark:hover:text-violet-300"
          )}
        >
          <span className="text-base">{PERSONAL_AI_INFO.icon}</span>
          {PERSONAL_AI_INFO.name}
          <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400 rounded-full font-medium">
            Private
          </span>
        </button>
      </div>

      {/* Scrollable Content */}
      <div 
        ref={listRef}
        className="overflow-y-auto overscroll-contain"
        style={{ 
          maxHeight: isMobile ? 'calc(70vh - 180px)' : '300px',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {/* Recent Brands Section */}
        {recentBrands.length > 0 && (
          <div className="p-2 border-b border-gray-100 dark:border-gray-700/50">
            <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Recent
            </div>
            <div className="space-y-0.5">
              {recentBrands.map((brand) => {
                const itemIndex = getItemIndex('recent', brand.id);
                return (
                  <button
                    key={`recent-${brand.id}`}
                    ref={(el) => { if (el) itemRefs.current.set(`recent-${brand.id}`, el); }}
                    onClick={() => handleSelect(brand.id, 'recent')}
                    role="option"
                    aria-selected={brand.id === currentBrandId}
                    className={cn(
                      "w-full px-3 py-2 text-sm text-left transition-all cursor-pointer flex items-center justify-between rounded-lg",
                      itemIndex === focusedIndex
                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        : brand.id === currentBrandId
                          ? "bg-gray-100 dark:bg-gray-700/50 text-gray-900 dark:text-white font-medium"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 bg-gradient-to-br from-gray-400 to-gray-500 rounded-md flex items-center justify-center flex-shrink-0 opacity-60">
                        <span className="text-white font-semibold text-xs">
                          {brand.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="truncate">{brand.name}</span>
                    </div>
                    {brand.id === currentBrandId && (
                      <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Brand List */}
        <div className="p-2">
          <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {searchQuery.trim() 
              ? `${filteredBrands.length} result${filteredBrands.length !== 1 ? 's' : ''}`
              : 'Your Brands'
            }
          </div>
          
          {filteredBrands.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <div className="text-gray-400 dark:text-gray-500 mb-2">
                <Search className="w-8 h-8 mx-auto opacity-50" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No brands found for "{searchQuery}"
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredBrands.map((brand) => {
                // Skip if already shown in recent
                if (recentBrands.some(r => r.id === brand.id)) return null;
                
                const itemIndex = getItemIndex('brand', brand.id);
                return (
                  <button
                    key={brand.id}
                    ref={(el) => { if (el) itemRefs.current.set(`brand-${brand.id}`, el); }}
                    onClick={() => handleSelect(brand.id, 'brand')}
                    role="option"
                    aria-selected={brand.id === currentBrandId}
                    className={cn(
                      "w-full px-3 py-2.5 text-sm text-left transition-all cursor-pointer flex items-center justify-between rounded-lg group",
                      itemIndex === focusedIndex
                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        : brand.id === currentBrandId
                          ? "bg-gray-100 dark:bg-gray-700/50 text-gray-900 dark:text-white font-medium"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
                        brand.id === currentBrandId
                          ? "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md"
                          : "bg-gradient-to-br from-gray-400 to-gray-500 group-hover:from-blue-400 group-hover:to-indigo-500"
                      )}>
                        <span className="text-white font-bold text-xs">
                          {brand.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="truncate">
                        {highlightMatch(brand.name, searchQuery)}
                      </span>
                    </div>
                    {brand.id === currentBrandId && (
                      <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

