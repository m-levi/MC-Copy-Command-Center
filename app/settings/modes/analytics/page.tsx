'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { CustomMode, ModeTestResult, ModeColor, MODE_COLOR_META } from '@/types';

export const dynamic = 'force-dynamic';

interface ModeAnalytics {
  mode_id: string;
  mode_name: string;
  mode_icon?: string;
  mode_color?: ModeColor;
  total_tests: number;
  avg_response_time: number;
  avg_rating: number | null;
  total_comparisons: number;
  wins: number;
  last_used: string;
}

interface DailyStats {
  date: string;
  tests: number;
  comparisons: number;
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [modes, setModes] = useState<CustomMode[]>([]);
  const [testResults, setTestResults] = useState<ModeTestResult[]>([]);
  const [modeAnalytics, setModeAnalytics] = useState<ModeAnalytics[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalTests: 0,
    totalComparisons: 0,
    avgResponseTime: 0,
    avgRating: 0,
    uniqueModes: 0,
    topPerformer: '',
  });
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('30d');

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [modesRes, resultsRes] = await Promise.all([
        fetch('/api/modes'),
        fetch('/api/modes/test-results?limit=500'),
      ]);

      let modesData: CustomMode[] = [];
      let resultsData: ModeTestResult[] = [];

      if (modesRes.ok) {
        modesData = await modesRes.json();
        setModes(modesData);
      }

      if (resultsRes.ok) {
        resultsData = await resultsRes.json();
        // Filter by time range
        const now = new Date();
        const cutoff = timeRange === '7d' 
          ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          : timeRange === '30d'
          ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          : new Date(0);
        
        resultsData = resultsData.filter(r => new Date(r.created_at) >= cutoff);
        setTestResults(resultsData);
      }

      // Calculate analytics
      calculateAnalytics(modesData, resultsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (modes: CustomMode[], results: ModeTestResult[]) => {
    // Group results by mode
    const modeMap = new Map<string, {
      tests: ModeTestResult[];
      mode?: CustomMode;
    }>();

    results.forEach(result => {
      const key = result.mode_id || result.mode_name || 'custom';
      if (!modeMap.has(key)) {
        modeMap.set(key, { tests: [], mode: modes.find(m => m.id === result.mode_id) });
      }
      modeMap.get(key)!.tests.push(result);
    });

    // Load comparison wins from localStorage
    const comparisonHistory = JSON.parse(localStorage.getItem('comparison-history') || '[]');
    const winsByMode: Record<string, number> = {};
    comparisonHistory.forEach((h: any) => {
      if (h.winner) {
        winsByMode[h.winner] = (winsByMode[h.winner] || 0) + 1;
      }
    });

    // Calculate per-mode analytics
    const analytics: ModeAnalytics[] = [];

    modeMap.forEach((data, key) => {
      const { tests, mode } = data;
      const comparisons = tests.filter(t => t.is_comparison).length;
      const ratings = tests.filter(t => t.rating).map(t => t.rating!);
      const responseTimes = tests.filter(t => t.response_time_ms).map(t => t.response_time_ms!);

      analytics.push({
        mode_id: key,
        mode_name: mode?.name || tests[0]?.mode_name || 'Custom Prompt',
        mode_icon: mode?.icon,
        mode_color: mode?.color,
        total_tests: tests.length,
        avg_response_time: responseTimes.length > 0 
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
          : 0,
        avg_rating: ratings.length > 0 
          ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
          : null,
        total_comparisons: comparisons,
        wins: winsByMode[mode?.name || ''] || 0,
        last_used: tests.length > 0 
          ? tests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at 
          : '',
      });
    });

    // Sort by total tests
    analytics.sort((a, b) => b.total_tests - a.total_tests);
    setModeAnalytics(analytics);

    // Calculate daily stats
    const dailyMap = new Map<string, { tests: number; comparisons: number }>();
    results.forEach(result => {
      const date = new Date(result.created_at).toISOString().split('T')[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { tests: 0, comparisons: 0 });
      }
      const day = dailyMap.get(date)!;
      day.tests++;
      if (result.is_comparison) day.comparisons++;
    });

    const daily = Array.from(dailyMap.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));
    setDailyStats(daily);

    // Calculate overall stats
    const allRatings = results.filter(r => r.rating).map(r => r.rating!);
    const allResponseTimes = results.filter(r => r.response_time_ms).map(r => r.response_time_ms!);
    const comparisons = results.filter(r => r.is_comparison).length;
    const topPerformer = analytics.length > 0 ? analytics[0].mode_name : '';

    setOverallStats({
      totalTests: results.length,
      totalComparisons: comparisons,
      avgResponseTime: allResponseTimes.length > 0 
        ? allResponseTimes.reduce((a, b) => a + b, 0) / allResponseTimes.length 
        : 0,
      avgRating: allRatings.length > 0 
        ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length 
        : 0,
      uniqueModes: modeMap.size,
      topPerformer,
    });
  };

  const getColorClasses = (color?: ModeColor) => {
    if (!color) return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    const meta = MODE_COLOR_META[color];
    return `${meta.bg} ${meta.text} ${meta.darkBg} ${meta.darkText}`;
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getMaxTests = () => {
    return Math.max(...dailyStats.map(d => d.tests), 1);
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mode Analytics</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Track performance and usage of your custom modes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {(['7d', '30d', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                timeRange === range
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Total Tests</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{overallStats.totalTests}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">A/B Tests</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{overallStats.totalComparisons}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Avg Response</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {formatTime(overallStats.avgResponseTime)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Avg Rating</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {overallStats.avgRating ? `${overallStats.avgRating.toFixed(1)}★` : '-'}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Modes Used</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{overallStats.uniqueModes}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Top Mode</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white mt-1 truncate">
            {overallStats.topPerformer || '-'}
          </p>
        </div>
      </div>

      {/* Activity Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Testing Activity</h3>
        {dailyStats.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No testing activity in this period
          </div>
        ) : (
          <div className="h-48 flex items-end gap-1">
            {dailyStats.slice(-30).map((day, i) => {
              const maxTests = getMaxTests();
              const height = (day.tests / maxTests) * 100;
              const comparisonHeight = (day.comparisons / maxTests) * 100;
              return (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-stretch justify-end gap-0.5 group relative"
                  title={`${day.date}: ${day.tests} tests (${day.comparisons} A/B)`}
                >
                  <div
                    className="bg-indigo-500 rounded-t transition-all hover:bg-indigo-600"
                    style={{ height: `${height}%`, minHeight: day.tests > 0 ? '4px' : '0' }}
                  />
                  <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {day.date}: {day.tests} tests
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>{dailyStats[0]?.date || ''}</span>
          <span>{dailyStats[dailyStats.length - 1]?.date || ''}</span>
        </div>
      </div>

      {/* Mode Performance Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">Mode Performance</h3>
        </div>
        {modeAnalytics.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No mode data available
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Mode</th>
                  <th className="px-6 py-3 text-center">Tests</th>
                  <th className="px-6 py-3 text-center">A/B Tests</th>
                  <th className="px-6 py-3 text-center">Wins</th>
                  <th className="px-6 py-3 text-center">Avg Time</th>
                  <th className="px-6 py-3 text-center">Rating</th>
                  <th className="px-6 py-3">Last Used</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {modeAnalytics.map((analytics, index) => (
                  <tr key={analytics.mode_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500 font-mono text-sm">#{index + 1}</span>
                        {analytics.mode_icon && (
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${getColorClasses(analytics.mode_color)}`}>
                            {analytics.mode_icon}
                          </span>
                        )}
                        <span className="font-medium text-gray-900 dark:text-white">
                          {analytics.mode_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-900 dark:text-white font-medium">
                      {analytics.total_tests}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-400">
                      {analytics.total_comparisons}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {analytics.wins > 0 ? (
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          {analytics.wins} 🏆
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-400">
                      {formatTime(analytics.avg_response_time)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {analytics.avg_rating ? (
                        <span className="text-yellow-500 font-medium">
                          {analytics.avg_rating.toFixed(1)}★
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {analytics.last_used 
                        ? new Date(analytics.last_used).toLocaleDateString()
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex items-center justify-center gap-4">
        <Link
          href="/settings/modes/sandbox"
          className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 font-medium rounded-lg transition-colors"
        >
          Open Sandbox
        </Link>
        <Link
          href="/settings/modes/compare"
          className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50 font-medium rounded-lg transition-colors"
        >
          Run A/B Test
        </Link>
        <Link
          href="/settings/modes/history"
          className="px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50 font-medium rounded-lg transition-colors"
        >
          View History
        </Link>
      </div>
    </div>
  );
}
























