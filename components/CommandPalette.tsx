'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Brand, ConversationWithStatus } from '@/types';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { performSearch, SearchResult } from '@/lib/search-service';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import {
  Search,
  Command,
  Mail,
  MessageSquare,
  Building2,
  Settings,
  Home,
  Star,
  Keyboard,
  RefreshCw,
  Plus,
  ChevronRight,
  Clock,
  User,
  Pin,
  Workflow,
  Sparkles,
  Filter,
  X,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  Loader2,
  Hash,
  Zap,
} from 'lucide-react';

interface CommandItem {
  id: string;
  type: 'action' | 'conversation' | 'brand' | 'recent' | 'navigation';
  label: string;
  description?: string;
  icon: React.ReactNode;
  shortcut?: string;
  badge?: string;
  badgeVariant?: 'default' | 'current' | 'pinned' | 'brand';
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

const FILTER_CONFIG: { value: SearchFilter; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { value: 'conversations', label: 'Chats', icon: <MessageSquare className="w-3.5 h-3.5" /> },
  { value: 'brands', label: 'Brands', icon: <Building2 className="w-3.5 h-3.5" /> },
  { value: 'actions', label: 'Actions', icon: <Zap className="w-3.5 h-3.5" /> },
];

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
  const [apiSearchResults, setApiSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

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
  const saveRecentSearch = useCallback((search: string) => {
    if (!search.trim()) return;
    
    const updated = [search, ...recentSearches.filter(s => s !== search)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('command-palette-recent', JSON.stringify(updated));
  }, [recentSearches]);

  // Perform API search when query is long enough
  useEffect(() => {
    if (query.trim().length >= 3) {
      setIsSearching(true);
      const timeoutId = setTimeout(() => {
        performSearch(query, 'all', {}, 1, 10)
          .then((response) => {
            setApiSearchResults(response.results);
          })
          .catch((error) => {
            logger.error('Search API error:', error);
            setApiSearchResults([]);
          })
          .finally(() => {
            setIsSearching(false);
          });
      }, 150); // Debounce

      return () => clearTimeout(timeoutId);
    } else {
      setApiSearchResults([]);
      setIsSearching(false);
    }
  }, [query]);

  // Advanced fuzzy search with better scoring and highlighting
  const fuzzyMatch = useCallback((text: string, searchQuery: string): { matches: boolean; score: number; highlightIndices: number[] } => {
    if (!searchQuery) return { matches: true, score: 0, highlightIndices: [] };
    
    const normalizedText = text.toLowerCase();
    const normalizedQuery = searchQuery.toLowerCase();
    
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
  }, []);

  // Highlight matching characters in text
  const highlightText = useCallback((text: string, highlightIndices: number[]) => {
    if (!highlightIndices || highlightIndices.length === 0) {
      return <span>{text}</span>;
    }

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    highlightIndices.forEach((index) => {
      // Add non-highlighted text before this match
      if (index > lastIndex) {
        parts.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex, index)}</span>);
      }
      // Add highlighted character
      parts.push(
        <span 
          key={`highlight-${index}`} 
          className="bg-amber-200/70 dark:bg-amber-500/30 text-amber-900 dark:text-amber-200 rounded-sm px-0.5 font-medium"
        >
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
  }, []);

  // Detect command mode (starts with ">")
  const isCommandMode = query.startsWith('>');
  const searchQuery = isCommandMode ? query.slice(1).trim() : query;

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
          icon: <Plus className="w-4 h-4" />,
          action: onNewConversation,
        },
        {
          id: 'new-flow',
          label: 'New Email Flow',
          description: 'Create a multi-email automation sequence',
          shortcut: '⌘⇧N',
          icon: <Workflow className="w-4 h-4" />,
          action: onNewFlow,
        },
        {
          id: 'toggle-sidebar',
          label: 'Toggle Sidebar',
          description: 'Show or hide the conversation sidebar',
          shortcut: '⌘B',
          icon: <Command className="w-4 h-4" />,
          action: () => {
            window.dispatchEvent(new CustomEvent('toggleSidebar'));
            onClose();
          },
        },
        {
          id: 'go-home',
          label: 'Go to Home',
          description: 'View all brands',
          icon: <Home className="w-4 h-4" />,
          action: () => {
            router.push('/');
            onClose();
          },
        },
        {
          id: 'settings',
          label: 'Settings',
          description: 'Account and preferences',
          icon: <Settings className="w-4 h-4" />,
          action: () => {
            router.push('/settings');
            onClose();
          },
        },
        {
          id: 'starred-emails',
          label: 'View Starred Emails',
          description: currentBrand ? `Favorite emails for ${currentBrand.name}` : 'View your starred emails',
          icon: <Star className="w-4 h-4" />,
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
          icon: <Keyboard className="w-4 h-4" />,
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
          icon: <RefreshCw className="w-4 h-4" />,
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
        icon: <Plus className="w-4 h-4" />,
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
        icon: <Workflow className="w-4 h-4" />,
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
          icon: <Home className="w-4 h-4" />,
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
          icon: <Settings className="w-4 h-4" />,
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
          icon: <Star className="w-4 h-4" />,
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
        const match = fuzzyMatch(brand.name, query);
        if (match.matches) {
          const isCurrent = brand.id === currentBrandId;
          items.push({
            id: `brand-${brand.id}`,
            type: 'brand',
            label: brand.name,
            description: isCurrent ? 'Current workspace' : 'Switch to this brand',
            icon: <Building2 className="w-4 h-4" />,
            badge: isCurrent ? 'Current' : undefined,
            badgeVariant: 'current',
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
        const titleMatch = fuzzyMatch(conversation.title || 'Untitled', query);
        const previewMatch = fuzzyMatch(conversation.last_message_preview || '', query);
        const brandMatch = conversationBrand ? fuzzyMatch(conversationBrand.name, query) : { matches: false, score: 0, highlightIndices: [] };
        
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
          let description = conversation.last_message_preview?.substring(0, 80) || 'No messages yet';
          if (isDifferentBrand && conversationBrand) {
            description = `${conversationBrand.name} • ${description}`;
          }
          
          items.push({
            id: `conversation-${conversation.id}`,
            type: 'conversation',
            label: conversation.title || 'Untitled Conversation',
            description,
            icon: isFlow ? <Workflow className="w-4 h-4" /> : (isChild ? <Mail className="w-4 h-4" /> : isPinned ? <Pin className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />),
            badge: isPinned ? 'Pinned' : (isDifferentBrand && conversationBrand ? conversationBrand.name : undefined),
            badgeVariant: isPinned ? 'pinned' : 'brand',
            score: bestMatch.score + (isPinned ? 150 : 0) + (isDifferentBrand ? -30 : 50),
            onExecute: () => {
              onSelectConversation(conversation.id, conversation.brand_id);
              saveRecentSearch(conversation.title || 'Untitled');
              
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

    // Add API search results if available
    if (apiSearchResults.length > 0 && query.trim().length >= 3) {
      apiSearchResults.forEach((result) => {
        const existingIndex = items.findIndex((item) => item.id === result.id);
        if (existingIndex === -1) {
          items.push({
            id: result.id,
            type: result.type === 'brand' ? 'brand' : result.type === 'conversation' ? 'conversation' : 'action',
            label: result.title,
            description: result.content?.substring(0, 100),
            icon: result.type === 'brand' ? <Building2 className="w-4 h-4" /> : result.type === 'conversation' ? <MessageSquare className="w-4 h-4" /> : <Mail className="w-4 h-4" />,
            score: 200,
            onExecute: () => {
              if (result.type === 'brand' && result.id) {
                onSelectBrand(result.id);
              } else if (result.type === 'conversation' && result.id) {
                onSelectConversation(result.id, result.brand_id);
              }
              onClose();
            },
            meta: {
              createdAt: result.created_at,
              updatedAt: result.updated_at,
              brandId: result.brand_id,
            },
          });
        }
      });
    }

    // Sort by score descending, then by recency
    return items
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const aTime = a.meta?.updatedAt || a.meta?.createdAt || '';
        const bTime = b.meta?.updatedAt || b.meta?.createdAt || '';
        return bTime.localeCompare(aTime);
      })
      .slice(0, 25);
  }, [query, searchQuery, isCommandMode, searchFilter, brands, conversations, currentBrandId, apiSearchResults, onSelectBrand, onSelectConversation, onNewConversation, onNewFlow, onClose, router, fuzzyMatch, saveRecentSearch]);

  // Group items by type for better visual organization
  const groupedItems = useMemo(() => {
    const groups: { [key: string]: CommandItem[] } = {
      actions: [],
      conversations: [],
      brands: [],
    };

    filteredItems.forEach(item => {
      if (item.type === 'action' || item.type === 'navigation') {
        groups.actions.push(item);
      } else if (item.type === 'conversation') {
        groups.conversations.push(item);
      } else if (item.type === 'brand') {
        groups.brands.push(item);
      }
    });

    return groups;
  }, [filteredItems]);

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

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
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
          setQuery('');
        } else {
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
  }, [filteredItems, selectedIndex, query, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = itemRefs.current.get(selectedIndex);
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  // Format relative time
  const formatRelativeTime = useCallback((dateString: string) => {
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
  }, []);

  // Get flat index for an item
  const getFlatIndex = useCallback((groupKey: string, itemIndex: number): number => {
    let index = 0;
    const groupOrder = ['actions', 'conversations', 'brands'];
    
    for (const key of groupOrder) {
      if (key === groupKey) {
        return index + itemIndex;
      }
      index += groupedItems[key]?.length || 0;
    }
    return index;
  }, [groupedItems]);

  if (!isOpen) return null;

  const renderGroup = (items: CommandItem[], title: string, icon: React.ReactNode, groupKey: string) => {
    if (items.length === 0) return null;

    return (
      <div className="py-2">
        <div className="px-3 pb-2 flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</span>
          <span className="text-xs text-muted-foreground/60">{items.length}</span>
        </div>
        <div className="space-y-0.5">
          {items.map((item, itemIndex) => {
            const flatIndex = getFlatIndex(groupKey, itemIndex);
            const isSelected = flatIndex === selectedIndex;

            return (
              <button
                key={item.id}
                ref={(el) => {
                  if (el) itemRefs.current.set(flatIndex, el);
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  item.onExecute();
                }}
                onMouseEnter={() => setSelectedIndex(flatIndex)}
                className={cn(
                  "w-full text-left px-3 py-2.5 flex items-center gap-3 transition-all duration-75 cursor-pointer group rounded-lg mx-1",
                  "outline-none focus:outline-none",
                  isSelected
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                )}
              >
                {/* Icon */}
                <div className={cn(
                  "flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg transition-colors",
                  isSelected
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground group-hover:bg-muted/80"
                )}>
                  {item.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-medium truncate",
                      isSelected ? "text-foreground" : "text-foreground/90"
                    )}>
                      {item.highlightIndices && item.highlightIndices.length > 0 
                        ? highlightText(item.label, item.highlightIndices)
                        : item.label
                      }
                    </span>
                    {item.badge && (
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 uppercase tracking-wide",
                        item.badgeVariant === 'current' && "bg-primary/15 text-primary",
                        item.badgeVariant === 'pinned' && "bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400",
                        item.badgeVariant === 'brand' && "bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400",
                        !item.badgeVariant && "bg-muted text-muted-foreground"
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      {item.description}
                    </p>
                  )}
                  {/* Timestamp for conversations */}
                  {item.type === 'conversation' && item.meta?.updatedAt && (
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3 h-3 text-muted-foreground/60" />
                      <span className="text-xs text-muted-foreground/60">
                        {formatRelativeTime(item.meta.updatedAt)}
                      </span>
                      {item.meta.creatorName && (
                        <>
                          <span className="text-muted-foreground/40">•</span>
                          <User className="w-3 h-3 text-muted-foreground/60" />
                          <span className="text-xs text-muted-foreground/60">
                            {item.meta.creatorName}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Shortcut or arrow */}
                <div className="flex-shrink-0 flex items-center gap-2">
                  {item.shortcut && (
                    <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground bg-muted rounded border border-border/50">
                      {item.shortcut}
                    </kbd>
                  )}
                  {isSelected && (
                    <ChevronRight className="w-4 h-4 text-primary" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-sm z-[9998] animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Command Palette Modal */}
      <div className="fixed inset-0 flex items-start justify-center pt-[10vh] z-[9999] pointer-events-none px-4">
        <div className="w-full max-w-2xl pointer-events-auto animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="bg-popover rounded-xl shadow-2xl border border-border/50 overflow-hidden">
            {/* Search Header */}
            <div className="border-b border-border/50">
              <div className="flex items-center px-4 h-14">
                {isCommandMode ? (
                  <Command className="w-5 h-5 text-primary mr-3 flex-shrink-0" />
                ) : isSearching ? (
                  <Loader2 className="w-5 h-5 text-muted-foreground mr-3 flex-shrink-0 animate-spin" />
                ) : (
                  <Search className="w-5 h-5 text-muted-foreground mr-3 flex-shrink-0" />
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isCommandMode 
                      ? "Type a command..." 
                      : "Search conversations, brands, actions..."
                  }
                  className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-base"
                  autoComplete="off"
                  spellCheck="false"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="p-1.5 hover:bg-accent rounded-md transition-colors"
                    title="Clear search"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
                <div className="ml-2 pl-2 border-l border-border/50">
                  <kbd className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono font-medium text-muted-foreground bg-muted rounded border border-border/50">
                    ESC
                  </kbd>
                </div>
              </div>

              {/* Filter Tabs */}
              {!isCommandMode && (
                <div className="px-4 pb-3 flex items-center gap-1.5">
                  {FILTER_CONFIG.map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setSearchFilter(filter.value)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all",
                        searchFilter === filter.value
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {filter.icon}
                      {filter.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Results List */}
            <div
              ref={listRef}
              className="max-h-[60vh] overflow-y-auto overscroll-contain"
            >
              {filteredItems.length === 0 ? (
                <div className="px-4 py-16 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                    <Search className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-base font-medium text-foreground mb-1">No results found</p>
                  <p className="text-sm text-muted-foreground">
                    {isCommandMode 
                      ? "Try a different command or clear the search" 
                      : "Try a different search term or change your filter"}
                  </p>
                  {searchFilter !== 'all' && !isCommandMode && (
                    <button
                      onClick={() => setSearchFilter('all')}
                      className="mt-4 text-sm text-primary hover:underline font-medium"
                    >
                      Search in all categories
                    </button>
                  )}
                </div>
              ) : isCommandMode ? (
                // Command mode - no grouping
                <div className="py-2 space-y-0.5">
                  {filteredItems.map((item, index) => (
                    <button
                      key={item.id}
                      ref={(el) => {
                        if (el) itemRefs.current.set(index, el);
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        item.onExecute();
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={cn(
                        "w-full text-left px-3 py-2.5 flex items-center gap-3 transition-all duration-75 cursor-pointer group rounded-lg mx-1",
                        "outline-none focus:outline-none",
                        index === selectedIndex
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent/50"
                      )}
                    >
                      <div className={cn(
                        "flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg transition-colors",
                        index === selectedIndex
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{item.label}</span>
                        {item.description && (
                          <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                        )}
                      </div>
                      {item.shortcut && (
                        <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground bg-muted rounded border border-border/50">
                          {item.shortcut}
                        </kbd>
                      )}
                      {index === selectedIndex && (
                        <ChevronRight className="w-4 h-4 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                // Regular mode - grouped results
                <div className="divide-y divide-border/30">
                  {renderGroup(groupedItems.actions, 'Quick Actions', <Zap className="w-3.5 h-3.5" />, 'actions')}
                  {renderGroup(groupedItems.conversations, 'Conversations', <MessageSquare className="w-3.5 h-3.5" />, 'conversations')}
                  {renderGroup(groupedItems.brands, 'Brands', <Building2 className="w-3.5 h-3.5" />, 'brands')}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-muted/30 border-t border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <kbd className="inline-flex items-center justify-center w-5 h-5 bg-background rounded border border-border/50 text-[10px] font-mono">
                      <ArrowUp className="w-3 h-3" />
                    </kbd>
                    <kbd className="inline-flex items-center justify-center w-5 h-5 bg-background rounded border border-border/50 text-[10px] font-mono">
                      <ArrowDown className="w-3 h-3" />
                    </kbd>
                    <span className="text-muted-foreground/70">Navigate</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <kbd className="inline-flex items-center justify-center px-1.5 h-5 bg-background rounded border border-border/50 text-[10px] font-mono">
                      <CornerDownLeft className="w-3 h-3" />
                    </kbd>
                    <span className="text-muted-foreground/70">Select</span>
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1.5">
                    <kbd className="inline-flex items-center justify-center px-1.5 h-5 bg-background rounded border border-border/50 text-[10px] font-mono">
                      <Hash className="w-2.5 h-2.5" />
                    </kbd>
                    <span className="text-muted-foreground/70">Type &gt; for commands</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isCommandMode ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-primary font-medium">
                      <Command className="w-3.5 h-3.5" />
                      Command Mode
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {filteredItems.length} {filteredItems.length === 1 ? 'result' : 'results'}
                      {brands.length > 0 && searchFilter === 'all' && (
                        <span className="hidden sm:inline"> across {brands.length} brands</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tips Card - Show when no query */}
          {!query && !isCommandMode && (
            <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-300 delay-100">
              {/* Recent searches */}
              {recentSearches.length > 0 && (
                <div className="bg-popover/80 backdrop-blur-sm rounded-lg border border-border/30 p-3 mb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Recent</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {recentSearches.slice(0, 4).map((search, i) => (
                      <button
                        key={i}
                        onClick={() => setQuery(search)}
                        className="inline-flex items-center px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-md transition-colors"
                      >
                        {search}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Pro tips */}
              <div className="bg-popover/80 backdrop-blur-sm rounded-lg border border-border/30 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-medium text-foreground">Pro Tips</span>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <kbd className="inline-flex items-center justify-center px-1.5 h-4 bg-muted rounded text-[10px] font-mono">&gt;</kbd>
                    <span>Type &gt; for command mode with all available actions</span>
                  </p>
                  <p>Search works across <span className="text-foreground font-medium">all {brands.length} brands</span> — find any conversation instantly</p>
                  <p>Use <span className="text-foreground font-medium">Tab</span> to navigate, <span className="text-foreground font-medium">Enter</span> to select</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
