'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  ZapIcon, 
  CopyIcon, 
  CheckIcon, 
  ChevronDownIcon, 
  SparklesIcon, 
  RefreshCwIcon, 
  MailOpenIcon,
  LightbulbIcon,
  InfoIcon
} from 'lucide-react';

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

// Get badge style based on type
function getTypeBadgeStyle(type: string) {
  const t = type.toLowerCase();
  if (t.includes('curiosity')) {
    return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400';
  }
  if (t.includes('open loop')) {
    return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
  }
  if (t.includes('pattern') || t.includes('interrupt')) {
    return 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400';
  }
  if (t.includes('benefit')) {
    return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400';
  }
  if (t.includes('short') || t.includes('ultra')) {
    return 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400';
  }
  return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
}

// Get icon based on type
function getTypeIcon(type: string) {
  const t = type.toLowerCase();
  if (t.includes('curiosity')) return '🤔';
  if (t.includes('open loop')) return '🔄';
  if (t.includes('pattern') || t.includes('interrupt')) return '⚡';
  if (t.includes('benefit')) return '✨';
  if (t.includes('short') || t.includes('ultra')) return '💥';
  return '📧';
}

export default function SubjectLineGeneratorInline({ emailContent, isVisible = false }: SubjectLineGeneratorInlineProps) {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<SubjectLineOption[]>([]);
  const [error, setError] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showExplanation, setShowExplanation] = useState<number | null>(null);

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

  const handleCopyBoth = async (subject: string, preview: string, index: number) => {
    const combined = `Subject: ${subject}\nPreview: ${preview}`;
    await navigator.clipboard.writeText(combined);
    setCopiedIndex(index + 1000);
    toast.success('Subject + preview copied!');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Collapsed state - Clean pill button
  if (!expanded) {
    return (
      <div className="pt-3">
        <button
          onClick={() => {
            setExpanded(true);
            if (options.length === 0) generateSubjectLines();
          }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-transparent hover:border-gray-300 dark:hover:border-gray-600 group"
        >
          <ZapIcon className="w-3.5 h-3.5 text-amber-500" />
          <span>{options.length > 0 ? `Subject Lines` : 'Generate Subject Lines'}</span>
          {options.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
              {options.length}
            </span>
          )}
          <ChevronDownIcon className="w-3 h-3 opacity-50" />
        </button>
      </div>
    );
  }

  // Expanded state
  return (
    <div className="pt-3 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setExpanded(false)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 transition-colors"
        >
          <ZapIcon className="w-3.5 h-3.5" />
          <span>Subject Lines</span>
          {options.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-200/60 dark:bg-amber-800/40 text-[10px] font-bold">
              {options.length}
            </span>
          )}
          <ChevronDownIcon className="w-3 h-3 rotate-180 opacity-60" />
        </button>
        
        {options.length > 0 && (
          <button
            onClick={generateSubjectLines}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-gray-500 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors disabled:opacity-50"
          >
            <RefreshCwIcon className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Generating...' : 'Generate More'}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800/40">
        {loading && options.length === 0 ? (
          <div className="py-10 flex flex-col items-center text-center px-4">
            <div className="relative mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center">
                <LightbulbIcon className="w-6 h-6 text-amber-500" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white dark:bg-gray-800 border-2 border-amber-400 flex items-center justify-center">
                <SparklesIcon className="w-3 h-3 text-amber-500 animate-pulse" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Creating irresistible subject lines...</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Crafting curiosity hooks that demand opens</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center px-4">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-3">
              <span className="text-red-500 text-lg">!</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{error}</p>
            <button
              onClick={generateSubjectLines}
              className="text-sm font-medium text-amber-600 dark:text-amber-400 hover:underline"
            >
              Try Again
            </button>
          </div>
        ) : options.length === 0 ? (
          <button
            onClick={generateSubjectLines}
            className="w-full py-8 px-4 flex flex-col items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center">
              <ZapIcon className="w-6 h-6 text-amber-500" />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Generate Subject Lines</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">AI-crafted hooks that drive opens</span>
          </button>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {options.map((option, index) => (
              <div 
                key={index} 
                className="group p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                {/* Type badge row */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full ${getTypeBadgeStyle(option.type)}`}>
                    <span>{getTypeIcon(option.type)}</span>
                    {option.type}
                  </span>
                  {option.score > 0 && (
                    <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                      {option.score}% predicted open rate
                    </span>
                  )}
                </div>
                
                {/* Subject line - main content */}
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-medium text-gray-900 dark:text-white leading-snug">
                      {option.subject}
                    </p>
                    
                    {/* Preview text */}
                    {option.preview_text && (
                      <div className="mt-1.5 flex items-start gap-1.5">
                        <MailOpenIcon className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                          {option.preview_text}
                        </p>
                      </div>
                    )}

                    {/* Explanation - toggle on click */}
                    {option.explanation && (
                      <button
                        onClick={() => setShowExplanation(showExplanation === index ? null : index)}
                        className="mt-2 inline-flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        <InfoIcon className="w-3 h-3" />
                        {showExplanation === index ? 'Hide why this works' : 'Why this works'}
                      </button>
                    )}
                    
                    {showExplanation === index && option.explanation && (
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-2 animate-in fade-in duration-150">
                        {option.explanation}
                      </p>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleCopy(option.subject, index)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                      title="Copy subject line"
                    >
                      {copiedIndex === index ? (
                        <CheckIcon className="w-4 h-4 text-green-500" />
                      ) : (
                        <CopyIcon className="w-4 h-4" />
                      )}
                    </button>
                    {option.preview_text && (
                      <button
                        onClick={() => handleCopyBoth(option.subject, option.preview_text, index)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        title="Copy subject + preview"
                      >
                        {copiedIndex === index + 1000 ? (
                          <CheckIcon className="w-4 h-4 text-green-500" />
                        ) : (
                          <MailOpenIcon className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
