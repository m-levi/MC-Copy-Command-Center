'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ModeTestResult } from '@/types';

export const dynamic = 'force-dynamic';

interface TestResultWithMode extends ModeTestResult {
  mode?: {
    name: string;
    icon: string;
    color: string;
  };
}

export default function HistoryPage() {
  const [results, setResults] = useState<TestResultWithMode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<TestResultWithMode | null>(null);
  const [filter, setFilter] = useState<'all' | 'sandbox' | 'comparison'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    avgResponseTime: 0,
    comparisons: 0,
    uniqueModes: 0,
  });

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/modes/test-results?limit=100');
      if (response.ok) {
        const data = await response.json();
        setResults(data);
        calculateStats(data);
      }
    } catch (error) {
      console.error('Error loading results:', error);
      toast.error('Failed to load test history');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: TestResultWithMode[]) => {
    const total = data.length;
    const avgResponseTime = data.reduce((acc, r) => acc + (r.response_time_ms || 0), 0) / (total || 1);
    const comparisons = data.filter(r => r.is_comparison).length;
    const uniqueModes = new Set(data.map(r => r.mode_id).filter(Boolean)).size;
    
    setStats({ total, avgResponseTime, comparisons, uniqueModes });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this test result?')) return;

    try {
      const response = await fetch(`/api/modes/test-results?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete');

      toast.success('Test result deleted');
      setResults(prev => prev.filter(r => r.id !== id));
      if (selectedResult?.id === id) setSelectedResult(null);
    } catch (error) {
      console.error('Error deleting result:', error);
      toast.error('Failed to delete test result');
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Delete ALL test results? This cannot be undone.')) return;

    try {
      const response = await fetch('/api/modes/test-results?clear_all=true', {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to clear');

      toast.success('All test results cleared');
      setResults([]);
      setSelectedResult(null);
    } catch (error) {
      console.error('Error clearing results:', error);
      toast.error('Failed to clear test results');
    }
  };

  const handleRate = async (id: string, rating: number) => {
    try {
      const response = await fetch('/api/modes/test-results', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, rating }),
      });

      if (!response.ok) throw new Error('Failed to rate');

      setResults(prev => prev.map(r => r.id === id ? { ...r, rating } : r));
      if (selectedResult?.id === id) {
        setSelectedResult(prev => prev ? { ...prev, rating } : null);
      }
      toast.success('Rating saved');
    } catch (error) {
      console.error('Error rating result:', error);
      toast.error('Failed to save rating');
    }
  };

  const filteredResults = results.filter(r => {
    if (filter === 'sandbox' && r.is_comparison) return false;
    if (filter === 'comparison' && !r.is_comparison) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return r.test_input?.toLowerCase().includes(query) ||
             r.test_output?.toLowerCase().includes(query) ||
             r.mode_name?.toLowerCase().includes(query);
    }
    return true;
  });

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/settings/modes"
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Test History</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              View and analyze your mode test results
            </p>
          </div>
        </div>
        <button
          onClick={handleClearAll}
          disabled={results.length === 0}
          className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Clear All
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500">Total Tests</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500">Avg Response</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatTime(stats.avgResponseTime)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500">A/B Comparisons</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.comparisons}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500">Modes Tested</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.uniqueModes}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {(['all', 'sandbox', 'comparison'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === f
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {f === 'all' ? 'All' : f === 'sandbox' ? 'Sandbox' : 'A/B Tests'}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search tests..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 max-w-xs px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <h3 className="font-medium text-gray-900 dark:text-white">
              Test Results ({filteredResults.length})
            </h3>
          </div>
          <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              </div>
            ) : filteredResults.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No test results found
              </div>
            ) : (
              filteredResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => setSelectedResult(result)}
                  className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    selectedResult?.id === result.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
                          {result.mode_name || 'Custom Prompt'}
                        </span>
                        {result.is_comparison && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                            A/B
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {result.test_input?.substring(0, 80)}...
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span>{new Date(result.created_at).toLocaleDateString()}</span>
                        {result.response_time_ms && (
                          <span>{formatTime(result.response_time_ms)}</span>
                        )}
                        {result.rating && (
                          <span className="flex items-center gap-0.5">
                            {'★'.repeat(result.rating)}
                            {'☆'.repeat(5 - result.rating)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(result.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Detail View */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {selectedResult ? (
            <div className="flex flex-col h-full">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {selectedResult.mode_name || 'Custom Prompt'}
                  </h3>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => handleRate(selectedResult.id, star)}
                        className={`text-lg ${
                          (selectedResult.rating || 0) >= star
                            ? 'text-yellow-400'
                            : 'text-gray-300 dark:text-gray-600 hover:text-yellow-400'
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                  <span>{new Date(selectedResult.created_at).toLocaleString()}</span>
                  <span>{selectedResult.model_used}</span>
                  {selectedResult.response_time_ms && (
                    <span>{formatTime(selectedResult.response_time_ms)}</span>
                  )}
                  {selectedResult.brand_name && (
                    <span>Brand: {selectedResult.brand_name}</span>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Input</h4>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300">
                    {selectedResult.test_input}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Output</h4>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-64 overflow-y-auto">
                    {selectedResult.test_output || 'No output recorded'}
                  </div>
                </div>

                {selectedResult.system_prompt_snapshot && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">System Prompt Used</h4>
                    <div className="bg-gray-900 rounded-lg p-3 text-xs text-gray-300 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {selectedResult.system_prompt_snapshot.substring(0, 1000)}
                      {selectedResult.system_prompt_snapshot.length > 1000 && '...'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[400px] text-gray-500">
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>Select a test result to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
























