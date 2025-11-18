'use client';

import { useState } from 'react';
import { performSearch, SearchFilters } from '@/lib/search-service';
import { SearchResult } from '@/lib/search-service';
import { logger } from '@/lib/logger';

interface AdvancedSearchProps {
  onResultClick?: (result: SearchResult) => void;
}

export default function AdvancedSearch({ onResultClick }: AdvancedSearchProps) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'all' | 'brands' | 'conversations' | 'messages'>('all');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await performSearch(query, type, filters);
      setResults(response.results);
    } catch (error) {
      logger.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="space-y-4">
        {/* Search Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search brands, conversations, messages..."
            className="flex-1 border rounded-lg p-3 text-lg"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Type Selector */}
        <div className="flex gap-2">
          {(['all', 'brands', 'conversations', 'messages'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-4 py-2 rounded-lg ${
                type === t
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="ml-auto px-4 py-2 border rounded-lg"
          >
            Filters
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <label className="block text-sm font-medium mb-1">Date From</label>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full border rounded p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date To</label>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full border rounded p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
                className="w-full border rounded p-2"
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Creator</label>
              <input
                type="text"
                placeholder="User ID or email"
                value={filters.userId || ''}
                onChange={(e) => setFilters({ ...filters, userId: e.target.value || undefined })}
                className="w-full border rounded p-2"
              />
            </div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Found {results.length} results
            </div>
            {results.map((result) => (
              <div
                key={result.id}
                onClick={() => onResultClick?.(result)}
                className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                        {result.type}
                      </span>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {result.title}
                      </h3>
                    </div>
                    {result.content && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                        {result.content}
                      </p>
                    )}
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                      {new Date(result.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {query && results.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No results found
          </div>
        )}
      </div>
    </div>
  );
}

