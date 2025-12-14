'use client';

import { useState, useMemo, useCallback, memo } from 'react';
import { cn } from '@/lib/utils';
import {
  parseEmailVersions,
  getContentBeforeVersions,
  getContentAfterVersions,
  getStreamingVersionContent,
  EmailVersion,
} from '@/lib/email-version-parser';
import StructuredEmailRenderer, { isStructuredEmailCopy } from './StructuredEmailRenderer';
import { CopyIcon, CheckIcon, SparklesIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface EmailVersionRendererProps {
  content: string;
  remarkPlugins?: any[];
  markdownComponents?: Components;
  isStreaming?: boolean;
}

export const EmailVersionRenderer = memo(function EmailVersionRenderer({
  content,
  remarkPlugins = [],
  markdownComponents,
  isStreaming = false,
}: EmailVersionRendererProps) {
  const [selectedVersion, setSelectedVersion] = useState<'a' | 'b' | 'c'>('a');
  const [copiedAll, setCopiedAll] = useState(false);

  // Parse the email versions from the content
  const parsed = useMemo(() => parseEmailVersions(content), [content]);
  
  // Get content before/after versions for context
  const beforeContent = useMemo(() => getContentBeforeVersions(content), [content]);
  const afterContent = useMemo(() => getContentAfterVersions(content), [content]);

  // Get current version content (handling streaming)
  const currentVersion = useMemo(() => {
    const version = parsed.versions.find(v => v.id === selectedVersion);
    if (version) return version;
    
    // If streaming and the version isn't complete, try to get partial content
    if (isStreaming) {
      const streamingContent = getStreamingVersionContent(content, selectedVersion);
      if (streamingContent) {
        return {
          id: selectedVersion,
          label: `Version ${selectedVersion.toUpperCase()}`,
          content: streamingContent,
        } as EmailVersion;
      }
    }
    
    // Fallback to first available version
    return parsed.versions[0] || null;
  }, [parsed.versions, selectedVersion, isStreaming, content]);

  // Handle copy
  const handleCopyAll = useCallback(async () => {
    if (!currentVersion) return;
    const cleanContent = currentVersion.content
      .replace(/^```\n?/gm, '')
      .replace(/\n?```$/gm, '')
      .trim();
    await navigator.clipboard.writeText(cleanContent);
    setCopiedAll(true);
    toast.success('Copied!');
    setTimeout(() => setCopiedAll(false), 2000);
  }, [currentVersion]);

  // If no versions found, render as regular markdown
  if (!parsed.hasVersions) {
    return (
      <div className="prose dark:prose-invert max-w-none px-4 sm:px-6">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm, ...remarkPlugins]}
          components={markdownComponents}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  }

  // Check if current version content is structured email
  const isStructured = currentVersion && isStructuredEmailCopy(currentVersion.content);

  return (
    <div className="space-y-4">
      {/* Before content (intro from AI) */}
      {beforeContent && (
        <div className="px-4 sm:px-6">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm, ...remarkPlugins]}
            components={markdownComponents}
          >
            {beforeContent}
          </ReactMarkdown>
        </div>
      )}

      {/* Version Selector */}
      <div className="px-4 sm:px-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Copy Options:</span>
            <div className="flex gap-1">
              {parsed.versions.map((version) => (
                <button
                  key={version.id}
                  onClick={() => setSelectedVersion(version.id)}
                  className={cn(
                    'w-9 h-9 rounded-lg text-sm font-bold transition-all',
                    selectedVersion === version.id
                      ? 'bg-blue-500 text-white shadow-md scale-105'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  )}
                >
                  {version.id.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          
          <button
            onClick={handleCopyAll}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              copiedAll
                ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            )}
          >
            {copiedAll ? (
              <>
                <CheckIcon className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <CopyIcon className="w-4 h-4" />
                Copy All
              </>
            )}
          </button>
        </div>
      </div>

      {/* Version Content */}
      {currentVersion && (
        <div className="px-4 sm:px-6">
          {/* Approach Note */}
          {currentVersion.note && (
            <div className="mb-4 px-4 py-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg border-l-4 border-violet-400">
              <div className="flex items-center gap-2 mb-1">
                <SparklesIcon className="w-4 h-4 text-violet-500" />
                <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide">
                  Approach
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">{currentVersion.note}</p>
            </div>
          )}

          {/* Email Content */}
          {isStructured ? (
            <StructuredEmailRenderer
              content={currentVersion.content}
              onCopy={() => toast.success('Copied to clipboard!')}
            />
          ) : (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
              <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono leading-relaxed">
                {currentVersion.content}
              </pre>
            </div>
          )}

          {/* Streaming indicator */}
          {isStreaming && (
            <div className="mt-4 flex items-center gap-2 text-blue-500">
              <div className="flex gap-0.5">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-sm">Writing...</span>
            </div>
          )}
        </div>
      )}

      {/* After content (outro from AI) */}
      {afterContent && !isStreaming && (
        <div className="px-4 sm:px-6 pt-4 border-t border-gray-200 dark:border-gray-800">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm, ...remarkPlugins]}
            components={markdownComponents}
          >
            {afterContent}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
});

export default EmailVersionRenderer;
