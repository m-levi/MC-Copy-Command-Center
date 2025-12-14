'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  X,
  Keyboard,
  Navigation,
  MousePointerClick,
  PenLine,
  Command,
} from 'lucide-react';

interface Shortcut {
  keys: string;
  description: string;
  category: string;
}

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  'Navigation': <Navigation className="w-4 h-4" />,
  'Actions': <MousePointerClick className="w-4 h-4" />,
  'Editing': <PenLine className="w-4 h-4" />,
  'Command Palette': <Command className="w-4 h-4" />,
};

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
    { keys: 'Tab', description: 'Next item', category: 'Command Palette' },
    { keys: '>', description: 'Enter command mode', category: 'Command Palette' },
    { keys: 'ESC', description: 'Clear search or close', category: 'Command Palette' },
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
        className="fixed inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-sm z-[9998] animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999] pointer-events-none">
        <div className="bg-popover rounded-xl shadow-2xl border border-border/50 max-w-2xl w-full pointer-events-auto max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Keyboard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Keyboard Shortcuts
                </h2>
                <p className="text-sm text-muted-foreground">
                  Work faster with these shortcuts
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-5 space-y-6 overflow-y-auto max-h-[calc(85vh-140px)]">
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-muted-foreground">
                    {categoryIcons[category] || <Keyboard className="w-4 h-4" />}
                  </span>
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    {category}
                  </h3>
                </div>
                <div className="space-y-1">
                  {categoryShortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2.5 px-3 hover:bg-accent/50 rounded-lg transition-colors group"
                    >
                      <span className="text-sm text-foreground/90 group-hover:text-foreground">
                        {shortcut.description}
                      </span>
                      <kbd className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-medium",
                        "text-muted-foreground bg-muted rounded-md border border-border/50",
                        "shadow-sm"
                      )}>
                        {shortcut.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 bg-muted/30 border-t border-border/50">
            <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-2">
              Press 
              <kbd className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground bg-background rounded border border-border/50">
                ESC
              </kbd> 
              or click outside to close
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
