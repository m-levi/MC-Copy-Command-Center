'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusIcon, ChevronDownIcon, Loader2Icon } from 'lucide-react';
import { usePromptLibrary } from '@/hooks/usePromptLibrary';
import { SavedPrompt } from '@/types/prompts';
import { ConversationMode } from '@/types';

interface QuickActionChipsProps {
  mode: ConversationMode;
  onSendPrompt: (prompt: string) => void;
  isStreaming?: boolean;
  maxVisible?: number;
  className?: string;
}

export function QuickActionChips({
  mode,
  onSendPrompt,
  isStreaming = false,
  maxVisible = 3,
  className = '',
}: QuickActionChipsProps) {
  const { prompts, isLoading, getPromptsForMode } = usePromptLibrary({ activeOnly: true });
  const [showAll, setShowAll] = useState(false);
  const [sendingPromptId, setSendingPromptId] = useState<string | null>(null);

  // Get prompts for current mode
  const modePrompts = getPromptsForMode(mode);
  
  // Split into visible and overflow
  const visiblePrompts = modePrompts.slice(0, maxVisible);
  const overflowPrompts = modePrompts.slice(maxVisible);
  const hasOverflow = overflowPrompts.length > 0;

  const handleClick = useCallback(async (prompt: SavedPrompt) => {
    if (isStreaming || sendingPromptId) return;
    
    setSendingPromptId(prompt.id);
    
    // Small delay for visual feedback
    await new Promise(resolve => setTimeout(resolve, 150));
    
    onSendPrompt(prompt.prompt);
    setSendingPromptId(null);
    setShowAll(false);
  }, [isStreaming, sendingPromptId, onSendPrompt]);

  // Don't show if loading or no prompts
  if (isLoading || modePrompts.length === 0) {
    return null;
  }

  // Don't show while streaming
  if (isStreaming) {
    return null;
  }

  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
      {/* Visible chips */}
      {visiblePrompts.map((prompt, index) => (
        <motion.button
          key={prompt.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => handleClick(prompt)}
          disabled={!!sendingPromptId}
          className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
            ${sendingPromptId === prompt.id 
              ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300' 
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {sendingPromptId === prompt.id ? (
            <Loader2Icon className="w-3 h-3 animate-spin" />
          ) : (
            <span className="text-sm">{prompt.icon}</span>
          )}
          <span>{prompt.name}</span>
        </motion.button>
      ))}

      {/* Overflow / More button */}
      {hasOverflow && (
        <div className="relative">
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: maxVisible * 0.05 }}
            onClick={() => setShowAll(!showAll)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all
              ${showAll 
                ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }
            `}
          >
            <PlusIcon className="w-3 h-3" />
            <span>{overflowPrompts.length} more</span>
            <ChevronDownIcon className={`w-3 h-3 transition-transform ${showAll ? 'rotate-180' : ''}`} />
          </motion.button>

          {/* Dropdown */}
          <AnimatePresence>
            {showAll && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                className="absolute left-0 bottom-full mb-2 z-20 min-w-[180px] p-1.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl"
              >
                {overflowPrompts.map((prompt) => (
                  <button
                    key={prompt.id}
                    onClick={() => handleClick(prompt)}
                    disabled={!!sendingPromptId}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    {sendingPromptId === prompt.id ? (
                      <Loader2Icon className="w-4 h-4 animate-spin text-violet-500" />
                    ) : (
                      <span className="text-base">{prompt.icon}</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{prompt.name}</div>
                      {prompt.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {prompt.description}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export default QuickActionChips;

