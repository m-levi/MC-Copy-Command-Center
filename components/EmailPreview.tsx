'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface EmailPreviewProps {
  content: string;
  isStarred?: boolean;
  onToggleStar?: () => void;
  isStarring?: boolean;
}

/**
 * Beautiful email preview component - displays email copy in a formatted, email-like view
 */
export default function EmailPreview({
  content,
  isStarred = false,
  onToggleStar,
  isStarring = false,
}: EmailPreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border shadow-sm overflow-hidden ${isStarred ? 'border-yellow-400 dark:border-yellow-500 ring-2 ring-yellow-200 dark:ring-yellow-900/30' : 'border-gray-200 dark:border-gray-700'}`}>
      {/* Email Header Bar */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Email Preview
            </span>
            {isStarred && (
              <span className="ml-2 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 text-xs font-semibold rounded-full flex items-center gap-1">
                <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                  <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                Starred
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Star Toggle - Click to star/unstar */}
            {onToggleStar && (
              <button
                onClick={onToggleStar}
                disabled={isStarring}
                className="p-2 text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-all cursor-pointer hover:scale-110 disabled:opacity-50"
                title={isStarred ? 'Click to unstar' : 'Click to star'}
              >
                {isStarred ? (
                  // Filled star - starred
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                ) : (
                  // Outline star - not starred
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                )}
              </button>
            )}
            
            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Copy email copy"
            >
              {copied ? (
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      </div>

      {/* Email Content */}
      <div className="p-6">
        <div className="prose prose-blue dark:prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Style headings like email headers
              h1: ({ node, ...props }) => (
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700" {...props} />
              ),
              h2: ({ node, ...props }) => (
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mt-6 mb-3" {...props} />
              ),
              h3: ({ node, ...props }) => (
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mt-4 mb-2" {...props} />
              ),
              // Style paragraphs
              p: ({ node, ...props }) => (
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4" {...props} />
              ),
              // Style lists
              ul: ({ node, ...props }) => (
                <ul className="space-y-2 mb-4 ml-4" {...props} />
              ),
              ol: ({ node, ...props }) => (
                <ol className="space-y-2 mb-4 ml-4" {...props} />
              ),
              li: ({ node, ...props }) => (
                <li className="text-gray-700 dark:text-gray-300" {...props} />
              ),
              // Style code/monospace (for CTAs, subject lines, etc.)
              code: ({ node, inline, ...props }: any) => 
                inline ? (
                  <code className="px-2 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 rounded text-sm font-semibold" {...props} />
                ) : (
                  <code className="block px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm overflow-x-auto" {...props} />
                ),
              // Style blockquotes (for emphasis)
              blockquote: ({ node, ...props }) => (
                <blockquote className="border-l-4 border-blue-500 dark:border-blue-400 pl-4 py-2 my-4 bg-blue-50/50 dark:bg-blue-950/20 italic text-gray-700 dark:text-gray-300" {...props} />
              ),
              // Style horizontal rules (section dividers)
              hr: ({ node, ...props }) => (
                <hr className="my-6 border-gray-300 dark:border-gray-600" {...props} />
              ),
              // Style strong/bold
              strong: ({ node, ...props }) => (
                <strong className="font-semibold text-gray-900 dark:text-gray-100" {...props} />
              ),
              // Style emphasis/italic
              em: ({ node, ...props }) => (
                <em className="italic text-gray-800 dark:text-gray-200" {...props} />
              ),
              // Style links
              a: ({ node, ...props }) => (
                <a className="text-blue-600 dark:text-blue-400 hover:underline" {...props} />
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>

      {/* Footer Note */}
      {isStarred && (
        <div className="bg-yellow-50 dark:bg-yellow-950/20 border-t border-yellow-200 dark:border-yellow-800 px-4 py-2">
          <div className="flex items-center gap-2 text-xs text-yellow-800 dark:text-yellow-200">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <span>
              This email is saved as a reference example to improve future AI generations
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact email preview for starred emails list
 */
export function CompactEmailPreview({
  content,
  timestamp,
  onUnstar,
  onClick,
}: {
  content: string;
  timestamp: string;
  onUnstar: () => void;
  onClick: () => void;
}) {
  // Extract first line as title
  const firstLine = content.split('\n')[0].replace(/^#+\s*/, '').substring(0, 60);
  const preview = content.substring(0, 150).replace(/\n/g, ' ');

  return (
    <div 
      onClick={onClick}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-colors cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-yellow-500 fill-current flex-shrink-0" viewBox="0 0 24 24">
              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {firstLine}
            </h4>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
            {preview}...
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {new Date(timestamp).toLocaleDateString()} at {new Date(timestamp).toLocaleTimeString()}
          </div>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUnstar();
          }}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors opacity-0 group-hover:opacity-100"
          title="Remove from favorites"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

