'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { CustomMode, Brand, ModeColor, MODE_COLOR_META } from '@/types';

export const dynamic = 'force-dynamic';

interface ComparisonResult {
  mode_id?: string;
  mode_name: string;
  output: string;
  reasoning?: string;
  response_time_ms: number;
  error?: string;
}

interface ComparisonResponse {
  comparison_group_id: string;
  test_input: string;
  model_used: string;
  brand_name: string | null;
  results: ComparisonResult[];
}

interface Vote {
  mode_name: string;
  voted_at: Date;
}

interface ComparisonHistory {
  id: string;
  timestamp: Date;
  input: string;
  winner?: string;
  results: ComparisonResult[];
  votes: Vote[];
}

export default function ComparePage() {
  const [modes, setModes] = useState<CustomMode[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedModeIds, setSelectedModeIds] = useState<string[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [testInput, setTestInput] = useState('');
  const [isComparing, setIsComparing] = useState(false);
  const [results, setResults] = useState<ComparisonResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  
  // Voting and history
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [currentWinner, setCurrentWinner] = useState<string | null>(null);
  const [comparisonHistory, setComparisonHistory] = useState<ComparisonHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Stats
  const [modeStats, setModeStats] = useState<Record<string, { wins: number; tests: number; avgTime: number }>>({});

  useEffect(() => {
    loadData();
    loadHistory();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [modesRes, brandsRes] = await Promise.all([
        fetch('/api/modes'),
        fetch('/api/brands'),
      ]);

      if (modesRes.ok) {
        const modesData = await modesRes.json();
        setModes(modesData);
      }

      if (brandsRes.ok) {
        const brandsData = await brandsRes.json();
        // Ensure we have an array of brands
        const brandsArray = Array.isArray(brandsData) ? brandsData : [];
        setBrands(brandsArray);
        if (brandsArray.length > 0) {
          setSelectedBrandId(brandsArray[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = () => {
    const saved = localStorage.getItem('comparison-history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setComparisonHistory(parsed.map((h: any) => ({
          ...h,
          timestamp: new Date(h.timestamp),
          votes: h.votes?.map((v: any) => ({ ...v, voted_at: new Date(v.voted_at) })) || [],
        })));
        calculateStats(parsed);
      } catch (e) {
        // Ignore
      }
    }
  };

  const saveHistory = (history: ComparisonHistory[]) => {
    localStorage.setItem('comparison-history', JSON.stringify(history));
    calculateStats(history);
  };

  const calculateStats = (history: ComparisonHistory[]) => {
    const stats: Record<string, { wins: number; tests: number; totalTime: number }> = {};
    
    history.forEach(h => {
      h.results.forEach(r => {
        if (!stats[r.mode_name]) {
          stats[r.mode_name] = { wins: 0, tests: 0, totalTime: 0 };
        }
        stats[r.mode_name].tests++;
        stats[r.mode_name].totalTime += r.response_time_ms;
        if (h.winner === r.mode_name) {
          stats[r.mode_name].wins++;
        }
      });
    });

    const processedStats: Record<string, { wins: number; tests: number; avgTime: number }> = {};
    Object.entries(stats).forEach(([name, data]) => {
      processedStats[name] = {
        wins: data.wins,
        tests: data.tests,
        avgTime: data.totalTime / data.tests,
      };
    });

    setModeStats(processedStats);
  };

  const toggleModeSelection = (modeId: string) => {
    setSelectedModeIds(prev => {
      if (prev.includes(modeId)) {
        return prev.filter(id => id !== modeId);
      }
      if (prev.length >= 4) {
        toast.error('Maximum 4 modes can be compared');
        return prev;
      }
      return [...prev, modeId];
    });
  };

  const handleCompare = async () => {
    if (selectedModeIds.length < 2) {
      toast.error('Select at least 2 modes to compare');
      return;
    }
    if (!testInput.trim()) {
      toast.error('Please enter a test input');
      return;
    }

    const selectedModes = modes.filter(m => selectedModeIds.includes(m.id));

    setIsComparing(true);
    setResults(null);
    setVotes({});
    setCurrentWinner(null);

    try {
      const response = await fetch('/api/modes/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modes: selectedModes.map(m => ({
            id: m.id,
            name: m.name,
            system_prompt: m.system_prompt,
          })),
          test_input: testInput,
          brand_id: selectedBrandId || undefined,
          save_results: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to compare modes');
      }

      const data: ComparisonResponse = await response.json();
      setResults(data);

      // Initialize votes
      const initialVotes: Record<string, number> = {};
      data.results.forEach(r => { initialVotes[r.mode_name] = 0; });
      setVotes(initialVotes);

      toast.success('Comparison complete!');
    } catch (error) {
      console.error('Error comparing modes:', error);
      toast.error('Failed to compare modes');
    } finally {
      setIsComparing(false);
    }
  };

  const handleVote = (modeName: string) => {
    if (!results) return;

    setVotes(prev => {
      const updated = { ...prev, [modeName]: (prev[modeName] || 0) + 1 };
      
      // Determine winner
      const maxVotes = Math.max(...Object.values(updated));
      const winners = Object.entries(updated).filter(([_, v]) => v === maxVotes && v > 0);
      
      if (winners.length === 1) {
        setCurrentWinner(winners[0][0]);
      } else {
        setCurrentWinner(null); // Tie or no votes
      }
      
      return updated;
    });

    toast.success(`Voted for ${modeName}!`, { duration: 1500 });
  };

  const declareWinner = () => {
    if (!results || !currentWinner) return;

    const newEntry: ComparisonHistory = {
      id: results.comparison_group_id,
      timestamp: new Date(),
      input: results.test_input,
      winner: currentWinner,
      results: results.results,
      votes: Object.entries(votes).flatMap(([name, count]) => 
        Array(count).fill(null).map(() => ({ mode_name: name, voted_at: new Date() }))
      ),
    };

    const updated = [newEntry, ...comparisonHistory].slice(0, 50); // Keep last 50
    setComparisonHistory(updated);
    saveHistory(updated);
    
    toast.success(`${currentWinner} declared the winner! 🏆`);
  };

  const clearHistory = () => {
    if (!confirm('Clear all comparison history? This cannot be undone.')) return;
    localStorage.removeItem('comparison-history');
    setComparisonHistory([]);
    setModeStats({});
    toast.success('History cleared');
  };

  const toggleExpand = (modeName: string) => {
    setExpandedResults(prev => {
      const next = new Set(prev);
      if (next.has(modeName)) {
        next.delete(modeName);
      } else {
        next.add(modeName);
      }
      return next;
    });
  };

  const copyOutput = (output: string) => {
    navigator.clipboard.writeText(output);
    toast.success('Copied to clipboard');
  };

  const getColorClasses = (color: ModeColor) => {
    const meta = MODE_COLOR_META[color];
    return `${meta.bg} ${meta.text} ${meta.darkBg} ${meta.darkText}`;
  };

  const getModeByName = (name: string) => modes.find(m => m.name === name);

  const getWinRate = (modeName: string) => {
    const stats = modeStats[modeName];
    if (!stats || stats.tests === 0) return 0;
    return (stats.wins / stats.tests) * 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">A/B Compare</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Compare outputs and vote for the best
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
            showHistory
              ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Stats & History
        </button>
      </div>

      {/* Stats & History Panel */}
      {showHistory && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Mode Performance</h2>
            <button
              onClick={clearHistory}
              className="text-sm text-red-600 dark:text-red-400 hover:underline"
            >
              Clear History
            </button>
          </div>

          {/* Mode Leaderboard */}
          {Object.keys(modeStats).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {Object.entries(modeStats)
                .sort((a, b) => getWinRate(b[0]) - getWinRate(a[0]))
                .map(([name, stats], index) => {
                  const mode = getModeByName(name);
                  const winRate = getWinRate(name);
                  return (
                    <div
                      key={name}
                      className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {index === 0 && stats.wins > 0 && (
                            <span className="text-lg">🏆</span>
                          )}
                          {mode && (
                            <span className={`w-6 h-6 rounded flex items-center justify-center text-sm ${getColorClasses(mode.color)}`}>
                              {mode.icon}
                            </span>
                          )}
                          <span className="font-medium text-gray-900 dark:text-white">{name}</span>
                        </div>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {winRate.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                        <div
                          className="bg-green-500 rounded-full h-2 transition-all"
                          style={{ width: `${winRate}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{stats.wins} wins / {stats.tests} tests</span>
                        <span>Avg: {(stats.avgTime / 1000).toFixed(2)}s</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No comparison data yet. Run some comparisons to see stats!
            </div>
          )}

          {/* Recent History */}
          {comparisonHistory.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Recent Comparisons</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {comparisonHistory.slice(0, 10).map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white truncate">
                        {h.input}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(h.timestamp).toLocaleString()}
                      </p>
                    </div>
                    {h.winner && (
                      <div className="flex items-center gap-2 ml-4">
                        <span className="text-xs text-gray-500">Winner:</span>
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                          {h.winner} 🏆
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mode Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900 dark:text-white">Select Modes (2-4)</h3>
            <span className="text-sm text-gray-500">{selectedModeIds.length}/4 selected</span>
          </div>
          
          {modes.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No modes yet.{' '}
              <Link href="/settings/modes" className="text-indigo-600 hover:underline">
                Create some
              </Link>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {modes.map((mode) => {
                const isSelected = selectedModeIds.includes(mode.id);
                const stats = modeStats[mode.name];
                return (
                  <button
                    key={mode.id}
                    onClick={() => toggleModeSelection(mode.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected 
                          ? 'border-indigo-600 bg-indigo-600' 
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className={`w-6 h-6 rounded flex items-center justify-center text-sm ${getColorClasses(mode.color)}`}>
                        {mode.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-gray-900 dark:text-white text-sm">{mode.name}</span>
                        {stats && (
                          <span className="text-xs text-gray-500 ml-2">
                            ({getWinRate(mode.name).toFixed(0)}% win rate)
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Brand & Input */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">Brand Context</h3>
            <select
              value={selectedBrandId}
              onChange={(e) => setSelectedBrandId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">No brand context</option>
              {brands.map((brand, index) => (
                <option key={brand.id || `brand-${index}`} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">Test Input</h3>
            <textarea
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              className="w-full h-24 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              placeholder="Enter what a user would type..."
            />
            <button
              onClick={handleCompare}
              disabled={isComparing || selectedModeIds.length < 2 || !testInput.trim()}
              className="mt-3 w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isComparing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Comparing {selectedModeIds.length} modes...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Compare Modes
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Results - Vote for the Best!</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>Model: {results.model_used}</span>
                {results.brand_name && <span>Brand: {results.brand_name}</span>}
              </div>
              {currentWinner && (
                <button
                  onClick={declareWinner}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <span>🏆</span>
                  Declare {currentWinner} Winner
                </button>
              )}
            </div>
          </div>

          {/* Vote Summary */}
          {Object.values(votes).some(v => v > 0) && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Votes:</span>
              <div className="flex items-center gap-3">
                {Object.entries(votes).map(([name, count]) => {
                  const mode = getModeByName(name);
                  return (
                    <div key={name} className="flex items-center gap-1">
                      {mode && (
                        <span className={`w-5 h-5 rounded flex items-center justify-center text-xs ${getColorClasses(mode.color)}`}>
                          {mode.icon}
                        </span>
                      )}
                      <span className="text-sm text-gray-700 dark:text-gray-300">{name}:</span>
                      <span className="font-bold text-gray-900 dark:text-white">{count}</span>
                    </div>
                  );
                })}
              </div>
              {currentWinner && (
                <span className="ml-auto text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                  Leading: {currentWinner} 🏆
                </span>
              )}
            </div>
          )}

          <div className={`grid gap-4 ${
            results.results.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
            results.results.length === 3 ? 'grid-cols-1 md:grid-cols-3' :
            'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
          }`}>
            {results.results.map((result, index) => {
              const mode = getModeByName(result.mode_name);
              const isExpanded = expandedResults.has(result.mode_name);
              const voteCount = votes[result.mode_name] || 0;
              const isLeading = currentWinner === result.mode_name;
              
              return (
                <div
                  key={index}
                  className={`bg-white dark:bg-gray-800 rounded-lg border overflow-hidden transition-all ${
                    result.error 
                      ? 'border-red-300 dark:border-red-700' 
                      : isLeading
                      ? 'border-green-500 dark:border-green-500 ring-2 ring-green-500/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {/* Header */}
                  <div className={`px-4 py-3 border-b ${
                    isLeading 
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {mode && (
                          <span className={`w-6 h-6 rounded flex items-center justify-center text-sm ${getColorClasses(mode.color)}`}>
                            {mode.icon}
                          </span>
                        )}
                        <span className="font-medium text-gray-900 dark:text-white">{result.mode_name}</span>
                        {isLeading && <span>🏆</span>}
                      </div>
                      <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {(result.response_time_ms / 1000).toFixed(2)}s
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    {result.error ? (
                      <div className="text-red-600 dark:text-red-400 text-sm">
                        Error: {result.error}
                      </div>
                    ) : (
                      <>
                        {result.reasoning && (
                          <div className="mb-3">
                            <button
                              onClick={() => toggleExpand(result.mode_name)}
                              className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 hover:underline"
                            >
                              <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              Thinking
                            </button>
                            {isExpanded && (
                              <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded text-xs text-purple-800 dark:text-purple-200 whitespace-pre-wrap max-h-32 overflow-y-auto">
                                {result.reasoning}
                              </div>
                            )}
                          </div>
                        )}
                        <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                          {result.output}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Footer - Voting */}
                  {!result.error && (
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <button
                        onClick={() => handleVote(result.mode_name)}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                      >
                        <span>👍</span>
                        Vote ({voteCount})
                      </button>
                      <button
                        onClick={() => copyOutput(result.output)}
                        className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        Copy
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!results && !isComparing && (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
          <svg className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Select modes and enter a test input</p>
          <p className="text-sm text-gray-500 mt-1">Vote for the best output to track mode performance</p>
        </div>
      )}
    </div>
  );
}
























