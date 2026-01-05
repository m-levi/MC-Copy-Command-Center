'use client';

import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';

interface PromptToolsProps {
  prompt: string;
  brandName?: string;
  onSuggestion?: (suggestion: string) => void;
}

// Simple token estimation (GPT-style ~4 chars per token)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Variable detection
const KNOWN_VARIABLES = [
  '{{BRAND_INFO}}',
  '{{BRAND_NAME}}',
  '{{WEBSITE_URL}}',
  '{{COPY_BRIEF}}',
  '{{USER_MESSAGE}}',
  '{{CONTEXT_INFO}}',
  '{{MEMORY_CONTEXT}}',
  '{{RAG_CONTEXT}}',
  '{{WEBSITE_HINT}}',
];

function detectVariables(text: string): { valid: string[]; unknown: string[] } {
  const variablePattern = /\{\{[A-Z_]+\}\}/g;
  const found = text.match(variablePattern) || [];
  const valid = found.filter(v => KNOWN_VARIABLES.includes(v));
  const unknown = found.filter(v => !KNOWN_VARIABLES.includes(v));
  return { valid: [...new Set(valid)], unknown: [...new Set(unknown)] };
}

// Prompt quality analysis
interface QualityIssue {
  type: 'warning' | 'suggestion' | 'error';
  message: string;
}

