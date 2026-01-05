'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AIModelOption } from '@/types';
import { ChevronDown, Check, Search, X, Sparkles, Zap, Brain, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

// Provider configuration with colors and icons
const PROVIDER_CONFIG: Record<string, { 
  name: string; 
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  anthropic: {
    name: 'Anthropic',
    icon: <Brain className="w-3.5 h-3.5" />,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/40',
    borderColor: 'border-amber-200/50 dark:border-amber-800/50',
  },
  openai: {
    name: 'OpenAI',
    icon: <Bot className="w-3.5 h-3.5" />,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
    borderColor: 'border-emerald-200/50 dark:border-emerald-800/50',
  },
  google: {
    name: 'Google',
    icon: <Sparkles className="w-3.5 h-3.5" />,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/40',
    borderColor: 'border-blue-200/50 dark:border-blue-800/50',
  },
};

interface ModelPickerProps {
  models: AIModelOption[];
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  /** Position dropdown above or below the trigger */
  dropdownPosition?: 'above' | 'below';
  /** Compact mode for inline use */
  compact?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

export default function ModelPicker({
  models,
  selectedModel,
  onModelChange,
  dropdownPosition = 'above',
  compact = false,
  disabled = false,
}: ModelPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState<{ 
    top?: number; 
    bottom?: number;
    left: number; 
    width: number;
    anchorFrom: 'top' | 'bottom';
  } | null>(null);
  
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Get current model info
  const currentModel = models.find(m => m.id === selectedModel) || models[0];

  // Filter and group models by provider
  const { filteredModels, modelsByProvider, flatModels } = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const filtered = query
      ? models.filter(m => 
          m.name.toLowerCase().includes(query) ||
          m.provider.toLowerCase().includes(query)
        )
      : models;

    // Group by provider
    const byProvider = filtered.reduce((acc, model) => {
      if (!acc[model.provider]) {
        acc[model.provider] = [];
      }
      acc[model.provider].push(model);
      return acc;
    }, {} as Record<string, AIModelOption[]>);

    // Create flat list for keyboard navigation
    const flat: AIModelOption[] = [];
    const providerOrder = ['anthropic', 'openai', 'google'];
    providerOrder.forEach(provider => {
      if (byProvider[provider]) {
        flat.push(...byProvider[provider]);
      }
    });
    // Add any providers not in the predefined order
    Object.keys(byProvider).forEach(provider => {
      if (!providerOrder.includes(provider)) {
        flat.push(...byProvider[provider]);
      }
    });

    return { 
      filteredModels: filtered, 
      modelsByProvider: byProvider,
      flatModels: flat 
    };
  }, [models, searchQuery]);

  // Calculate dropdown position relative to button
  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownWidth = Math.max(rect.width, 280);
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    let left: number = rect.left;
    
    // Adjust horizontal position if it would overflow the viewport
    if (left + dropdownWidth > viewportWidth - 16) {
      left = Math.max(8, viewportWidth - dropdownWidth - 16);
    }
    
    // Calculate vertical position based on available space
    const spaceAbove = rect.top;
    const spaceBelow = viewportHeight - rect.bottom;
    const minSpace = 100; // Minimum space needed for dropdown
    
    if (dropdownPosition === 'above') {
      // Prefer above - anchor dropdown's bottom to button's top
      if (spaceAbove >= minSpace || spaceAbove > spaceBelow) {
        // Position above: use bottom anchor (distance from viewport bottom to button top)
        const bottomAnchor = viewportHeight - rect.top + 8;
        setPosition({
          bottom: bottomAnchor,
          left,
          width: dropdownWidth,
          anchorFrom: 'bottom',
        });
      } else {
        // Fall back to below
        setPosition({
          top: rect.bottom + 8,
          left,
          width: dropdownWidth,
          anchorFrom: 'top',
        });
      }
    } else {
      // Prefer below - anchor dropdown's top to button's bottom
      if (spaceBelow >= minSpace || spaceBelow > spaceAbove) {
        setPosition({
          top: rect.bottom + 8,
          left,
          width: dropdownWidth,
          anchorFrom: 'top',
        });
      } else {
        // Fall back to above
        const bottomAnchor = viewportHeight - rect.top + 8;
        setPosition({
          bottom: bottomAnchor,
          left,
          width: dropdownWidth,
          anchorFrom: 'bottom',
        });
      }
    }
  }, [dropdownPosition]);

  // Open dropdown
  const openDropdown = useCallback(() => {
    updatePosition();
    setIsOpen(true);
    setSearchQuery('');
    // Set initial selected index to current model
    const currentIndex = flatModels.findIndex(m => m.id === selectedModel);
    setSelectedIndex(currentIndex >= 0 ? currentIndex : 0);
  }, [updatePosition, flatModels, selectedModel]);

  // Focus search on open
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Update position on scroll or resize
  useEffect(() => {
    if (!isOpen) return;

    const handleUpdate = () => {
      updatePosition();
    };

    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);
    
    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [isOpen, updatePosition]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        isOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        !buttonRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < flatModels.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : flatModels.length - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = flatModels[selectedIndex];
        if (selected) {
          onModelChange(selected.id);
          setIsOpen(false);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, flatModels, selectedIndex, onModelChange]);

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Get provider icon for current model
  const currentProviderConfig = PROVIDER_CONFIG[currentModel?.provider || 'anthropic'];

  // Sort providers
  const sortedProviders = useMemo(() => {
    const order = ['anthropic', 'openai', 'google'];
    return Object.keys(modelsByProvider).sort((a, b) => {
      const aIndex = order.indexOf(a);
      const bIndex = order.indexOf(b);
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }, [modelsByProvider]);

  // Dropdown content - only render when position is calculated
  const dropdown = isOpen && position && typeof document !== 'undefined' && createPortal(
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        ...(position.anchorFrom === 'bottom' 
          ? { bottom: position.bottom }
          : { top: position.top }
        ),
        left: position.left,
        width: position.width,
        maxWidth: 'calc(100vw - 16px)',
        maxHeight: 'calc(100vh - 100px)',
      }}
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Search */}
      {models.length > 4 && (
        <div className="p-2 border-b border-gray-100 dark:border-gray-800">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search models..."
              className="w-full pl-8 pr-8 py-2 text-sm rounded-lg bg-gray-50 dark:bg-gray-800 border-0 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-3 h-3 text-gray-400" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Models List */}
      <div className="max-h-[220px] overflow-y-auto p-1.5">
        {flatModels.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-gray-500">
            No models found
          </div>
        ) : (
          sortedProviders.map((provider, providerIndex) => {
            const providerModels = modelsByProvider[provider];
            const config = PROVIDER_CONFIG[provider] || {
              name: provider.charAt(0).toUpperCase() + provider.slice(1),
              icon: <Zap className="w-3.5 h-3.5" />,
              color: 'text-gray-600 dark:text-gray-400',
              bgColor: 'bg-gray-50 dark:bg-gray-800',
              borderColor: 'border-gray-200 dark:border-gray-700',
            };

            // Calculate starting index for this provider
            let startIndex = 0;
            for (let i = 0; i < providerIndex; i++) {
              const prevProvider = sortedProviders[i];
              startIndex += modelsByProvider[prevProvider]?.length || 0;
            }

            return (
              <div key={provider} className="mb-1.5 last:mb-0">
                {/* Provider Header */}
                <div className={cn(
                  "flex items-center gap-2 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider rounded-md mb-0.5",
                  config.color,
                  config.bgColor,
                )}>
                  {config.icon}
                  <span>{config.name}</span>
                </div>

                {/* Provider Models */}
                <div className="space-y-0.5">
                  {providerModels.map((model, modelIndex) => {
                    const globalIndex = startIndex + modelIndex;
                    const isSelected = selectedModel === model.id;
                    const isHighlighted = selectedIndex === globalIndex;

                    return (
                      <button
                        key={model.id}
                        onClick={() => {
                          onModelChange(model.id);
                          setIsOpen(false);
                        }}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={cn(
                          "w-full px-3 py-2 text-left text-sm rounded-lg flex items-center gap-2.5 transition-all duration-100",
                          isHighlighted 
                            ? "bg-gray-100 dark:bg-gray-800" 
                            : "hover:bg-gray-50 dark:hover:bg-gray-800/50",
                          isSelected 
                            ? "text-gray-900 dark:text-white font-medium" 
                            : "text-gray-600 dark:text-gray-400"
                        )}
                      >
                        <span className="flex-1">{model.name}</span>
                        {isSelected && (
                          <Check className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-400 dark:text-gray-500">
        <span className="inline-flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono">↑↓</kbd>
          to navigate
        </span>
        <span className="mx-2">·</span>
        <span className="inline-flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 font-mono">↵</kbd>
          to select
        </span>
      </div>
    </div>,
    document.body
  );

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => isOpen ? setIsOpen(false) : openDropdown()}
        disabled={disabled}
        className={cn(
          "flex items-center gap-1.5 rounded-lg transition-all duration-150",
          compact 
            ? "px-2 py-1.5 text-xs" 
            : "px-2.5 py-1.5 text-xs",
          isOpen
            ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/70",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span className="font-medium whitespace-nowrap">
          {currentModel?.name || 'Select model'}
        </span>
        <ChevronDown className={cn(
          "w-3 h-3 opacity-50 transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </button>

      {dropdown}
    </>
  );
}

/**
 * Inline version that opens upward (for chat input)
 */
export function InlineModelPicker(props: Omit<ModelPickerProps, 'dropdownPosition'>) {
  return <ModelPicker {...props} dropdownPosition="above" compact />;
}

