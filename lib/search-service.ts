import { createClient } from '@/lib/supabase/server';

export interface SearchFilters {
  brandId?: string;
  conversationId?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  emailType?: string;
  modelId?: string;
}

export interface SearchResult {
  type: 'brand' | 'conversation' | 'message';
  id: string;
  title: string;
  content?: string;
  created_at: string;
  updated_at?: string;
  brand_id?: string;
  conversation_id?: string;
  role?: string;
}

export interface SearchResponse {
  query: string;
  type: string;
  page: number;
  limit: number;
  total: number;
  results: SearchResult[];
}

/**
 * Perform a search across brands, conversations, and messages
 */
export async function performSearch(
  query: string,
  type: 'all' | 'brands' | 'conversations' | 'messages' = 'all',
  filters: SearchFilters = {},
  page: number = 1,
  limit: number = 20
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    q: query,
    type,
    page: page.toString(),
    limit: limit.toString(),
  });

  if (filters.brandId) params.append('brandId', filters.brandId);
  if (filters.conversationId) params.append('conversationId', filters.conversationId);
  if (filters.userId) params.append('userId', filters.userId);
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.append('dateTo', filters.dateTo);
  if (filters.status) params.append('status', filters.status);

  const response = await fetch(`/api/search?${params.toString()}`);

  if (!response.ok) {
    throw new Error('Search failed');
  }

  return response.json();
}

/**
 * Highlight search terms in text
 */
export function highlightSearchTerms(text: string, query: string): string {
  if (!query.trim()) return text;

  const terms = query
    .split(/\s+/)
    .filter((term) => term.length > 2)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  if (terms.length === 0) return text;

  const regex = new RegExp(`(${terms.join('|')})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

/**
 * Get search suggestions based on recent searches
 */
export function getSearchSuggestions(query: string): string[] {
  // Load from localStorage
  const recentSearches = JSON.parse(
    localStorage.getItem('recent_searches') || '[]'
  ) as string[];

  // Filter and return matching suggestions
  return recentSearches
    .filter((search) => search.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5);
}

/**
 * Save search to recent searches
 */
export function saveSearch(query: string): void {
  const recentSearches = JSON.parse(
    localStorage.getItem('recent_searches') || '[]'
  ) as string[];

  // Remove if already exists
  const filtered = recentSearches.filter((s) => s !== query);
  
  // Add to front
  filtered.unshift(query);
  
  // Keep only last 10
  const limited = filtered.slice(0, 10);
  
  localStorage.setItem('recent_searches', JSON.stringify(limited));
}






