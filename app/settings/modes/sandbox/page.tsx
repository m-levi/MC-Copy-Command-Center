'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { CustomMode, Brand, ModeColor, MODE_COLOR_META } from '@/types';
import { getErrorMessage } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface StreamMessage {
  type: string;
  content?: string;
  status?: string;
  error?: string;
  response_time_ms?: number;
  token_count?: number;
}

interface TestPreset {
  id: string;
  name: string;
  input: string;
}

interface BatchResult {
  input: string;
  output: string;
  thinking: string;
  responseTime: number | null;
  status: 'pending' | 'running' | 'complete' | 'error';
  error?: string;
}

const DEFAULT_PRESETS: TestPreset[] = [
  { id: '1', name: 'Email Subject Lines', input: 'Generate 5 subject lines for a Black Friday sale email' },
  { id: '2', name: 'Welcome Email', input: 'Write a welcome email for new newsletter subscribers' },
  { id: '3', name: 'Product Description', input: 'Write compelling copy for our new product launch announcement' },
  { id: '4', name: 'Re-engagement', input: 'Create a win-back email for customers who haven\'t purchased in 90 days' },
  { id: '5', name: 'Cart Abandonment', input: 'Write a friendly cart abandonment reminder email' },
];

export default function SandboxPage() {
  const [modes, setModes] = useState<CustomMode[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedModeId, setSelectedModeId] = useState<string>('');
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);
  const [testInput, setTestInput] = useState('');
  const [output, setOutput] = useState('');
  const [thinking, setThinking] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [tokenCount, setTokenCount] = useState<number | null>(null);
  const [showThinking, setShowThinking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');
  const [presets, setPresets] = useState<TestPreset[]>(DEFAULT_PRESETS);
  const [showPresetsPanel, setShowPresetsPanel] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  
  // Batch testing state
  const [batchInputs, setBatchInputs] = useState<string[]>(['', '']);
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  
  // Stats
  const [sessionStats, setSessionStats] = useState({
    testsRun: 0,
    avgResponseTime: 0,
    totalTokens: 0,
  });

  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
    loadPresets();
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
        if (modesData.length > 0) {
          setSelectedModeId(modesData[0].id);
        }
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

  const loadPresets = () => {
    const saved = localStorage.getItem('sandbox-presets');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPresets([...DEFAULT_PRESETS, ...parsed]);
      } catch (e) {
        // Use defaults
      }
    }
  };

  const savePreset = () => {
    if (!newPresetName.trim() || !testInput.trim()) {
      toast.error('Please enter a preset name and test input');
      return;
    }

    const newPreset: TestPreset = {
      id: Date.now().toString(),
      name: newPresetName,
      input: testInput,
    };

    const customPresets = presets.filter(p => !DEFAULT_PRESETS.find(d => d.id === p.id));
    const updated = [...customPresets, newPreset];
    localStorage.setItem('sandbox-presets', JSON.stringify(updated));
    setPresets([...DEFAULT_PRESETS, ...updated]);
    setNewPresetName('');
    toast.success('Preset saved!');
  };

  const deletePreset = (id: string) => {
    const customPresets = presets.filter(p => !DEFAULT_PRESETS.find(d => d.id === p.id) && p.id !== id);
    localStorage.setItem('sandbox-presets', JSON.stringify(customPresets));
    setPresets([...DEFAULT_PRESETS, ...customPresets]);
    toast.success('Preset deleted');
  };

  const getSelectedMode = () => modes.find(m => m.id === selectedModeId);

  const runSingleTest = async (input: string): Promise<{ output: string; thinking: string; responseTime: number | null; tokens: number | null; error?: string }> => {
    const systemPrompt = useCustomPrompt ? customPrompt : getSelectedMode()?.system_prompt;
    if (!systemPrompt) {
      throw new Error('No system prompt');
    }

    let finalOutput = '';
    let finalThinking = '';
    let finalResponseTime: number | null = null;
    let finalTokens: number | null = null;

    const response = await fetch('/api/modes/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_prompt: systemPrompt,
        test_input: input,
        brand_id: selectedBrandId || undefined,
        mode_id: useCustomPrompt ? undefined : selectedModeId,
        mode_name: useCustomPrompt ? 'Custom Prompt' : getSelectedMode()?.name,
        save_result: true,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to test mode');
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(Boolean);

      for (const line of lines) {
        try {
          const message: StreamMessage = JSON.parse(line);
          switch (message.type) {
            case 'text':
              if (message.content) finalOutput += message.content;
              break;
            case 'thinking':
              if (message.content) finalThinking += message.content;
              break;
            case 'complete':
              finalResponseTime = message.response_time_ms || null;
              finalTokens = message.token_count || null;
              break;
            case 'error':
              throw new Error(message.error || 'Unknown error');
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    }

    return { output: finalOutput, thinking: finalThinking, responseTime: finalResponseTime, tokens: finalTokens };
  };

  const handleTest = async () => {
    if (!testInput.trim()) {
      toast.error('Please enter a test input');
      return;
    }

    const systemPrompt = useCustomPrompt ? customPrompt : getSelectedMode()?.system_prompt;
    if (!systemPrompt) {
      toast.error('Please select a mode or enter a custom prompt');
      return;
    }

    setIsStreaming(true);
    setOutput('');
    setThinking('');
    setResponseTime(null);
    setTokenCount(null);

    try {
      const response = await fetch('/api/modes/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_prompt: systemPrompt,
          test_input: testInput,
          brand_id: selectedBrandId || undefined,
          mode_id: useCustomPrompt ? undefined : selectedModeId,
          mode_name: useCustomPrompt ? 'Custom Prompt' : getSelectedMode()?.name,
          save_result: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to test mode');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let finalResponseTime: number | null = null;
      let finalTokens: number | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(Boolean);

        for (const line of lines) {
          try {
            const message: StreamMessage = JSON.parse(line);

            switch (message.type) {
              case 'text':
                if (message.content) {
                  setOutput(prev => prev + message.content);
                  if (outputRef.current) {
                    outputRef.current.scrollTop = outputRef.current.scrollHeight;
                  }
                }
                break;
              case 'thinking':
                if (message.content) {
                  setThinking(prev => prev + message.content);
                }
                break;
              case 'complete':
                finalResponseTime = message.response_time_ms || null;
                finalTokens = message.token_count || null;
                setResponseTime(finalResponseTime);
                setTokenCount(finalTokens);
                break;
              case 'error':
                toast.error(message.error || 'An error occurred');
                break;
            }
          } catch (e) {
            // Ignore parsing errors for incomplete chunks
          }
        }
      }

      // Update session stats
      setSessionStats(prev => ({
        testsRun: prev.testsRun + 1,
        avgResponseTime: finalResponseTime 
          ? (prev.avgResponseTime * prev.testsRun + finalResponseTime) / (prev.testsRun + 1)
          : prev.avgResponseTime,
        totalTokens: prev.totalTokens + (finalTokens || 0),
      }));
    } catch (error) {
      console.error('Error testing mode:', error);
      toast.error('Failed to test mode');
    } finally {
      setIsStreaming(false);
    }
  };

  const handleBatchTest = async () => {
    const validInputs = batchInputs.filter(i => i.trim());
    if (validInputs.length === 0) {
      toast.error('Add at least one test input');
      return;
    }

    const systemPrompt = useCustomPrompt ? customPrompt : getSelectedMode()?.system_prompt;
    if (!systemPrompt) {
      toast.error('Please select a mode or enter a custom prompt');
      return;
    }

    setIsBatchRunning(true);
    setBatchResults(validInputs.map(input => ({
      input,
      output: '',
      thinking: '',
      responseTime: null,
      status: 'pending',
    })));

    for (let i = 0; i < validInputs.length; i++) {
      setBatchResults(prev => prev.map((r, idx) => 
        idx === i ? { ...r, status: 'running' } : r
      ));

      try {
        const result = await runSingleTest(validInputs[i]);
        setBatchResults(prev => prev.map((r, idx) => 
          idx === i ? { 
            ...r, 
            status: 'complete',
            output: result.output,
            thinking: result.thinking,
            responseTime: result.responseTime,
          } : r
        ));

        // Update stats
        setSessionStats(prev => ({
          testsRun: prev.testsRun + 1,
          avgResponseTime: result.responseTime 
            ? (prev.avgResponseTime * prev.testsRun + result.responseTime) / (prev.testsRun + 1)
            : prev.avgResponseTime,
          totalTokens: prev.totalTokens + (result.tokens || 0),
        }));
      } catch (error) {
        setBatchResults(prev => prev.map((r, idx) =>
          idx === i ? { ...r, status: 'error', error: getErrorMessage(error) } : r
        ));
      }
    }

    setIsBatchRunning(false);
    toast.success('Batch testing complete!');
  };

  const handleClear = () => {
    setOutput('');
    setThinking('');
    setResponseTime(null);
    setTokenCount(null);
  };

  const addBatchInput = () => {
    setBatchInputs(prev => [...prev, '']);
  };

  const removeBatchInput = (index: number) => {
    setBatchInputs(prev => prev.filter((_, i) => i !== index));
  };

  const updateBatchInput = (index: number, value: string) => {
    setBatchInputs(prev => prev.map((v, i) => i === index ? value : v));
  };

  const copyOutput = () => {
    navigator.clipboard.writeText(output);
    toast.success('Copied to clipboard');
  };

  const getColorClasses = (color: ModeColor) => {
    const meta = MODE_COLOR_META[color];
    return `${meta.bg} ${meta.text} ${meta.darkBg} ${meta.darkText}`;
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sandbox Playground</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Test prompts without saving to conversations
            </p>
          </div>
        </div>

        {/* Session Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="text-center">
            <p className="text-gray-500">Tests</p>
            <p className="font-bold text-gray-900 dark:text-white">{sessionStats.testsRun}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-500">Avg Time</p>
            <p className="font-bold text-gray-900 dark:text-white">
              {sessionStats.avgResponseTime ? `${(sessionStats.avgResponseTime / 1000).toFixed(2)}s` : '-'}
            </p>
          </div>
          <button
            onClick={() => setShowPresetsPanel(!showPresetsPanel)}
            className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              showPresetsPanel
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            Presets
          </button>
        </div>
      </div>

      {/* Presets Panel */}
      {showPresetsPanel && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900 dark:text-white">Test Presets</h3>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="Preset name..."
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg"
              />
              <button
                onClick={savePreset}
                disabled={!newPresetName.trim() || !testInput.trim()}
                className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg"
              >
                Save Current
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className="group relative p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 cursor-pointer transition-colors"
                onClick={() => setTestInput(preset.input)}
              >
                <p className="font-medium text-sm text-gray-900 dark:text-white mb-1 truncate">{preset.name}</p>
                <p className="text-xs text-gray-500 line-clamp-2">{preset.input}</p>
                {!DEFAULT_PRESETS.find(d => d.id === preset.id) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePreset(preset.id);
                    }}
                    className="absolute top-1 right-1 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mode Tabs */}
      <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('single')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'single'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Single Test
        </button>
        <button
          onClick={() => setActiveTab('batch')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'batch'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Batch Test
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Configuration */}
        <div className="space-y-4">
          {/* Mode Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900 dark:text-white">Mode</h3>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={useCustomPrompt}
                  onChange={(e) => setUseCustomPrompt(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-gray-600 dark:text-gray-400">Use custom prompt</span>
              </label>
            </div>

            {!useCustomPrompt ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {modes.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No modes yet.{' '}
                    <Link href="/settings/modes" className="text-indigo-600 hover:underline">
                      Create one
                    </Link>
                  </div>
                ) : (
                  modes.map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setSelectedModeId(mode.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedModeId === mode.id
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${getColorClasses(mode.color)}`}>
                          {mode.icon}
                        </span>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{mode.name}</div>
                          <div className="text-xs text-gray-500">{mode.description || 'No description'}</div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            ) : (
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="w-full h-32 px-3 py-2 text-sm font-mono border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                placeholder="Enter your custom system prompt..."
              />
            )}
          </div>

          {/* Brand Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">Brand Context (Optional)</h3>
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

          {/* Test Input(s) */}
          {activeTab === 'single' ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3">Test Input</h3>
              <textarea
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                placeholder="Enter what a user would type..."
              />
              <button
                onClick={handleTest}
                disabled={isStreaming || !testInput.trim()}
                className="mt-3 w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isStreaming ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Run Test
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900 dark:text-white">Batch Inputs ({batchInputs.length})</h3>
                <button
                  onClick={addBatchInput}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  + Add Input
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {batchInputs.map((input, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => updateBatchInput(i, e.target.value)}
                      placeholder={`Test input ${i + 1}...`}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                    {batchInputs.length > 1 && (
                      <button
                        onClick={() => removeBatchInput(i)}
                        className="p-2 text-gray-400 hover:text-red-500"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={handleBatchTest}
                disabled={isBatchRunning || !batchInputs.some(i => i.trim())}
                className="mt-3 w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isBatchRunning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Running Batch...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    Run Batch ({batchInputs.filter(i => i.trim()).length} tests)
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Right Panel - Output */}
        {activeTab === 'single' ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <h3 className="font-medium text-gray-900 dark:text-white">Output</h3>
                {responseTime && (
                  <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                    {(responseTime / 1000).toFixed(2)}s
                  </span>
                )}
                {tokenCount && (
                  <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                    ~{tokenCount} tokens
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {thinking && (
                  <button
                    onClick={() => setShowThinking(!showThinking)}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      showThinking
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {showThinking ? 'Hide' : 'Show'} Thinking
                  </button>
                )}
                {output && (
                  <button
                    onClick={copyOutput}
                    className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Copy
                  </button>
                )}
                <button
                  onClick={handleClear}
                  disabled={!output && !thinking}
                  className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Thinking Panel */}
            {showThinking && thinking && (
              <div className="px-4 py-3 bg-purple-50 dark:bg-purple-900/10 border-b border-purple-200 dark:border-purple-800 max-h-32 overflow-y-auto">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                  <span className="text-xs font-medium text-purple-700 dark:text-purple-300">AI Thinking</span>
                </div>
                <p className="text-sm text-purple-800 dark:text-purple-200 whitespace-pre-wrap">{thinking}</p>
              </div>
            )}

            {/* Output */}
            <div ref={outputRef} className="flex-1 p-4 overflow-y-auto">
              {output ? (
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                  {output}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  {isStreaming ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                      <span>Generating response...</span>
                    </div>
                  ) : (
                    <div className="text-center">
                      <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p>Run a test to see the output here</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col min-h-[500px]">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-white">Batch Results</h3>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
              {batchResults.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    <p>Run batch tests to see results here</p>
                  </div>
                </div>
              ) : (
                batchResults.map((result, i) => (
                  <div key={i} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500">Test {i + 1}</span>
                        {result.status === 'running' && (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-indigo-600"></div>
                        )}
                        {result.status === 'complete' && (
                          <span className="text-green-500">✓</span>
                        )}
                        {result.status === 'error' && (
                          <span className="text-red-500">✗</span>
                        )}
                      </div>
                      {result.responseTime && (
                        <span className="text-xs text-gray-500">
                          {(result.responseTime / 1000).toFixed(2)}s
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 bg-gray-50 dark:bg-gray-900 rounded p-2">
                      <span className="text-xs font-medium text-gray-500 block mb-1">Input:</span>
                      {result.input}
                    </p>
                    {result.status === 'complete' && result.output && (
                      <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 rounded p-2 max-h-32 overflow-y-auto">
                        <span className="text-xs font-medium text-gray-500 block mb-1">Output:</span>
                        {result.output.substring(0, 300)}
                        {result.output.length > 300 && '...'}
                      </div>
                    )}
                    {result.status === 'error' && (
                      <p className="text-sm text-red-500">{result.error}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
























