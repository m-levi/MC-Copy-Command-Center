'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Brand, Conversation, ConversationWithStatus } from '@/types';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface CommandItem {
  id: string;
  type: 'action' | 'conversation' | 'brand' | 'recent' | 'navigation';
  label: string;
  description?: string;
  icon: string;
  shortcut?: string;
  badge?: string;
  score: number;
  onExecute: () => void;
  meta?: {
    createdAt?: string;
    updatedAt?: string;
    creatorName?: string;
    brandId?: string;
    brandName?: string;
  };
  highlightIndices?: number[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: ConversationWithStatus[];
  brands: Brand[];
  currentBrandId: string;
  onSelectConversation: (conversationId: string, brandId?: string) => void;
  onSelectBrand: (brandId: string) => void;
  onNewConversation: () => void;
  onNewFlow: () => void;
}

type SearchFilter = 'all' | 'conversations' | 'brands' | 'actions';

export default function CommandPalette({
  isOpen,
  onClose,
  conversations,
  brands,
  currentBrandId,
  onSelectConversation,
  onSelectBrand,
  onNewConversation,
  onNewFlow,
}: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState<SearchFilter>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load recent searches
  useEffect(() => {
    const recent = localStorage.getItem('command-palette-recent');
    if (recent) {
      try {
        setRecentSearches(JSON.parse(recent));
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  // Save to recent searches
  const saveRecentSearch = (search: string) => {
    if (!search.trim()) return;
    
    const updated = [search, ...recentSearches.filter(s => s !== search)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('command-palette-recent', JSON.stringify(updated));
  };

  // Advanced fuzzy search with better scoring and highlighting
  const fuzzyMatch = (text: string, query: string): { matches: boolean; score: number; highlightIndices: number[] } => {
    if (!query) return { matches: true, score: 0, highlightIndices: [] };
    
    const normalizedText = text.toLowerCase();
    const normalizedQuery = query.toLowerCase();
    
    // Exact match gets highest score
    if (normalizedText.includes(normalizedQuery)) {
      const startIndex = normalizedText.indexOf(normalizedQuery);
      const highlightIndices = Array.from({ length: normalizedQuery.length }, (_, i) => startIndex + i);
      
      // Bonus for exact match at start
      const exactScore = startIndex === 0 ? 200 : 150;
      return { matches: true, score: exactScore, highlightIndices };
    }
    
    // Fuzzy match - check if all characters in query appear in order
    let queryIndex = 0;
    let score = 0;
    const highlightIndices: number[] = [];
    let consecutiveMatches = 0;
    
    for (let i = 0; i < normalizedText.length && queryIndex < normalizedQuery.length; i++) {
      if (normalizedText[i] === normalizedQuery[queryIndex]) {
        highlightIndices.push(i);
        queryIndex++;
        score += 10;
        
        // Bonus for consecutive matches
        if (i > 0 && normalizedText[i - 1] === normalizedQuery[queryIndex - 2]) {
          consecutiveMatches++;
          score += 8;
        } else {
          consecutiveMatches = 0;
        }
        
        // Bonus for start of word matches
        if (i === 0 || normalizedText[i - 1] === ' ' || normalizedText[i - 1] === '-' || normalizedText[i - 1] === '_') {
          score += 20;
        }
        
        // Bonus for uppercase matches (camelCase)
        if (text[i] === text[i].toUpperCase() && text[i] !== text[i].toLowerCase()) {
          score += 15;
        }
      }
    }
    
    return {
      matches: queryIndex === normalizedQuery.length,
      score: score + (consecutiveMatches * 3),
      highlightIndices,
    };
  };

  // Highlight matching characters in text
  const highlightText = (text: string, highlightIndices: number[]) => {
    if (!highlightIndices || highlightIndices.length === 0) {
      return <span>{text}</span>;
    }

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    highlightIndices.forEach((index, i) => {
      // Add non-highlighted text before this match
      if (index > lastIndex) {
        parts.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex, index)}</span>);
      }
      // Add highlighted character
      parts.push(
        <span key={`highlight-${index}`} className="bg-yellow-200 dark:bg-yellow-700 text-gray-900 dark:text-gray-100 font-semibold">
          {text[index]}
        </span>
      );
      lastIndex = index + 1;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex)}</span>);
    }

    return <>{parts}</>;
  };

  // Detect command mode (starts with ">")
  const isCommandMode = query.startsWith('>');
  const searchQuery = isCommandMode ? query.slice(1).trim() : query;

  // Detect filter mode (starts with "#")
  const isFilterMode = query.startsWith('#');
  const filterQuery = isFilterMode ? query.slice(1).trim() : searchQuery;

  // Generate command items
  const filteredItems = useMemo(() => {
    const items: CommandItem[] = [];
    const currentBrand = brands.find(b => b.id === currentBrandId);

    // In command mode, only show actions
    if (isCommandMode) {
      const commands = [
        {
          id: 'new-conversation',
          label: 'New Email Conversation',
          description: 'Start a new email copy conversation',
          shortcut: '⌘N',
          icon: '✉️',
          action: onNewConversation,
        },
        {
          id: 'new-flow',
          label: 'New Email Flow',
          description: 'Create a multi-email automation sequence',
          shortcut: '⌘⇧N',
          icon: '🔄',
          action: onNewFlow,
        },
        {
          id: 'toggle-sidebar',
          label: 'Toggle Sidebar',
          description: 'Show or hide the conversation sidebar',
          shortcut: '⌘B',
          icon: '👁️',
          action: () => {
            window.dispatchEvent(new CustomEvent('toggleSidebar'));
            onClose();
          },
        },
        {
          id: 'go-home',
          label: 'Go to Home',
          description: 'View all brands',
          icon: '🏠',
          action: () => {
            router.push('/');
            onClose();
          },
        },
        {
          id: 'settings',
          label: 'Settings',
          description: 'Account and preferences',
          icon: '⚙️',
          action: () => {
            router.push('/settings');
            onClose();
          },
        },
        {
          id: 'starred-emails',
          label: 'View Starred Emails',
          description: currentBrand ? `Favorite emails for ${currentBrand.name}` : 'View your starred emails',
          icon: '⭐',
          action: () => {
            if (currentBrandId) {
              window.dispatchEvent(new CustomEvent('showStarredEmails'));
              onClose();
            }
          },
        },
        {
          id: 'keyboard-shortcuts',
          label: 'Keyboard Shortcuts',
          description: 'View all available shortcuts',
          shortcut: '⌘/',
          icon: '⌨️',
          action: () => {
            onClose();
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('showKeyboardShortcuts'));
            }, 100);
          },
        },
        {
          id: 'refresh-data',
          label: 'Refresh Data',
          description: 'Reload conversations and brands',
          icon: '🔄',
          action: () => {
            localStorage.removeItem('command-palette-data-loaded');
            window.location.reload();
          },
        },
      ];

      commands.forEach((cmd, index) => {
        const match = fuzzyMatch(cmd.label + ' ' + (cmd.description || ''), searchQuery);
        if (match.matches || !searchQuery) {
          items.push({
            id: cmd.id,
            type: 'action',
            label: cmd.label,
            description: cmd.description,
            shortcut: cmd.shortcut,
            icon: cmd.icon,
            score: 1000 - index,
            onExecute: cmd.action,
            highlightIndices: match.highlightIndices,
          });
        }
      });

      return items;
    }

    // Regular search mode
    // Quick Actions (always show if no query and no filter)
    if ((!query || fuzzyMatch('new email conversation', query).matches) && (searchFilter === 'all' || searchFilter === 'actions')) {
      items.push({
        id: 'new-conversation',
        type: 'action',
        label: 'New Email Conversation',
        description: 'Start a new email copy conversation',
        shortcut: '⌘N',
        icon: '✉️',
        score: 1000,
        onExecute: () => {
          onNewConversation();
          onClose();
        },
      });
    }

    if ((!query || fuzzyMatch('new email flow', query).matches) && (searchFilter === 'all' || searchFilter === 'actions')) {
      items.push({
        id: 'new-flow',
        type: 'action',
        label: 'New Email Flow',
        description: 'Create a multi-email automation sequence',
        shortcut: '⌘⇧N',
        icon: '🔄',
        score: 999,
        onExecute: () => {
          onNewFlow();
          onClose();
        },
      });
    }

    // Navigation actions (show when searching)
    if (searchFilter === 'all' || searchFilter === 'actions') {
      if (query && fuzzyMatch('go home', query).matches) {
        items.push({
          id: 'go-home',
          type: 'navigation',
          label: 'Go to Home',
          description: 'View all brands',
          icon: '🏠',
          score: 950,
          onExecute: () => {
            router.push('/');
            onClose();
          },
        });
      }

      if (query && fuzzyMatch('settings', query).matches) {
        items.push({
          id: 'settings',
          type: 'navigation',
          label: 'Settings',
          description: 'Account and preferences',
          icon: '⚙️',
          score: 940,
          onExecute: () => {
            router.push('/settings');
            onClose();
          },
        });
      }

      if (query && fuzzyMatch('starred emails', query).matches) {
        items.push({
          id: 'starred-emails',
          type: 'action',
          label: 'View Starred Emails',
          description: currentBrand ? `Favorite emails for ${currentBrand.name}` : 'View your starred emails',
          icon: '⭐',
          score: 930,
          onExecute: () => {
            if (currentBrandId) {
              window.dispatchEvent(new CustomEvent('showStarredEmails'));
              onClose();
            }
          },
        });
      }
    }

    // Brands
    if (searchFilter === 'all' || searchFilter === 'brands') {
      brands.forEach(brand => {
        const match = fuzzyMatch(brand.name, filterQuery);
        if (match.matches) {
          const isCurrent = brand.id === currentBrandId;
          items.push({
            id: `brand-${brand.id}`,
            type: 'brand',
            label: brand.name,
            description: isCurrent ? 'Current brand' : 'Switch to this brand',
            icon: '🏢',
            badge: isCurrent ? 'Current' : undefined,
            score: match.score + (isCurrent ? 50 : 0) + 800,
            onExecute: () => {
              if (brand.id !== currentBrandId) {
                router.push(`/brands/${brand.id}/chat`);
                toast.success(`Switched to ${brand.name}`);
                saveRecentSearch(brand.name);
              }
              onClose();
            },
            highlightIndices: match.highlightIndices,
          });
        }
      });
    }

    // Conversations (from all brands!)
    if (searchFilter === 'all' || searchFilter === 'conversations') {
      conversations.forEach(conversation => {
        const conversationBrand = brands.find(b => b.id === conversation.brand_id);
        
        // Search in title, preview, and brand name
        const titleMatch = fuzzyMatch(conversation.title || 'Untitled', filterQuery);
        const previewMatch = fuzzyMatch(conversation.last_message_preview || '', filterQuery);
        const brandMatch = conversationBrand ? fuzzyMatch(conversationBrand.name, filterQuery) : { matches: false, score: 0, highlightIndices: [] };
        
        // Match if any field matches
        const bestMatch = [titleMatch, previewMatch, brandMatch]
          .filter(m => m.matches)
          .sort((a, b) => b.score - a.score)[0];
        
        if (bestMatch?.matches) {
          const isFlow = conversation.is_flow;
          const isChild = !!conversation.parent_conversation_id;
          const isPinned = conversation.is_pinned;
          const isDifferentBrand = conversation.brand_id !== currentBrandId;
          
          // Build description with brand name if different brand
          let description = conversation.last_message_preview?.substring(0, 100) || 'No messages yet';
          if (isDifferentBrand && conversationBrand) {
            description = `${conversationBrand.name} • ${description}`;
          }
          
          // Add creator info if available
          if (conversation.created_by_name) {
            description = `${description.substring(0, 80)} • by ${conversation.created_by_name}`;
          }
          
          items.push({
            id: `conversation-${conversation.id}`,
            type: 'conversation',
            label: conversation.title || 'Untitled Conversation',
            description,
            icon: isFlow ? '🔄' : (isChild ? '📧' : isPinned ? '📌' : '💬'),
            badge: isPinned ? 'Pinned' : (isDifferentBrand && conversationBrand ? conversationBrand.name : undefined),
            score: bestMatch.score + (isPinned ? 150 : 0) + (isDifferentBrand ? -30 : 50), // Prefer current brand
            onExecute: () => {
              // Pass the brand ID to the handler so it can navigate properly
              onSelectConversation(conversation.id, conversation.brand_id);
              saveRecentSearch(conversation.title || 'Untitled');
              
              // Show toast if switching brands
              if (isDifferentBrand && conversationBrand) {
                toast.success(`Opening in ${conversationBrand.name}`);
              }
              
              onClose();
            },
            meta: {
              createdAt: conversation.created_at,
              updatedAt: conversation.updated_at,
              creatorName: conversation.created_by_name,
              brandId: conversation.brand_id,
              brandName: conversationBrand?.name,
            },
            highlightIndices: titleMatch.matches ? titleMatch.highlightIndices : [],
          });
        }
      });
    }

    // Sort by score descending, then by recency
    return items
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        // If scores are equal, sort by most recent
        const aTime = a.meta?.updatedAt || a.meta?.createdAt || '';
        const bTime = b.meta?.updatedAt || b.meta?.createdAt || '';
        return bTime.localeCompare(aTime);
      })
      .slice(0, 25); // Show top 25 results
  }, [query, searchQuery, filterQuery, isCommandMode, isFilterMode, searchFilter, brands, conversations, currentBrandId, onSelectBrand, onSelectConversation, onNewConversation, onNewFlow, onClose, router]);

  // Reset selected index when filtered items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      setQuery('');
      setSelectedIndex(0);
      setSearchFilter('all');
    }
  }, [isOpen]);

  // Keyboard navigation - use input's onKeyDown for better reliability
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].onExecute();
        }
        break;
      case 'Escape':
        e.preventDefault();
        if (query) {
          // Clear query first
          setQuery('');
        } else {
          // Close palette
          onClose();
        }
        break;
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else {
          setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
        }
        break;
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && filteredItems.length > 0) {
      const selectedElement = listRef.current.children[0]?.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, filteredItems]);

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  const currentFilter = isCommandMode ? 'commands' : isFilterMode ? 'filtered' : searchFilter;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-[9998]"
        onClick={onClose}
      />

      {/* Command Palette Modal */}
      <div className="fixed inset-0 flex items-start justify-center pt-[12vh] z-[9999] pointer-events-none">
        <div className="w-full max-w-3xl mx-4 pointer-events-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
            {/* Search Input */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center px-4 py-3">
                {isCommandMode ? (
                  <svg className="w-5 h-5 text-blue-500 dark:text-blue-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isCommandMode 
                      ? "Type a command or action..." 
                      : "Search anything... (> for commands)"
                  }
                  className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-base"
                  autoComplete="off"
                  spellCheck="false"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="mr-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Clear search"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                <kbd className="hidden sm:inline-block px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded">
                  ESC
                </kbd>
              </div>

              {/* Quick filters */}
              {!isCommandMode && (
                <div className="px-4 pb-2 flex gap-2">
                  {(['all', 'conversations', 'brands', 'actions'] as SearchFilter[]).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setSearchFilter(filter)}
                      className={`px-2 py-1 text-xs rounded-full transition-all ${
                        searchFilter === filter
                          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {filter === 'all' ? '🌐 All' : filter === 'conversations' ? '💬 Conversations' : filter === 'brands' ? '🏢 Brands' : '⚡ Actions'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Results List */}
            <div
              ref={listRef}
              className="max-h-[65vh] overflow-y-auto"
            >
              {filteredItems.length === 0 ? (
                <div className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-base font-medium mb-1">No results found</p>
                  <p className="text-sm">
                    {isCommandMode 
                      ? "Try a different command or leave blank to see all" 
                      : "Try a different search term or change your filter"}
                  </p>
                  {searchFilter !== 'all' && (
                    <button
                      onClick={() => setSearchFilter('all')}
                      className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Search in all categories
                    </button>
                  )}
                </div>
              ) : (
                <div className="py-1">
                  {filteredItems.map((item, index) => (
                    <button
                      key={item.id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        item.onExecute();
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all duration-100 cursor-pointer group ${
                        index === selectedIndex
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-l-2 border-transparent'
                      }`}
                    >
                      {/* Icon */}
                      <div className={`flex-shrink-0 w-10 h-10 flex items-center justify-center text-2xl rounded-lg transition-all ${
                        index === selectedIndex
                          ? 'bg-blue-100 dark:bg-blue-900/50'
                          : 'bg-gray-50 dark:bg-gray-700/50 group-hover:bg-gray-100 dark:group-hover:bg-gray-700'
                      }`}>
                        {item.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {item.highlightIndices && item.highlightIndices.length > 0 
                              ? highlightText(item.label, item.highlightIndices)
                              : item.label
                            }
                          </span>
                          {item.badge && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                              item.badge === 'Current' 
                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                                : item.badge === 'Pinned'
                                ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                                : 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'
                            }`}>
                              {item.badge}
                            </span>
                          )}
                          {/* Type badge - subtle */}
                          <span className="text-xs text-gray-400 dark:text-gray-500 capitalize flex-shrink-0">
                            {item.type}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {item.description}
                          </p>
                        )}
                        {/* Show timestamp for conversations */}
                        {item.type === 'conversation' && item.meta?.updatedAt && (
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              {formatRelativeTime(item.meta.updatedAt)}
                            </p>
                            {item.meta.creatorName && (
                              <>
                                <span className="text-xs text-gray-300 dark:text-gray-600">•</span>
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                  {item.meta.creatorName}
                                </p>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Shortcut or arrow */}
                      <div className="flex-shrink-0">
                        {item.shortcut ? (
                          <kbd className="hidden sm:inline-block px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded">
                            {item.shortcut}
                          </kbd>
                        ) : (
                          index === selectedIndex && (
                            <svg className="w-4 h-4 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          )
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer with enhanced hints */}
            <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 font-mono">↑</kbd>
                    <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 font-mono">↓</kbd>
                    Navigate
                  </span>
                  <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 font-mono">↵</kbd>
                    Open
                  </span>
                  <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 font-mono">ESC</kbd>
                    {query ? 'Clear' : 'Close'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isCommandMode ? (
                    <span className="text-blue-500 dark:text-blue-400 font-medium">
                      🎯 Command Mode
                    </span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">
                      {filteredItems.length} {filteredItems.length === 1 ? 'result' : 'results'}
                      {conversations.length > 0 && searchFilter === 'all' && (
                        <span className="ml-1 hidden sm:inline">across {brands.length} brands</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tips and recent searches */}
          {!query && (
            <div className="mt-3 px-4 space-y-2 animate-in fade-in duration-300">
              {/* Recent searches */}
              {recentSearches.length > 0 && (
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  <span className="font-medium">🕐 Recent:</span>
                  {recentSearches.slice(0, 3).map((search, i) => (
                    <button
                      key={i}
                      onClick={() => setQuery(search)}
                      className="ml-2 hover:text-blue-500 dark:hover:text-blue-400 hover:underline cursor-pointer transition-colors"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              )}
              
              {/* Pro tips */}
              <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3 text-xs text-gray-500 dark:text-gray-400 space-y-1.5 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
                <p className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  💡 Pro Tips
                </p>
                <p>• Type <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] font-mono">&gt;</kbd> for command mode - browse all available actions</p>
                <p>• Search works across <span className="font-medium text-gray-600 dark:text-gray-300">all {brands.length} brands</span> - find any conversation instantly</p>
                <p>• Use <span className="font-medium">filters</span> to narrow results by type</p>
                <p>• Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] font-mono">Tab</kbd> or hover to navigate</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
