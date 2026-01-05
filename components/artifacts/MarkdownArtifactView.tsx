'use client';

import { useState, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motion } from 'framer-motion';
import {
  CopyIcon,
  CheckIcon,
  FileTextIcon,
  DownloadIcon,
  ListIcon,
  BookOpenIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { MarkdownArtifactMetadata } from '@/types/artifacts';

interface MarkdownArtifactViewProps {
  content: string;
  title: string;
  metadata?: MarkdownArtifactMetadata;
  className?: string;
  isStreaming?: boolean;
}

/**
 * Extract table of contents from markdown content
 */
function extractTOC(content: string): Array<{ level: number; text: string; id: string }> {
  const headings: Array<{ level: number; text: string; id: string }> = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/[*_`]/g, '').trim();
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      headings.push({ level, text, id });
    }
  }

  return headings;
}

/**
 * Format badge for document type
 */
const FORMAT_STYLES: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  article: { icon: BookOpenIcon, label: 'Article', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400' },
  notes: { icon: ListIcon, label: 'Notes', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400' },
  documentation: { icon: FileTextIcon, label: 'Documentation', color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/30 dark:text-purple-400' },
};

/**
 * Markdown Artifact View - Renders rich markdown content with syntax highlighting
 */
export function MarkdownArtifactView({
  content,
  title,
  metadata,
  className = '',
  isStreaming = false,
}: MarkdownArtifactViewProps) {
  const [copied, setCopied] = useState(false);
  const [showTOC, setShowTOC] = useState(false);

  const toc = useMemo(() => extractTOC(content), [content]);
  const format = metadata?.format || 'article';
  const formatStyle = FORMAT_STYLES[format] || FORMAT_STYLES.article;
  const FormatIcon = formatStyle.icon;

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Downloaded!');
  }, [content, title]);

  return (
    <div className={`rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900/50 dark:to-gray-900/50 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-500 to-gray-600 flex items-center justify-center shadow-sm">
            <FileTextIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
              {title}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${formatStyle.color}`}>
                <FormatIcon className="w-3 h-3" />
                {formatStyle.label}
              </span>
              {isStreaming && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Writing...
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {toc.length > 2 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowTOC(!showTOC)}
              className={`p-2 rounded-lg transition-colors ${
                showTOC
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title="Table of Contents"
            >
              <ListIcon className="w-4 h-4" />
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDownload}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="Download as Markdown"
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
            title="Copy content"
          >
            {copied ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
          </motion.button>
        </div>
      </div>

      {/* Table of Contents */}
      {showTOC && toc.length > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700"
        >
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Contents</p>
          <nav className="space-y-1">
            {toc.map((heading, i) => (
              <a
                key={i}
                href={`#${heading.id}`}
                className="block text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                style={{ paddingLeft: `${(heading.level - 1) * 12}px` }}
              >
                {heading.text}
              </a>
            ))}
          </nav>
        </motion.div>
      )}

      {/* Content */}
      <div className="p-5 bg-white dark:bg-gray-900/50">
        <article className="prose prose-sm dark:prose-invert max-w-none prose-headings:scroll-mt-4 prose-a:text-blue-600 prose-code:text-pink-600 dark:prose-code:text-pink-400 prose-pre:bg-transparent prose-pre:p-0">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children, ...props }) => {
                const id = String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-');
                return <h1 id={id} {...props}>{children}</h1>;
              },
              h2: ({ children, ...props }) => {
                const id = String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-');
                return <h2 id={id} {...props}>{children}</h2>;
              },
              h3: ({ children, ...props }) => {
                const id = String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-');
                return <h3 id={id} {...props}>{children}</h3>;
              },
              code({ className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const isInline = !match;

                if (isInline) {
                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                }

                return (
                  <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                    className="rounded-lg !my-4"
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                );
              },
              a: ({ href, children, ...props }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                  {children}
                </a>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </article>

        {/* Streaming cursor */}
        {isStreaming && (
          <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1" />
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {content.split(/\s+/).length} words • {content.length} characters
        </p>
      </div>
    </div>
  );
}

export default MarkdownArtifactView;
