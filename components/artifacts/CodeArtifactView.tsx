'use client';

import { useState, useCallback, useMemo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motion } from 'framer-motion';
import {
  CopyIcon,
  CheckIcon,
  CodeIcon,
  DownloadIcon,
  FileIcon,
  WrapTextIcon,
  HashIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { CodeArtifactMetadata } from '@/types/artifacts';

interface CodeArtifactViewProps {
  content: string;
  title: string;
  language: string;
  filename?: string;
  description?: string;
  metadata?: CodeArtifactMetadata;
  className?: string;
  isStreaming?: boolean;
}

/**
 * Language display names and file extensions
 */
const LANGUAGE_CONFIG: Record<string, { name: string; extension: string; color: string }> = {
  javascript: { name: 'JavaScript', extension: 'js', color: 'bg-yellow-400 text-yellow-900' },
  typescript: { name: 'TypeScript', extension: 'ts', color: 'bg-blue-500 text-white' },
  python: { name: 'Python', extension: 'py', color: 'bg-green-500 text-white' },
  java: { name: 'Java', extension: 'java', color: 'bg-red-500 text-white' },
  rust: { name: 'Rust', extension: 'rs', color: 'bg-orange-600 text-white' },
  go: { name: 'Go', extension: 'go', color: 'bg-cyan-500 text-white' },
  ruby: { name: 'Ruby', extension: 'rb', color: 'bg-red-600 text-white' },
  php: { name: 'PHP', extension: 'php', color: 'bg-purple-500 text-white' },
  swift: { name: 'Swift', extension: 'swift', color: 'bg-orange-500 text-white' },
  kotlin: { name: 'Kotlin', extension: 'kt', color: 'bg-purple-600 text-white' },
  cpp: { name: 'C++', extension: 'cpp', color: 'bg-blue-600 text-white' },
  c: { name: 'C', extension: 'c', color: 'bg-gray-600 text-white' },
  csharp: { name: 'C#', extension: 'cs', color: 'bg-green-600 text-white' },
  html: { name: 'HTML', extension: 'html', color: 'bg-orange-500 text-white' },
  css: { name: 'CSS', extension: 'css', color: 'bg-blue-400 text-white' },
  sql: { name: 'SQL', extension: 'sql', color: 'bg-amber-500 text-white' },
  json: { name: 'JSON', extension: 'json', color: 'bg-gray-500 text-white' },
  yaml: { name: 'YAML', extension: 'yaml', color: 'bg-pink-500 text-white' },
  markdown: { name: 'Markdown', extension: 'md', color: 'bg-gray-700 text-white' },
  bash: { name: 'Bash', extension: 'sh', color: 'bg-gray-800 text-white' },
  shell: { name: 'Shell', extension: 'sh', color: 'bg-gray-800 text-white' },
  tsx: { name: 'TSX', extension: 'tsx', color: 'bg-blue-500 text-white' },
  jsx: { name: 'JSX', extension: 'jsx', color: 'bg-yellow-400 text-yellow-900' },
};

function getLanguageConfig(lang: string) {
  const normalized = lang.toLowerCase();
  return LANGUAGE_CONFIG[normalized] || { name: lang, extension: lang, color: 'bg-gray-500 text-white' };
}

/**
 * Code Artifact View - Syntax highlighted code with line numbers
 */
export function CodeArtifactView({
  content,
  title,
  language,
  filename,
  description,
  metadata,
  className = '',
  isStreaming = false,
}: CodeArtifactViewProps) {
  const [copied, setCopied] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [wordWrap, setWordWrap] = useState(false);

  const langConfig = useMemo(() => getLanguageConfig(language), [language]);
  const lineCount = useMemo(() => content.split('\n').length, [content]);
  const displayFilename = filename || `${title.toLowerCase().replace(/\s+/g, '-')}.${langConfig.extension}`;

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = displayFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Downloaded!');
  }, [content, displayFilename]);

  return (
    <div className={`rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm">
            <CodeIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                {title}
              </h3>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${langConfig.color}`}>
                {langConfig.name}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <FileIcon className="w-3 h-3" />
                {displayFilename}
              </span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {lineCount} lines
              </span>
              {isStreaming && (
                <>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Writing...
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            className={`p-2 rounded-lg transition-colors ${
              showLineNumbers
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            title={showLineNumbers ? 'Hide line numbers' : 'Show line numbers'}
          >
            <HashIcon className="w-4 h-4" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setWordWrap(!wordWrap)}
            className={`p-2 rounded-lg transition-colors ${
              wordWrap
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            title={wordWrap ? 'Disable word wrap' : 'Enable word wrap'}
          >
            <WrapTextIcon className="w-4 h-4" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDownload}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="Download file"
          >
            <DownloadIcon className="w-4 h-4" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCopy}
            className={`p-2 rounded-lg transition-colors ${
              copied
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            title="Copy code"
          >
            {copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
          </motion.button>
        </div>
      </div>

      {/* Description */}
      {description && (
        <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
        </div>
      )}

      {/* Code */}
      <div className={`bg-[#282c34] ${wordWrap ? '' : 'overflow-x-auto'}`}>
        <SyntaxHighlighter
          language={language}
          style={oneDark}
          showLineNumbers={showLineNumbers}
          wrapLines={wordWrap}
          wrapLongLines={wordWrap}
          customStyle={{
            margin: 0,
            padding: '1rem 1.25rem',
            background: 'transparent',
            fontSize: '13px',
            lineHeight: '1.6',
          }}
          lineNumberStyle={{
            minWidth: '2.5em',
            paddingRight: '1em',
            color: '#636d83',
            userSelect: 'none',
          }}
        >
          {content}
        </SyntaxHighlighter>

        {/* Streaming cursor */}
        {isStreaming && (
          <div className="px-5 pb-4">
            <span className="inline-block w-2 h-4 bg-amber-500 animate-pulse" />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {content.length} characters • {content.split(/\s+/).filter(Boolean).length} tokens (approx)
        </p>
      </div>
    </div>
  );
}

export default CodeArtifactView;
