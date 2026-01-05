'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { CustomMode, ModeColor, MODE_COLOR_META, ConversationMode, isCustomMode } from '@/types';
import { useCustomModes } from '@/hooks/useCustomModes';
import { Lightbulb, Pencil, ChevronDown, Search, Check, Sparkles, GitMerge, Bot } from 'lucide-react';

interface InlineModePicker {
  value: ConversationMode;
  onChange: (mode: ConversationMode, customModeId?: string) => void;
  disabled?: boolean;
  compact?: boolean;
  /** Use minimal styling to match inline controls (no border) */
  minimal?: boolean;
}

// Built-in modes
// 'assistant' is the orchestrator mode that can invoke specialists automatically
const BUILT_IN_MODES = [
  { id: 'assistant' as const, name: 'Assistant', description: 'AI figures out what you need', icon: Sparkles, color: 'indigo' as ModeColor },
  { id: 'planning' as const, name: 'Chat', description: 'Ask questions & explore ideas', icon: Lightbulb, color: 'blue' as ModeColor },
  { id: 'email_copy' as const, name: 'Write', description: 'Generate email copy', icon: Pencil, color: 'purple' as ModeColor },
  { id: 'flow' as const, name: 'Flow', description: 'Multi-email automation', icon: GitMerge, color: 'pink' as ModeColor },
];

