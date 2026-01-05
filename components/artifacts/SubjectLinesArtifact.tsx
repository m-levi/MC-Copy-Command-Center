'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CopyIcon, 
  CheckIcon, 
  SparklesIcon,
  MailIcon,
  TypeIcon,
  ChevronRightIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Subject line option structure
 */
export interface SubjectLineOption {
  subject: string;
  preview?: string;
  style?: string;
  emoji?: boolean;
}

interface SubjectLinesArtifactProps {
  options: SubjectLineOption[];
  className?: string;
  onSelect?: (option: SubjectLineOption, index: number) => void;
}

/**
 * Style colors for visual differentiation
 */
const STYLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'curiosity': { bg: 'bg-purple-50 dark:bg-purple-950/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  'urgency': { bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800' },
  'benefit': { bg: 'bg-green-50 dark:bg-green-950/30', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800' },
  'benefit-focused': { bg: 'bg-green-50 dark:bg-green-950/30', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800' },
  'personal': { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  'question': { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  'social proof': { bg: 'bg-indigo-50 dark:bg-indigo-950/30', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800' },
  'exclusive': { bg: 'bg-pink-50 dark:bg-pink-950/30', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-200 dark:border-pink-800' },
  'direct': { bg: 'bg-gray-50 dark:bg-gray-800/50', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700' },
  'playful': { bg: 'bg-orange-50 dark:bg-orange-950/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800' },
  'fomo': { bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800' },
  'default': { bg: 'bg-violet-50 dark:bg-violet-950/30', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-200 dark:border-violet-800' },
};

function getStyleColors(style?: string) {
  if (!style) return STYLE_COLORS.default;
  const normalized = style.toLowerCase();
  return STYLE_COLORS[normalized] || STYLE_COLORS.default;
}

/**
 * Subject Lines Artifact - Displays subject line options in a beautiful card layout
 */
export function SubjectLinesArtifact({
  options,
  className = '',
  onSelect,
}: SubjectLinesArtifactProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleCopy = useCallback(async (option: SubjectLineOption, index: number) => {
    const text = option.preview 
      ? `Subject: ${option.subject}\nPreview: ${option.preview}`
      : option.subject;
    
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success('Copied to clipboard!');
    
    setTimeout(() => setCopiedIndex(null), 2000);
  }, []);

  const handleSelect = useCallback((option: SubjectLineOption, index: number) => {
    setSelectedIndex(index);
    onSelect?.(option, index);
  }, [onSelect]);

  if (options.length === 0) {
    return null;
  }

  return (
    <div className={`rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border-b border-violet-200/50 dark:border-violet-800/30">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
          <TypeIcon className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
            Subject Line Options
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {options.length} options generated
          </p>
        </div>
      </div>

      {/* Options */}
      <div className="p-4 space-y-3 bg-white/50 dark:bg-gray-900/50">
        {options.map((option, index) => {
          const colors = getStyleColors(option.style);
          const isCopied = copiedIndex === index;
          const isSelected = selectedIndex === index;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`group relative rounded-xl border-2 transition-all cursor-pointer ${
                isSelected 
                  ? 'border-violet-400 dark:border-violet-500 bg-violet-50/50 dark:bg-violet-900/20' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800/50'
              }`}
              onClick={() => handleSelect(option, index)}
            >
              {/* Number badge */}
              <div className="absolute -left-2 -top-2 w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                {index + 1}
              </div>

              <div className="p-4 pl-6">
                {/* Subject line */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="font-medium text-gray-900 dark:text-white text-sm leading-relaxed flex-1">
                    {option.subject}
                  </p>
                  
                  {/* Copy button */}
                  <motion.button
                    onClick={(e) => { e.stopPropagation(); handleCopy(option, index); }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
                      isCopied 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {isCopied ? (
                      <CheckIcon className="w-4 h-4" />
                    ) : (
                      <CopyIcon className="w-4 h-4" />
                    )}
                  </motion.button>
                </div>

                {/* Preview text */}
                {option.preview && (
                  <div className="flex items-start gap-2 mb-3">
                    <MailIcon className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      {option.preview}
                    </p>
                  </div>
                )}

                {/* Style badge */}
                {option.style && (
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${colors.bg} ${colors.text}`}>
                      <SparklesIcon className="w-3 h-3" />
                      {option.style}
                    </span>
                    {option.emoji && (
                      <span className="text-[11px] text-gray-400">• Uses emoji</span>
                    )}
                    <span className="text-[11px] text-gray-400">
                      • {option.subject.length} chars
                    </span>
                  </div>
                )}
              </div>

              {/* Selected indicator */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                      <CheckIcon className="w-3.5 h-3.5 text-white" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Footer hint */}
      <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800">
        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
          <ChevronRightIcon className="w-3 h-3" />
          Click to select • Ask me to refine any option
        </p>
      </div>
    </div>
  );
}

/**
 * Parse subject lines from AI response content
 * Handles various formats the AI might use
 */
export function parseSubjectLinesFromContent(content: string): SubjectLineOption[] {
  const options: SubjectLineOption[] = [];
  
  // Try to parse numbered list format
  // Matches: 1. "Subject" / Preview: "..." / Style: ...
  const numberedPattern = /\d+\.\s*(?:[""])?([^"""\n]+)(?:[""])?\s*(?:\n\s*(?:Preview(?:\s*text)?:?\s*)?(?:[""])?([^"""\n]*)(?:[""])?)?\s*(?:\n\s*(?:Style|Approach|Type):?\s*([^\n]*))?/gi;
  
  let match;
  while ((match = numberedPattern.exec(content)) !== null) {
    const subject = match[1]?.trim();
    if (subject && subject.length > 5) { // Filter out very short matches
      options.push({
        subject,
        preview: match[2]?.trim() || undefined,
        style: match[3]?.trim()?.replace(/[*_`]/g, '') || undefined,
        emoji: /[\u{1F300}-\u{1F9FF}]/u.test(subject),
      });
    }
  }

  // If numbered pattern didn't work, try simpler bullet/line format
  if (options.length === 0) {
    const lines = content.split('\n').filter(l => l.trim());
    
    for (const line of lines) {
      // Skip lines that look like headers or explanations
      if (line.match(/^(here|these|subject|preview|style|option|\d+\.|##|###)/i)) continue;
      if (line.length < 10 || line.length > 200) continue;
      
      // Clean up the line
      let subject = line
        .replace(/^[-*•]\s*/, '') // Remove bullet points
        .replace(/^[""]|[""]$/g, '') // Remove quotes
        .trim();
      
      if (subject && !subject.includes(':')) {
        options.push({
          subject,
          emoji: /[\u{1F300}-\u{1F9FF}]/u.test(subject),
        });
      }
    }
  }

  return options.slice(0, 10); // Limit to 10 options max
}

export default SubjectLinesArtifact;























