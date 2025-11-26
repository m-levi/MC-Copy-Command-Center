'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface SubjectLineOption {
  subject: string;
  preview_text: string;
  type: string;
  score: number;
  explanation: string;
}

interface SubjectLineGeneratorInlineProps {
  emailContent: string;
  isVisible?: boolean;
}

export default function SubjectLineGeneratorInline({ emailContent, isVisible = false }: SubjectLineGeneratorInlineProps) {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<SubjectLineOption[]>([]);
  const [error, setError] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Auto-expand if visible and no options yet
  useEffect(() => {
    if (isVisible && !expanded) {
      setExpanded(true);
    }
  }, [isVisible]);

  const generateSubjectLines = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/generate-subject-lines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailContent }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to generate subject lines: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.options && Array.isArray(data.options)) {
        // Append new options to existing ones
        setOptions(prevOptions => [...prevOptions, ...data.options]);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error generating subject lines:', err);
      setError('Failed to generate subject lines. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!expanded) {
    return (
      <div className="border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => {
            setExpanded(true);
            if (options.length === 0) generateSubjectLines();
          }}
          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              {options.length > 0 ? `View Subject Lines (${options.length})` : 'Generate Subject Lines'}
            </span>
          </div>
          <svg className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="bg-gray-50/50 dark:bg-gray-800/20">
        {/* Header */}
        <div className="px-4 py-2.5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded text-purple-600 dark:text-purple-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            Smart Subject Lines
          </h3>
          <button
            onClick={() => setExpanded(false)}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading && options.length === 0 ? (
            <div className="py-8 flex flex-col items-center text-center space-y-3">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Analyzing email content...</p>
            </div>
          ) : error ? (
            <div className="py-6 text-center space-y-3">
              <p className="text-sm text-red-500">{error}</p>
              <button
                onClick={generateSubjectLines}
                className="text-sm text-blue-600 hover:underline"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {options.map((option, index) => (
                <div 
                  key={index} 
                  className="group p-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-200 dark:hover:border-blue-700 transition-all"
                >
                  <div className="flex justify-between items-start gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full ${
                        option.type.toLowerCase().includes('urgent') ? 'bg-red-50 text-red-600 dark:bg-red-900/30' :
                        option.type.toLowerCase().includes('benefit') ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30' :
                        'bg-blue-50 text-blue-600 dark:bg-blue-900/30'
                      }`}>
                        {option.type}
                      </span>
                      {option.score > 0 && (
                        <span className="text-[10px] font-medium text-amber-500 flex items-center gap-0.5">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          {option.score}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleCopy(option.subject, index)}
                      className="text-gray-400 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                      title="Copy subject"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="mb-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug">
                      {option.subject}
                    </p>
                  </div>

                  {option.preview_text && (
                    <div className="flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 px-2 py-1.5 rounded">
                      <span className="truncate">{option.preview_text}</span>
                      <button
                        onClick={() => handleCopy(option.preview_text, index + 100)}
                        className="text-gray-400 hover:text-blue-600"
                        title="Copy preview text"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
              
              <button
                onClick={generateSubjectLines}
                disabled={loading}
                className="w-full py-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors border border-dashed border-blue-200 dark:border-blue-800 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  'Generate More Options'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