export default function InlineModePicker({ value, onChange, disabled, compact, minimal }: InlineModePicker) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedCustomMode, setSelectedCustomMode] = useState<CustomMode | null>(null);
  
  const ref = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  
  const { customModes, loading } = useCustomModes();

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opening
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the dropdown is rendered
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 10);
    }
  }, [isOpen]);

  // Track selected custom mode
  useEffect(() => {
    if (isCustomMode(value)) {
      const modeId = value.replace('custom_', '');
      const mode = customModes.find(m => m.id === modeId);
      setSelectedCustomMode(mode || null);
    } else {
      setSelectedCustomMode(null);
    }
  }, [value, customModes]);

  // Filter modes based on search query
  const activeCustomModes = useMemo(() => 
    customModes.filter(m => m.is_active),
    [customModes]
  );

  const filteredModes = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    
    const filteredBuiltIn = BUILT_IN_MODES.filter(m => 
      !query || 
      m.name.toLowerCase().includes(query) ||
      m.description.toLowerCase().includes(query)
    );
    
    const filteredCustom = activeCustomModes.filter(m =>
      !query ||
      m.name.toLowerCase().includes(query) ||
      (m.description?.toLowerCase().includes(query))
    );
    
    return { builtIn: filteredBuiltIn, custom: filteredCustom };
  }, [searchQuery, activeCustomModes]);

  // All items for keyboard navigation
  const allItems = useMemo(() => {
    const items: Array<{ type: 'builtin' | 'custom'; id: string; mode: typeof BUILT_IN_MODES[0] | CustomMode }> = [];
    
    filteredModes.builtIn.forEach(m => items.push({ type: 'builtin', id: m.id, mode: m }));
    filteredModes.custom.forEach(m => items.push({ type: 'custom', id: m.id, mode: m }));
    
    return items;
  }, [filteredModes]);

  // Reset selected index when filtered items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [allItems.length]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && allItems.length > 0) {
      const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selectedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, allItems.length]);

  const getCurrentMode = () => {
    if (selectedCustomMode) {
      return {
        name: selectedCustomMode.name,
        icon: selectedCustomMode.icon,
        color: selectedCustomMode.color,
        isCustom: true,
      };
    }
    const builtIn = BUILT_IN_MODES.find(m => m.id === value);
    if (builtIn) {
      return {
        name: builtIn.name,
        icon: null,
        IconComponent: builtIn.icon,
        color: builtIn.color,
        isCustom: false,
      };
    }
    return { name: 'Write', IconComponent: Pencil, color: 'purple' as ModeColor, isCustom: false };
  };

  const currentMode = getCurrentMode();
  const colorMeta = MODE_COLOR_META[currentMode.color];

  const handleSelectBuiltIn = useCallback((mode: typeof BUILT_IN_MODES[0]) => {
    onChange(mode.id);
    setIsOpen(false);
    setSearchQuery('');
  }, [onChange]);

  const handleSelectCustom = useCallback((mode: CustomMode) => {
    onChange(`custom_${mode.id}` as ConversationMode, mode.id);
    setIsOpen(false);
    setSearchQuery('');
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % allItems.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + allItems.length) % allItems.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (allItems[selectedIndex]) {
          const item = allItems[selectedIndex];
          if (item.type === 'builtin') {
            handleSelectBuiltIn(item.mode as typeof BUILT_IN_MODES[0]);
          } else {
            handleSelectCustom(item.mode as CustomMode);
          }
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery('');
        break;
    }
  }, [isOpen, allItems, selectedIndex, handleSelectBuiltIn, handleSelectCustom]);

  const totalModeCount = BUILT_IN_MODES.length + activeCustomModes.length;
  const showSearch = totalModeCount > 5;

  return (
    <div ref={ref} className="relative" onKeyDown={handleKeyDown}>
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={minimal 
          ? `flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium select-none transition-colors ${
              disabled
                ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`
          : `flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-colors ${
              isOpen 
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' 
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`
        }
      >
        {currentMode.isCustom ? (
          <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${colorMeta.bg} ${colorMeta.text} ${colorMeta.darkBg} ${colorMeta.darkText}`}>
            {currentMode.icon}
          </span>
        ) : currentMode.IconComponent && !minimal ? (
          <currentMode.IconComponent className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        ) : null}
        {!compact && (
          <span className={minimal ? "" : "text-sm font-medium text-gray-700 dark:text-gray-300"}>
            {currentMode.name}
          </span>
        )}
        {!disabled && <ChevronDown className={`w-3 h-3 ${minimal ? 'opacity-50' : 'text-gray-400'} transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-1.5 left-0 w-64 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-bottom-left">
          
          {/* Search Input */}
          {showSearch && (
            <div className="p-2 border-b border-gray-100 dark:border-gray-800">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search agents..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border-0 rounded-md focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          )}

          {/* Modes List */}
          <div ref={listRef} className="max-h-[280px] overflow-y-auto p-1">
            {/* Built-in Modes */}
            {filteredModes.builtIn.length > 0 && (
              <>
                {filteredModes.builtIn.map((mode, idx) => {
                  const isSelected = value === mode.id;
                  const isHighlighted = selectedIndex === idx;
                  return (
                    <button
                      key={mode.id}
                      data-index={idx}
                      onClick={() => handleSelectBuiltIn(mode)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full px-2.5 py-2 text-left rounded-md flex items-center gap-2.5 transition-colors ${
                        isHighlighted
                          ? 'bg-gray-100 dark:bg-gray-800'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <mode.icon className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-medium ${isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                          {mode.name}
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-500 truncate">
                          {mode.description}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 flex-shrink-0 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </button>
                  );
                })}
              </>
            )}

            {/* Divider with section header */}
            {filteredModes.builtIn.length > 0 && filteredModes.custom.length > 0 && (
              <div className="my-1.5">
                <div className="border-t border-gray-100 dark:border-gray-800" />
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 mt-1">
                  <Bot className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                  <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Your Agents
                  </span>
                </div>
              </div>
            )}

            {/* Custom Agents */}
            {filteredModes.custom.length > 0 && (
              <>
                {filteredModes.custom.map((mode, idx) => {
                  const globalIdx = filteredModes.builtIn.length + idx;
                  const isSelected = selectedCustomMode?.id === mode.id;
                  const isHighlighted = selectedIndex === globalIdx;
                  const modeColorMeta = MODE_COLOR_META[mode.color];
                  
                  return (
                    <button
                      key={mode.id}
                      data-index={globalIdx}
                      onClick={() => handleSelectCustom(mode)}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      className={`w-full px-2.5 py-2 text-left rounded-md flex items-center gap-2.5 transition-colors ${
                        isHighlighted
                          ? 'bg-gray-100 dark:bg-gray-800'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded flex items-center justify-center text-xs flex-shrink-0 ${modeColorMeta.bg} ${modeColorMeta.text} ${modeColorMeta.darkBg} ${modeColorMeta.darkText}`}>
                        {mode.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-medium ${isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                          {mode.name}
                        </div>
                        {mode.description && (
                          <div className="text-[10px] text-gray-500 dark:text-gray-500 truncate">
                            {mode.description}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 flex-shrink-0 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </button>
                  );
                })}
              </>
            )}

            {/* No results */}
            {filteredModes.builtIn.length === 0 && filteredModes.custom.length === 0 && (
              <div className="px-3 py-4 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">No agents found</p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="px-3 py-2 text-xs text-gray-500 text-center">
                Loading agents...
              </div>
            )}
          </div>

          {/* Footer with count */}
          {totalModeCount > 0 && (
            <div className="px-3 py-1.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <p className="text-[10px] text-gray-400 dark:text-gray-500">
                {allItems.length === totalModeCount 
                  ? `${totalModeCount} agent${totalModeCount !== 1 ? 's' : ''} available`
                  : `${allItems.length} of ${totalModeCount} agents`
                }
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}








