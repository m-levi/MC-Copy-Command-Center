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

interface SubjectLineGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  emailContent: string;
}

export default function SubjectLineGeneratorModal({ isOpen, onClose, emailContent }: SubjectLineGeneratorModalProps) {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<SubjectLineOption[]>([]);
  const [error, setError] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && emailContent && options.length === 0) {
      generateSubjectLines();
    }
  }, [isOpen, emailContent]);

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
        setOptions(data.options);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end pointer-events-none">
      {/* Backdrop with blur */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto" 
        onClick={onClose}
      />

      {/* Side Panel */}
      <div className="relative w-full max-w-md h-full bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-800 flex flex-col animate-in slide-in-from-right duration-300 pointer-events-auto">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-xl">✨</span> Smart Subject Lines
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              AI-generated options optimized for open rates
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-gray-900/50">
          {loading && options.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full space-y-6 text-center py-12">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-100 dark:border-blue-900/30 rounded-full"></div>
                <div className="absolute inset-0 w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-gray-900 dark:text-white text-lg">Generating Ideas...</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                  Analyzing your email content to create high-converting subject lines and preview text.
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-12">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 text-xl">
                ⚠️
              </div>
              <div>
                <p className="text-gray-900 dark:text-white font-medium mb-1">Generation Failed</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
                <button
                  onClick={generateSubjectLines}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {options.map((option, index) => (
                <div 
                  key={index}
                  className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200"
                >
                  {/* Badge & Score Row */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                      option.type.toLowerCase().includes('urgent') ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 ring-1 ring-red-500/10' :
                      option.type.toLowerCase().includes('benefit') ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 ring-1 ring-emerald-500/10' :
                      option.type.toLowerCase().includes('curiosity') ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300 ring-1 ring-purple-500/10' :
                      'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 ring-1 ring-blue-500/10'
                    }`}>
                      {option.type}
                    </span>
                    
                    {option.score > 0 && (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400" title="Predicted performance score">
                        <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span>{option.score}/100</span>
                      </div>
                    )}
                  </div>

                  {/* Subject Line */}
                  <div className="mb-3">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug">
                        {option.subject}
                      </h3>
                      <button
                        onClick={() => handleCopy(option.subject, index)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Copy subject line"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Preview Text */}
                  {option.preview_text && (
                    <div className="mb-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-100 dark:border-gray-700/50">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5 block">Preview Text</span>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{option.preview_text}</p>
                        </div>
                        <button
                          onClick={() => handleCopy(option.preview_text, index + 100)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-white dark:hover:bg-gray-800 rounded-md transition-colors opacity-0 group-hover:opacity-100 shadow-sm"
                          title="Copy preview text"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Explanation */}
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed italic border-l-2 border-gray-200 dark:border-gray-700 pl-3">
                    "{option.explanation}"
                  </p>
                </div>
              ))}

              <div className="pt-2 sticky bottom-0 pb-6 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent dark:from-gray-900 dark:via-gray-900">
                <button
                  onClick={generateSubjectLines}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 font-semibold text-sm"
                >
                  <svg className="w-4 h-4 animate-[spin_3s_linear_infinite]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Generate 5 New Ideas
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