function analyzePromptQuality(text: string): QualityIssue[] {
  const issues: QualityIssue[] = [];

  // Check length
  if (text.length < 100) {
    issues.push({ type: 'warning', message: 'Prompt is very short. Consider adding more detail.' });
  }
  if (text.length > 10000) {
    issues.push({ type: 'warning', message: 'Prompt is very long. This may increase costs and latency.' });
  }

  // Check for role definition
  if (!text.toLowerCase().includes('you are') && !text.toLowerCase().includes('your role')) {
    issues.push({ type: 'suggestion', message: 'Consider starting with a clear role definition (e.g., "You are...")' });
  }

  // Check for brand variable
  if (!text.includes('{{BRAND_INFO}}') && !text.includes('{{BRAND_NAME}}')) {
    issues.push({ type: 'suggestion', message: 'Consider including {{BRAND_INFO}} or {{BRAND_NAME}} for brand context' });
  }

  // Check for common issues
  if (text.includes('do not') || text.includes("don't")) {
    const negativeCount = (text.match(/do not|don't/gi) || []).length;
    if (negativeCount > 5) {
      issues.push({ type: 'suggestion', message: 'Many negative instructions. Consider rephrasing as positive guidance.' });
    }
  }

  // Check for XML structure
  if (text.includes('<') && text.includes('>')) {
    const openTags = (text.match(/<[a-z_]+>/gi) || []).length;
    const closeTags = (text.match(/<\/[a-z_]+>/gi) || []).length;
    if (openTags !== closeTags) {
      issues.push({ type: 'error', message: 'Unbalanced XML tags detected. Check your tag structure.' });
    }
  }

  // Check for markdown headers
  const hasMarkdown = text.includes('##') || text.includes('**');
  if (hasMarkdown) {
    issues.push({ type: 'suggestion', message: 'Uses Markdown formatting. Ensure the AI model supports it.' });
  }

  return issues;
}

export default function PromptTools({ prompt, brandName, onSuggestion }: PromptToolsProps) {
  const [activeTab, setActiveTab] = useState<'stats' | 'validation' | 'improve'>('stats');
  const [improving, setImproving] = useState(false);
  const [improvementSuggestion, setImprovementSuggestion] = useState('');

  // Computed stats
  const stats = useMemo(() => {
    const tokens = estimateTokens(prompt);
    const words = prompt.split(/\s+/).filter(Boolean).length;
    const lines = prompt.split('\n').length;
    const characters = prompt.length;
    const variables = detectVariables(prompt);
    const quality = analyzePromptQuality(prompt);

    return { tokens, words, lines, characters, variables, quality };
  }, [prompt]);

  const handleImprove = async () => {
    if (!prompt.trim()) {
      toast.error('Enter a prompt first');
      return;
    }

    setImproving(true);
    setImprovementSuggestion('');

    try {
      // For now, provide template-based suggestions
      // In production, this could call an AI endpoint
      const suggestions = [];

      if (!prompt.includes('## ')) {
        suggestions.push('Add section headers (##) to organize your prompt into clear parts.');
      }

      if (!prompt.includes('{{BRAND_INFO}}')) {
        suggestions.push('Include {{BRAND_INFO}} to give the AI context about the brand.');
      }

      if (!prompt.toLowerCase().includes('example')) {
        suggestions.push('Add examples of good output to guide the AI.');
      }

      if (!prompt.toLowerCase().includes('format')) {
        suggestions.push('Specify the desired output format (e.g., bullet points, paragraphs, XML).');
      }

      if (prompt.length < 500) {
        suggestions.push('Consider expanding with more specific instructions and constraints.');
      }

      setImprovementSuggestion(suggestions.length > 0 
        ? suggestions.join('\n\n')
        : 'Your prompt looks well-structured! Consider testing it in the sandbox.');
    } catch (error) {
      toast.error('Failed to analyze prompt');
    } finally {
      setImproving(false);
    }
  };

  const getIssueColor = (type: QualityIssue['type']) => {
    switch (type) {
      case 'error': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case 'warning': return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20';
      case 'suggestion': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  const getIssueIcon = (type: QualityIssue['type']) => {
    switch (type) {
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'suggestion': return '💡';
    }
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800/30">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        {(['stats', 'validation', 'improve'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tab === 'stats' && '📊 Stats'}
            {tab === 'validation' && '✓ Validation'}
            {tab === 'improve' && '✨ Improve'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'stats' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Tokens (est.)</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.tokens.toLocaleString()}</p>
              <p className="text-xs text-gray-400">~${(stats.tokens * 0.00001).toFixed(4)}/call</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Words</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.words.toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Lines</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.lines}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Characters</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.characters.toLocaleString()}</p>
            </div>

            {/* Variables */}
            {(stats.variables.valid.length > 0 || stats.variables.unknown.length > 0) && (
              <div className="col-span-full bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Variables Used</p>
                <div className="flex flex-wrap gap-1">
                  {stats.variables.valid.map((v) => (
                    <span key={v} className="px-2 py-0.5 text-xs font-mono bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                      {v}
                    </span>
                  ))}
                  {stats.variables.unknown.map((v) => (
                    <span key={v} className="px-2 py-0.5 text-xs font-mono bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded" title="Unknown variable">
                      {v} ⚠️
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'validation' && (
          <div className="space-y-2">
            {stats.quality.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <span className="text-2xl">✅</span>
                <p className="mt-2 font-medium">No issues detected!</p>
                <p className="text-sm">Your prompt looks good.</p>
              </div>
            ) : (
              stats.quality.map((issue, i) => (
                <div key={i} className={`flex items-start gap-2 p-3 rounded-lg ${getIssueColor(issue.type)}`}>
                  <span>{getIssueIcon(issue.type)}</span>
                  <p className="text-sm">{issue.message}</p>
                </div>
              ))
            )}

            {stats.variables.unknown.length > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                <span>❌</span>
                <div>
                  <p className="text-sm font-medium">Unknown variables detected:</p>
                  <p className="text-sm font-mono">{stats.variables.unknown.join(', ')}</p>
                  <p className="text-xs mt-1">These won't be replaced with actual values.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'improve' && (
          <div className="space-y-4">
            <button
              onClick={handleImprove}
              disabled={improving || !prompt.trim()}
              className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {improving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <span>✨</span>
                  Get Improvement Suggestions
                </>
              )}
            </button>

            {improvementSuggestion && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Suggestions</h4>
                <div className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                  {improvementSuggestion}
                </div>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Quick Tips</h4>
              <ul className="text-sm text-blue-700 dark:text-blue-200 space-y-1 list-disc list-inside">
                <li>Start with a clear role: "You are..."</li>
                <li>Use XML tags for structured sections</li>
                <li>Include examples of desired output</li>
                <li>Specify constraints and limitations</li>
                <li>Test with the Sandbox before deploying</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
























