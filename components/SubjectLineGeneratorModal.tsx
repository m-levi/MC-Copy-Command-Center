'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface SubjectLineOption {
  subject: string;
  tone: string;
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
        throw new Error('Failed to generate subject lines');
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

  const handleCopy = async (subject: string, index: number) => {
    await navigator.clipboard.writeText(subject);
    setCopiedIndex(index);
    toast.success('Subject line copied!');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-xl">✨</span> Smart Subject Lines
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              AI-generated options based on your email copy
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 min-h-[300px]">
          {loading && options.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4 text-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Analyzing email copy...</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Generating high-converting subject lines</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 text-xl">
                ⚠️
              </div>
              <div>
                <p className="text-gray-900 dark:text-white font-medium mb-1">Something went wrong</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
                <button
                  onClick={generateSubjectLines}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {options.map((option, index) => (
                <div 
                  key={index}
                  className="group relative p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-200"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                          option.tone.toLowerCase().includes('urgent') ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                          option.tone.toLowerCase().includes('benefit') ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                          option.tone.toLowerCase().includes('curiosity') ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        }`}>
                          {option.tone}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1 pr-8">
                        {option.subject}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        {option.explanation}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => handleCopy(option.subject, index)}
                      className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
                        copiedIndex === index 
                          ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' 
                          : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:hover:text-blue-400'
                      }`}
                      title="Copy to clipboard"
                    >
                      {copiedIndex === index ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={generateSubjectLines}
                className="w-full py-3 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Generate New Ideas
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

