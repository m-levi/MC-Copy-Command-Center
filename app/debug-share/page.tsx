'use client';

import { useState } from 'react';

export default function DebugSharePage() {
  const [token, setToken] = useState('EfQdTB3nYaCnEpQrckUQRHBZZJCcOU29');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testShare = async () => {
    setLoading(true);
    setResult(null);

    try {
      console.log('🔍 Testing share token:', token);
      
      const response = await fetch(`/api/shared/${token}`);
      
      console.log('📡 Response status:', response.status, response.statusText);
      console.log('📋 Response headers:', Object.fromEntries(response.headers.entries()));
      
      const text = await response.text();
      console.log('📄 Raw response:', text);
      
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch (e) {
        console.error('❌ Failed to parse JSON');
        setResult({
          error: 'Invalid JSON response',
          status: response.status,
          rawText: text
        });
        return;
      }
      
      setResult({
        ok: response.ok,
        status: response.status,
        data,
        rawText: text
      });
      
    } catch (error) {
      console.error('❌ Fetch error:', error);
      setResult({
        error: 'Fetch failed',
        message: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-gray-100">
          🔍 Share Link Debugger
        </h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg mb-6">
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">
            Share Token
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Enter share token"
            />
            <button
              onClick={testShare}
              disabled={loading || !token}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
            >
              {loading ? 'Testing...' : 'Test'}
            </button>
          </div>
        </div>

        {result && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              Results
            </h2>

            <div className="space-y-4">
              {/* Status */}
              <div>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Status
                </div>
                <div className={`text-lg font-mono ${result.ok ? 'text-green-600' : 'text-red-600'}`}>
                  {result.status} {result.ok ? '✅' : '❌'}
                </div>
              </div>

              {/* Data */}
              {result.data && (
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Parsed Data
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded overflow-auto">
                    <pre className="text-xs text-gray-900 dark:text-gray-100">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Raw Text */}
              {result.rawText && (
                <div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Raw Response
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded overflow-auto">
                    <pre className="text-xs text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                      {result.rawText}
                    </pre>
                  </div>
                </div>
              )}

              {/* Error */}
              {result.error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="text-red-800 dark:text-red-300 font-medium">
                    Error: {result.error}
                  </div>
                  {result.message && (
                    <div className="text-red-600 dark:text-red-400 text-sm mt-1">
                      {result.message}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {result.ok && result.data?.share && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <a
                  href={`/shared/${token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Open Shared Page
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2 text-blue-900 dark:text-blue-100">
            📋 Instructions
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800 dark:text-blue-200 text-sm">
            <li>Enter a share token or use the default</li>
            <li>Click "Test" to check if the API works</li>
            <li>Check browser console (F12) for detailed logs</li>
            <li>Check your Next.js terminal for backend logs starting with [Shared API]</li>
            <li>If test succeeds, click "Open Shared Page" to see the actual page</li>
          </ol>
        </div>
      </div>
    </div>
  );
}




