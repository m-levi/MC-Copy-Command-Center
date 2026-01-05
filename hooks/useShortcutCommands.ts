/**
 * Hook to convert user-created shortcuts (prompts) into slash commands
 * 
 * This bridges the gap between the prompt library (stored shortcuts)
 * and the slash command system used in the chat input.
 */

import { useMemo } from 'react';
import { Sparkles, type LucideIcon } from 'lucide-react';
import { usePromptLibrary } from './usePromptLibrary';
import { 
  type SlashCommand, 
  type SlashCommandCategory,
  filterCombinedCommands,
  combineCommands,
  findCommand as baseFindCommand,
} from '@/components/smart-input/slash-commands';
import { ConversationMode } from '@/types';

interface UseShortcutCommandsOptions {
  mode?: ConversationMode;
}

interface UseShortcutCommandsReturn {
  /** User shortcuts converted to slash commands */
  shortcutCommands: SlashCommand[];
  /** All commands (user shortcuts + built-in) */
  allCommands: SlashCommand[];
  /** Filter all commands by query */
  filterCommands: (query: string) => SlashCommand[];
  /** Find a command by its exact command string */
  findCommand: (command: string) => SlashCommand | undefined;
  /** Whether shortcuts are still loading */
  isLoading: boolean;
}

/**
 * Convert user prompts with slash_command enabled into SlashCommand format
 */
export function useShortcutCommands(options: UseShortcutCommandsOptions = {}): UseShortcutCommandsReturn {
  const { mode } = options;
  const { prompts, isLoading, getPromptsForMode } = usePromptLibrary({ activeOnly: true });

  // Convert active prompts with slash_command to SlashCommand format
  const shortcutCommands = useMemo((): SlashCommand[] => {
    // Get prompts - either filtered by mode or all active ones
    const relevantPrompts = mode ? getPromptsForMode(mode) : prompts;
    
    // Only include prompts that have a slash_command defined
    return relevantPrompts
      .filter(p => p.slash_command && p.is_active)
      .map(p => ({
        id: `shortcut-${p.id}`,
        command: `/${p.slash_command}`,
        label: p.name,
        description: p.description || p.prompt.slice(0, 60) + (p.prompt.length > 60 ? '...' : ''),
        icon: Sparkles as LucideIcon, // Use Sparkles for user shortcuts
        category: 'shortcuts' as SlashCommandCategory,
        prompt: p.prompt,
      }));
  }, [prompts, mode, getPromptsForMode]);

  // Combined list of all commands
  const allCommands = useMemo(() => {
    return combineCommands(shortcutCommands);
  }, [shortcutCommands]);

  // Filter function that includes user shortcuts
  const filterCommands = useMemo(() => {
    return (query: string) => filterCombinedCommands(query, shortcutCommands);
  }, [shortcutCommands]);

  // Find command function that includes user shortcuts
  const findCommand = useMemo(() => {
    return (command: string) => baseFindCommand(command, shortcutCommands);
  }, [shortcutCommands]);

  return {
    shortcutCommands,
    allCommands,
    filterCommands,
    findCommand,
    isLoading,
  };
}

export default useShortcutCommands;

















