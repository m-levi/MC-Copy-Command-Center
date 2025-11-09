'use client';

import { useState } from 'react';

interface ProductLink {
  name: string;
  url: string;
  description?: string;
}

interface EmailPreviewProps {
  content: string;
  isStarred?: boolean;
  onToggleStar?: () => void;
  isStarring?: boolean;
  productLinks?: ProductLink[];
}

/**
 * Remove URLs from email content (they'll be shown in the product links section)
 */
function stripURLsFromContent(content: string): string {
  // Remove standalone URLs (on their own line or after content)
  let cleaned = content.replace(/https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi, '');
  
  // Clean up any extra whitespace left behind
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/[ \t]+$/gm, ''); // Remove trailing spaces
  
  return cleaned.trim();
}

/**
 * Beautiful email preview component - displays email copy in a formatted, email-like view
 * Now includes integrated product links section
 */
export default function EmailPreview({
  content,
  isStarred = false,
  onToggleStar,
  isStarring = false,
  productLinks = [],
}: EmailPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [showProductLinks, setShowProductLinks] = useState(true);

  // Strip URLs from content (they'll be in the product links section)
  const cleanContent = stripURLsFromContent(content);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(cleanContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border shadow-sm overflow-hidden ${isStarred ? 'border-yellow-400 dark:border-yellow-500 ring-1 ring-yellow-200 dark:ring-yellow-900/30' : 'border-gray-200 dark:border-gray-700'}`}>
      {/* Email Header Bar - Compact & Clean */}
      <div className="bg-gray-50 dark:bg-gray-800/50 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Email Copy
            </span>
            {isStarred && (
              <svg className="w-3.5 h-3.5 text-yellow-500 fill-current ml-0.5" viewBox="0 0 24 24">
                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {/* Star Toggle */}
            {onToggleStar && (
              <button
                onClick={onToggleStar}
                disabled={isStarring}
                className="p-1.5 text-gray-500 hover:text-yellow-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                title={isStarred ? 'Unstar' : 'Star this email'}
              >
                {isStarred ? (
                  <svg className="w-4 h-4 fill-current text-yellow-500" viewBox="0 0 24 24">
                    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                )}
              </button>
            )}
            
            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors cursor-pointer"
              title="Copy to clipboard"
            >
              {copied ? (
                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Email Content - Clean Code Block Style */}
      <div className="p-4">
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700 p-4 font-mono text-sm overflow-hidden">
          <pre className="whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200 leading-relaxed">
            {cleanContent}
          </pre>
        </div>
      </div>

      {/* Product Links Section - Integrated & Toggleable */}
      {productLinks.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowProductLinks(!showProductLinks)}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded">
                <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Product Links ({productLinks.length})
              </span>
            </div>
            <svg 
              className={`w-4 h-4 text-gray-500 transition-transform ${showProductLinks ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showProductLinks && (
            <div className="px-4 pb-4 space-y-2">
              {productLinks.map((product, index) => {
                if (!product?.url || !product?.name) return null;
                
                return (
                  <a
                    key={index}
                    href={product.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-150 group"
                  >
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded flex-shrink-0 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/40 transition-colors">
                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                        {product.name}
                      </div>
                      {product.description && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1 mt-0.5">
                          {product.description}
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium mt-1 group-hover:underline">
                        <span className="truncate font-mono">
                          {product.url.replace(/^https?:\/\/(www\.)?/, '')}
                        </span>
                        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Footer Note - Compact */}
      {isStarred && (
        <div className="bg-yellow-50 dark:bg-yellow-950/20 border-t border-yellow-200 dark:border-yellow-800 px-3 py-1.5">
          <div className="flex items-center gap-1.5 text-xs text-yellow-700 dark:text-yellow-300">
            <svg className="w-3 h-3 fill-current flex-shrink-0" viewBox="0 0 24 24">
              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <span>Saved as reference example</span>
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
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
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

