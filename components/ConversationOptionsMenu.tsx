'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import {
  Download,
  FileText,
  Link2,
  Printer,
  Moon,
  Sun,
  Search,
  Star,
  StarOff,
  ExternalLink,
  Maximize2,
  Mail,
  Check,
} from 'lucide-react';

interface ConversationOptionsMenuProps {
  conversationId: string;
  conversationTitle: string;
  onToggleTheme?: () => void;
  onClose: () => void;
}

type ActionMenuItem = {
  id: string;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
};

type DividerItem = { type: 'divider' };
type HeaderItem = { type: 'header'; label: string };
type MenuItem = ActionMenuItem | DividerItem | HeaderItem;

export default function ConversationOptionsMenu({
  conversationId,
  conversationTitle,
  onToggleTheme,
  onClose
}: ConversationOptionsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isDark, setIsDark] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [copied, setCopied] = useState(false);

  // Check dark mode
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  // Check if conversation is favorited (from localStorage)
  useEffect(() => {
    const favorites = JSON.parse(localStorage.getItem('favorite-conversations') || '[]');
    setIsFavorite(favorites.includes(conversationId));
  }, [conversationId]);

  // Position and mount animation
  useEffect(() => {
    const calculatePosition = () => {
      const button = document.querySelector('[data-conversation-menu-trigger]');
      if (button) {
        const rect = button.getBoundingClientRect();
        const menuWidth = 280;
        const menuHeight = 420;
        
        let x = rect.right - menuWidth;
        let y = rect.bottom + 8;
        
        // Keep menu within viewport
        if (x < 16) x = 16;
        if (x + menuWidth > window.innerWidth - 16) x = window.innerWidth - menuWidth - 16;
        if (y + menuHeight > window.innerHeight - 16) {
          y = rect.top - menuHeight - 8;
        }
        
        setPosition({ x, y });
      }
    };

    calculatePosition();
    // Small delay for mount animation
    requestAnimationFrame(() => setMounted(true));
    
    window.addEventListener('resize', calculatePosition);
    return () => window.removeEventListener('resize', calculatePosition);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        const trigger = document.querySelector('[data-conversation-menu-trigger]');
        if (trigger && trigger.contains(event.target as Node)) {
          return;
        }
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Actions
  const handleDownloadLatestEmail = useCallback(() => {
    const messages = document.querySelectorAll('[data-message-role="assistant"]');
    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      const content = lastMessage.textContent || '';
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `email-${conversationTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Email downloaded');
    } else {
      toast.error('No email content found');
    }
    onClose();
  }, [conversationTitle, onClose]);

  const handleDownloadMarkdown = useCallback(() => {
    const allMessages = Array.from(document.querySelectorAll('[data-message-role]'));
    if (allMessages.length === 0) {
      toast.error('No messages to export');
      onClose();
      return;
    }
    
    const header = `# ${conversationTitle}\n\n_Exported ${new Date().toLocaleDateString()}_\n\n---\n\n`;
    const content = allMessages.map(msg => {
      const role = msg.getAttribute('data-message-role');
      const text = msg.textContent || '';
      return `## ${role === 'user' ? '👤 You' : '🤖 Assistant'}\n\n${text}\n`;
    }).join('\n---\n\n');
    
    const blob = new Blob([header + content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conversationTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported as Markdown');
    onClose();
  }, [conversationTitle, onClose]);

  const handleDownloadJSON = useCallback(() => {
    const allMessages = Array.from(document.querySelectorAll('[data-message-role]'));
    if (allMessages.length === 0) {
      toast.error('No messages to export');
      onClose();
      return;
    }
    
    const data = {
      title: conversationTitle,
      exportedAt: new Date().toISOString(),
      messages: allMessages.map((msg, index) => ({
        id: index,
        role: msg.getAttribute('data-message-role'),
        content: msg.textContent || '',
      }))
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conversationTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported as JSON');
    onClose();
  }, [conversationTitle, onClose]);

  const handleCopyURL = useCallback(async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied');
      setTimeout(() => {
        setCopied(false);
        onClose();
      }, 600);
    } catch {
      toast.error('Failed to copy');
      onClose();
    }
  }, [onClose]);

  const handlePrint = useCallback(() => {
    window.print();
    onClose();
  }, [onClose]);

  const handleToggleFavorite = useCallback(() => {
    const favorites = JSON.parse(localStorage.getItem('favorite-conversations') || '[]');
    let newFavorites: string[];
    
    if (isFavorite) {
      newFavorites = favorites.filter((id: string) => id !== conversationId);
      toast.success('Removed from favorites');
    } else {
      newFavorites = [...favorites, conversationId];
      toast.success('Added to favorites');
    }
    
    localStorage.setItem('favorite-conversations', JSON.stringify(newFavorites));
    setIsFavorite(!isFavorite);
    onClose();
  }, [conversationId, isFavorite, onClose]);

  const handleToggleThemeInternal = useCallback(() => {
    onToggleTheme?.();
    setIsDark(!isDark);
    onClose();
  }, [isDark, onToggleTheme, onClose]);

  const handleOpenInNewTab = useCallback(() => {
    window.open(window.location.href, '_blank');
    onClose();
  }, [onClose]);

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      toast.success('Entered fullscreen');
    } else {
      document.exitFullscreen();
    }
    onClose();
  }, [onClose]);

  const handleSearchConversation = useCallback(() => {
    toast('Press ⌘F to search in conversation', { icon: '🔍' });
    onClose();
  }, [onClose]);

  // Memoize menu items to avoid recreation on every render
  const menuItems: MenuItem[] = useMemo(() => [
    { type: 'header', label: 'Export' },
    {
      id: 'download-email',
      icon: <Mail className="w-4 h-4" />,
      label: 'Download Latest Email',
      shortcut: '⌘D',
      onClick: handleDownloadLatestEmail,
    },
    {
      id: 'export-md',
      icon: <FileText className="w-4 h-4" />,
      label: 'Export as Markdown',
      onClick: handleDownloadMarkdown,
    },
    {
      id: 'export-json',
      icon: <Download className="w-4 h-4" />,
      label: 'Export as JSON',
      onClick: handleDownloadJSON,
    },
    { type: 'divider' },
    { type: 'header', label: 'Share' },
    {
      id: 'copy-link',
      icon: copied ? <Check className="w-4 h-4 text-green-500" /> : <Link2 className="w-4 h-4" />,
      label: copied ? 'Copied!' : 'Copy Link',
      shortcut: '⌘L',
      onClick: handleCopyURL,
    },
    {
      id: 'open-new-tab',
      icon: <ExternalLink className="w-4 h-4" />,
      label: 'Open in New Tab',
      onClick: handleOpenInNewTab,
    },
    { type: 'divider' },
    { type: 'header', label: 'Tools' },
    {
      id: 'print',
      icon: <Printer className="w-4 h-4" />,
      label: 'Print Conversation',
      shortcut: '⌘P',
      onClick: handlePrint,
    },
    {
      id: 'search',
      icon: <Search className="w-4 h-4" />,
      label: 'Search in Chat',
      shortcut: '⌘F',
      onClick: handleSearchConversation,
    },
    {
      id: 'fullscreen',
      icon: <Maximize2 className="w-4 h-4" />,
      label: 'Fullscreen',
      onClick: handleFullscreen,
    },
    { type: 'divider' },
    { type: 'header', label: 'Preferences' },
    {
      id: 'favorite',
      icon: isFavorite ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />,
      label: isFavorite ? 'Remove from Favorites' : 'Add to Favorites',
      onClick: handleToggleFavorite,
    },
    {
      id: 'theme',
      icon: isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />,
      label: isDark ? 'Light Mode' : 'Dark Mode',
      shortcut: '⌘⇧L',
      onClick: handleToggleThemeInternal,
    },
  ], [
    copied,
    isFavorite,
    isDark,
    handleDownloadLatestEmail,
    handleDownloadMarkdown,
    handleDownloadJSON,
    handleCopyURL,
    handleOpenInNewTab,
    handlePrint,
    handleSearchConversation,
    handleFullscreen,
    handleToggleFavorite,
    handleToggleThemeInternal,
  ]);

  // Action items for keyboard navigation
  const actionItems = useMemo(() => 
    menuItems
      .filter((item): item is ActionMenuItem => 'id' in item)
      .map(item => item.id),
    [menuItems]
  );

  // Create action lookup map for keyboard navigation
  const actionMap = useMemo(() => {
    const map = new Map<string, () => void>();
    menuItems.forEach(item => {
      if ('id' in item && 'onClick' in item) {
        map.set(item.id, item.onClick);
      }
    });
    return map;
  }, [menuItems]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % actionItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (prev - 1 + actionItems.length) % actionItems.length);
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        const actionId = actionItems[activeIndex];
        const handler = actionMap.get(actionId);
        if (handler) {
          handler();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, actionItems, actionMap]);

  const menuContent = (
    <div
      ref={menuRef}
      className={`
        fixed z-[9999] w-[280px] overflow-hidden
        bg-white dark:bg-zinc-900 
        rounded-2xl
        shadow-[0_25px_60px_-12px_rgba(0,0,0,0.25)]
        dark:shadow-[0_25px_60px_-12px_rgba(0,0,0,0.5)]
        border border-gray-200/80 dark:border-zinc-700/50
        backdrop-blur-xl
        transition-opacity duration-150 ease-out
        ${mounted ? 'opacity-100' : 'opacity-0'}
      `}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {/* Header with conversation info */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-zinc-800">
        <p className="text-xs font-medium text-gray-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
          Conversation
        </p>
        <p className="text-sm font-semibold text-gray-800 dark:text-zinc-200 truncate">
          {conversationTitle || 'Untitled'}
        </p>
      </div>

      {/* Menu items */}
      <div className="py-2 max-h-[360px] overflow-y-auto scrollbar-thin">
        {menuItems.map((item, index) => {
          if ('type' in item && item.type === 'divider') {
            return (
              <div 
                key={`divider-${index}`} 
                className="my-2 mx-3 border-t border-gray-100 dark:border-zinc-800" 
              />
            );
          }

          if ('type' in item && item.type === 'header') {
            return (
              <div 
                key={`header-${index}`}
                className="px-4 pt-2 pb-1"
              >
                <p className="text-[10px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">
                  {item.label}
                </p>
              </div>
            );
          }

          const actionItem = item as ActionMenuItem;
          const itemIndex = actionItems.indexOf(actionItem.id);
          const isActive = itemIndex === activeIndex;

          return (
            <button
              key={actionItem.id}
              onClick={actionItem.onClick}
              disabled={actionItem.disabled}
              onMouseEnter={() => setActiveIndex(itemIndex)}
              className={`
                w-full flex items-center justify-between gap-3 
                px-4 py-2.5 text-sm
                transition-all duration-75
                ${isActive 
                  ? 'bg-gray-100 dark:bg-zinc-800' 
                  : 'hover:bg-gray-50 dark:hover:bg-zinc-800/50'
                }
                ${actionItem.variant === 'danger' 
                  ? 'text-red-600 dark:text-red-400' 
                  : 'text-gray-700 dark:text-zinc-300'
                }
                ${actionItem.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                group
              `}
            >
              <div className="flex items-center gap-3">
                <span className={`
                  transition-transform duration-150 
                  ${isActive ? 'scale-110' : 'scale-100'}
                  ${actionItem.variant === 'danger' 
                    ? 'text-red-500 dark:text-red-400' 
                    : 'text-gray-500 dark:text-zinc-400 group-hover:text-gray-700 dark:group-hover:text-zinc-200'
                  }
                `}>
                  {actionItem.icon}
                </span>
                <span className="font-medium">{actionItem.label}</span>
              </div>
              {actionItem.shortcut && (
                <span className="text-[11px] text-gray-400 dark:text-zinc-500 font-mono">
                  {actionItem.shortcut}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer with keyboard hint */}
      <div className="px-4 py-2.5 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/30">
        <div className="flex items-center gap-2 text-[11px] text-gray-400 dark:text-zinc-500">
          <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-zinc-700 rounded text-[10px] font-mono">
            ↑↓
          </kbd>
          <span>navigate</span>
          <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-zinc-700 rounded text-[10px] font-mono ml-2">
            ↵
          </kbd>
          <span>select</span>
          <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-zinc-700 rounded text-[10px] font-mono ml-2">
            esc
          </kbd>
          <span>close</span>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(menuContent, document.body);
  }

  return null;
}
