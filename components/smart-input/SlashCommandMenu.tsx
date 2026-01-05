'use client';

import { useEffect, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { 
  SLASH_COMMANDS, 
  SLASH_COMMAND_CATEGORIES, 
  filterCommands, 
  getCommandsByCategory,
  filterCombinedCommands,
  combineCommands,
  type SlashCommand,
  type SlashCommandCategory
} from './slash-commands';
import { useSmartInput } from './SmartInputContext';

export interface SlashCommandMenuProps {
  onSelectCommand: (command: SlashCommand) => void;
  className?: string;
  /** Filter to specific categories */
  categories?: SlashCommandCategory[];
  /** Maximum height */
  maxHeight?: string;
  /** Additional commands (e.g., user shortcuts) to include */
  additionalCommands?: SlashCommand[];
}

export function SlashCommandMenu({
  onSelectCommand,
  className,
  categories,
  maxHeight = '320px',
  additionalCommands = [],
}: SlashCommandMenuProps) {
  const { 
    commandQuery, 
    selectedCommandIndex, 
    setSelectedCommandIndex,
    showCommands,
  } = useSmartInput();
  
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  
  // Filter and group commands (including additional commands like user shortcuts)
  const filteredCommands = useMemo(() => {
    let commands = additionalCommands.length > 0
      ? filterCombinedCommands(commandQuery, additionalCommands)
      : filterCommands(commandQuery);
    
    if (categories) {
      commands = commands.filter(cmd => categories.includes(cmd.category));
    }
    
    return commands;
  }, [commandQuery, categories, additionalCommands]);
  
  const groupedCommands = useMemo(() => {
    return getCommandsByCategory(filteredCommands);
  }, [filteredCommands]);
  
  // Flat list for keyboard navigation
  const flatCommands = useMemo(() => {
    const flat: SlashCommand[] = [];
    SLASH_COMMAND_CATEGORIES.forEach(cat => {
      const commands = groupedCommands.get(cat.id) || [];
      flat.push(...commands);
    });
    return flat;
  }, [groupedCommands]);
  
  // Scroll selected item into view
  useEffect(() => {
    const element = itemRefs.current.get(selectedCommandIndex);
    if (element) {
      element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedCommandIndex]);
  
  // Reset selection when query changes
  useEffect(() => {
    setSelectedCommandIndex(0);
  }, [commandQuery, setSelectedCommandIndex]);
  
  if (!showCommands || flatCommands.length === 0) {
    return null;
  }
  
  let globalIndex = 0;
  
  return (
    <div 
      className={cn(
        "absolute bottom-full left-0 right-0 mb-2 z-50",
        "bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800",
        "rounded-xl shadow-xl overflow-hidden backdrop-blur-xl",
        "animate-in fade-in slide-in-from-bottom-2 duration-200",
        className
      )}
    >
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-gray-500 uppercase">
              Commands
            </span>
            {commandQuery && (
              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                • {flatCommands.length} results
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500">
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 font-mono">↑↓</kbd>
            <span>navigate</span>
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 font-mono ml-1">↵</kbd>
            <span>select</span>
          </div>
        </div>
      </div>
      
      {/* Commands list */}
      <div 
        ref={listRef}
        className="overflow-y-auto overscroll-contain"
        style={{ maxHeight }}
      >
        {SLASH_COMMAND_CATEGORIES.map(category => {
          const commands = groupedCommands.get(category.id) || [];
          if (commands.length === 0) return null;
          
          const CategoryIcon = category.icon;
          
          return (
            <div key={category.id} className="py-1.5">
              {/* Category header */}
              <div className="px-3 py-1.5 flex items-center gap-2">
                <CategoryIcon className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {category.label}
                </span>
              </div>
              
              {/* Commands */}
              <div className="px-1">
                {commands.map((command) => {
                  const index = globalIndex++;
                  const isSelected = index === selectedCommandIndex;
                  const CommandIcon = command.icon;
                  
                  return (
                    <button
                      key={command.id}
                      ref={el => {
                        if (el) itemRefs.current.set(index, el);
                      }}
                      onClick={() => onSelectCommand(command)}
                      onMouseEnter={() => setSelectedCommandIndex(index)}
                      className={cn(
                        "w-full px-2 py-2 text-left rounded-lg flex items-center gap-3 transition-all duration-75",
                        "outline-none focus:outline-none",
                        isSelected 
                          ? "bg-gray-100 dark:bg-gray-800" 
                          : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      )}
                    >
                      {/* Icon */}
                      <div className={cn(
                        "flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-colors",
                        isSelected 
                          ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                      )}>
                        <CommandIcon className="w-4 h-4" />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <code className={cn(
                            "text-[13px] font-medium font-mono",
                            isSelected 
                              ? "text-gray-900 dark:text-white" 
                              : "text-gray-700 dark:text-gray-200"
                          )}>
                            {command.command}
                          </code>
                          {command.isFormatting && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wide">
                              Insert
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {command.description}
                        </p>
                      </div>
                      
                      {/* Shortcut hint */}
                      {command.shortcut && (
                        <kbd className="hidden sm:inline text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 text-gray-400 font-mono">
                          {command.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        
        {/* Empty state */}
        {flatCommands.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No commands found for "{commandQuery}"
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Try a different search term
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact inline command suggestions (shown while typing /)
 */
export function SlashCommandInline({
  onSelectCommand,
  maxItems = 5,
  className,
}: {
  onSelectCommand: (command: SlashCommand) => void;
  maxItems?: number;
  className?: string;
}) {
  const { commandQuery, selectedCommandIndex, setSelectedCommandIndex, showCommands } = useSmartInput();
  
  const filteredCommands = useMemo(() => {
    return filterCommands(commandQuery).slice(0, maxItems);
  }, [commandQuery, maxItems]);
  
  if (!showCommands || filteredCommands.length === 0) {
    return null;
  }
  
  return (
    <div className={cn(
      "flex flex-wrap gap-1.5 px-3 py-2 border-t border-gray-100 dark:border-gray-800",
      className
    )}>
      {filteredCommands.map((command, index) => {
        const isSelected = index === selectedCommandIndex;
        const CommandIcon = command.icon;
        
        return (
          <button
            key={command.id}
            onClick={() => onSelectCommand(command)}
            onMouseEnter={() => setSelectedCommandIndex(index)}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
              isSelected
                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            )}
          >
            <CommandIcon className="w-3.5 h-3.5" />
            <span>{command.label}</span>
          </button>
        );
      })}
    </div>
  );
}







