import { useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean; // Command key on Mac
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: () => void;
  preventDefault?: boolean;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

/**
 * Hook for registering keyboard shortcuts
 * Automatically handles Mac/Windows differences (Cmd vs Ctrl)
 */
export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in input fields (except for specific cases like Escape)
    const target = event.target as HTMLElement;
    const isInputField = 
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true';

    for (const shortcut of shortcuts) {
      const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
      
      // Handle meta/ctrl as either/or for cross-platform support
      // If both are specified, it means "meta on Mac OR ctrl on Windows/Linux"
      const bothMetaAndCtrl = shortcut.meta && shortcut.ctrl;
      const metaOrCtrlMatches = bothMetaAndCtrl 
        ? (event.metaKey || event.ctrlKey)
        : true;
      
      const ctrlMatches = shortcut.ctrl && !bothMetaAndCtrl ? event.ctrlKey : true;
      const metaMatches = shortcut.meta && !bothMetaAndCtrl ? event.metaKey : true;
      const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const altMatches = shortcut.alt ? event.altKey : !event.altKey;

      if (keyMatches && metaOrCtrlMatches && ctrlMatches && metaMatches && shiftMatches && altMatches) {
        // Allow Escape to work in input fields
        if (shortcut.key === 'Escape' || !isInputField) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          
          logger.debug(`Keyboard shortcut triggered: ${shortcut.description}`);
          shortcut.action();
          break;
        }
      }
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);
}

/**
 * Format shortcut for display (handles platform differences)
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const parts: string[] = [];

  if (shortcut.ctrl && !isMac) parts.push('Ctrl');
  if (shortcut.meta || (shortcut.ctrl && isMac)) parts.push('⌘');
  if (shortcut.shift) parts.push('⇧');
  if (shortcut.alt) parts.push(isMac ? '⌥' : 'Alt');
  parts.push(shortcut.key.toUpperCase());

  return parts.join('');
}

/**
 * Common keyboard shortcuts for the app
 */
export const COMMON_SHORTCUTS = {
  COMMAND_PALETTE: {
    key: 'k',
    meta: true,
    ctrl: true, // Also support Ctrl+K on Windows/Linux
    description: 'Open command palette',
  },
  NEW_CONVERSATION: {
    key: 'n',
    meta: true,
    ctrl: true,
    description: 'New conversation',
  },
  NEW_FLOW: {
    key: 'n',
    meta: true,
    ctrl: true,
    shift: true,
    description: 'New flow',
  },
  SEARCH: {
    key: 'f',
    meta: true,
    ctrl: true,
    description: 'Search',
  },
  TOGGLE_SIDEBAR: {
    key: 'b',
    meta: true,
    ctrl: true,
    description: 'Toggle sidebar',
  },
  CLOSE_MODAL: {
    key: 'Escape',
    description: 'Close modal or dialog',
  },
  SAVE: {
    key: 's',
    meta: true,
    ctrl: true,
    description: 'Save',
  },
  HELP: {
    key: '/',
    meta: true,
    ctrl: true,
    description: 'Show keyboard shortcuts',
  },
} as const;

