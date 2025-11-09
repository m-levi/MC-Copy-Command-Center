'use client';

import { useEffect } from 'react';

interface Shortcut {
  keys: string;
  description: string;
  category: string;
}

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? '⌘' : 'Ctrl';

  const shortcuts: Shortcut[] = [
    // Navigation
    { keys: `${modKey} + K`, description: 'Open command palette', category: 'Navigation' },
    { keys: `${modKey} + N`, description: 'New conversation', category: 'Navigation' },
    { keys: `${modKey} + ⇧ + N`, description: 'New email flow', category: 'Navigation' },
    { keys: `${modKey} + B`, description: 'Toggle sidebar', category: 'Navigation' },
    { keys: `${modKey} + /`, description: 'Show this help', category: 'Navigation' },
    
    // Actions
    { keys: `${modKey} + S`, description: 'Save draft (auto-saves already)', category: 'Actions' },
    { keys: `${modKey} + Enter`, description: 'Send message', category: 'Actions' },
    { keys: 'ESC', description: 'Close modal or cancel', category: 'Actions' },
    
    // Editing
    { keys: `${modKey} + Z`, description: 'Undo', category: 'Editing' },
    { keys: `${modKey} + ⇧ + Z`, description: 'Redo', category: 'Editing' },
    { keys: `${modKey} + A`, description: 'Select all', category: 'Editing' },
    
    // Command Palette (when open)
    { keys: '↑ / ↓', description: 'Navigate results', category: 'Command Palette' },
    { keys: 'Enter', description: 'Select item', category: 'Command Palette' },
    { keys: 'ESC', description: 'Close palette', category: 'Command Palette' },
  ];

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-[9998]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999] pointer-events-none">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-2xl w-full pointer-events-auto max-h-[80vh] overflow-y-auto">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Keyboard Shortcuts
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Work faster with these keyboard shortcuts
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-6">
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  {category}
                </h3>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                    >
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {shortcut.description}
                      </span>
                      <kbd className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-sm">
                        {shortcut.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 rounded-b-xl">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">ESC</kbd> or click outside to close
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

