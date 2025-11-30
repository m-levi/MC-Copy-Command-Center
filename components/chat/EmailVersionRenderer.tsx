'use client';

import { memo, useState, useCallback, useMemo } from 'react';
import { parseEmailVersions, ParsedEmailVersions, EmailVersion, hasEmailVersionMarkers, getStreamingVersionContent, getContentBeforeVersions, getContentAfterVersions } from '@/lib/email-version-parser';
import { isStructuredEmailCopy } from '@/lib/email-copy-parser';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { ChevronLeftIcon, ChevronRightIcon, MailIcon, CopyIcon, CheckIcon } from 'lucide-react';
import StructuredEmailRenderer from './StructuredEmailRenderer';
import toast from 'react-hot-toast';

interface EmailVersionRendererProps {
  content: string;
  className?: string;
  // Allow custom markdown components to be passed through
  markdownComponents?: Record<string, React.ComponentType<any>>;
  // Allow custom remark plugins
  remarkPlugins?: any[];
  // Is the content still streaming?
  isStreaming?: boolean;
}

/**
 * Version navigation with chevrons and label - styled like AIReasoning
 */
const VersionNavigator = memo(function VersionNavigator({
  versions,
  activeIndex,
  onPrevious,
  onNext,
  onSelect,
  onCopy,
  copiedId,
  position = 'top',
}: {
  versions: EmailVersion[];
  activeIndex: number;
  onPrevious: () => void;
  onNext: () => void;
  onSelect: (index: number) => void;
  onCopy: (version: EmailVersion) => void;
  copiedId: string | null;
  position?: 'top' | 'bottom';
}) {
  const activeVersion = versions[activeIndex];
  const canGoPrevious = activeIndex > 0;
  const canGoNext = activeIndex < versions.length - 1;

  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-3',
        position === 'top' 
          ? 'border-b border-gray-200 dark:border-gray-700' 
          : 'border-t border-gray-200 dark:border-gray-700'
      )}
    >
      {/* Left: Version label with note */}
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="flex items-center gap-2.5">
          {/* Version badges */}
          <div className="flex items-center gap-1">
            {versions.map((v, idx) => (
              <button
                key={v.id}
                onClick={() => onSelect(idx)}
                className={cn(
                  'w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold transition-all duration-200',
                  idx === activeIndex
                    ? 'bg-blue-500 dark:bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                )}
              >
                {v.id.toUpperCase()}
              </button>
            ))}
          </div>
          
          <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {activeVersion?.label}
          </span>
        </div>
        
        {/* Approach note */}
        {activeVersion?.note && (
          <span className="hidden sm:block text-[10px] text-gray-400 dark:text-gray-500 italic truncate max-w-[250px]" title={activeVersion.note}>
            — {activeVersion.note}
          </span>
        )}
      </div>

      {/* Right: Copy button and Navigation arrows */}
      <div className="flex items-center gap-2">
        {/* Copy button */}
        {activeVersion && (
          <button
            onClick={() => onCopy(activeVersion)}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors',
              copiedId === activeVersion.id
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
            )}
            title={`Copy Version ${activeVersion.id.toUpperCase()}`}
          >
            {copiedId === activeVersion.id ? (
              <>
                <CheckIcon className="w-3.5 h-3.5" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <CopyIcon className="w-3.5 h-3.5" />
                <span>Copy {activeVersion.id.toUpperCase()}</span>
              </>
            )}
          </button>
        )}
        
        {/* Divider */}
        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
        
        {/* Navigation arrows */}
        <div className="flex items-center gap-1">
          <button
            onClick={onPrevious}
            disabled={!canGoPrevious}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              canGoPrevious
                ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
                : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
            )}
            title="Previous version"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <button
            onClick={onNext}
            disabled={!canGoNext}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              canGoNext
                ? 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
                : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
            )}
            title="Next version"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
});

/**
 * Main component that renders email content with version switching
 */
export const EmailVersionRenderer = memo(function EmailVersionRenderer({
  content,
  className,
  markdownComponents = {},
  remarkPlugins = [],
  isStreaming = false,
}: EmailVersionRendererProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Parse the content for versions
  const parsed = useMemo(() => parseEmailVersions(content), [content]);
  
  // Check if we have complete version tags (both open and close)
  const hasCompleteVersionA = useMemo(() => 
    content.includes('<version_a>') && content.includes('</version_a>'), 
    [content]
  );
  const hasCompleteVersionB = useMemo(() => 
    content.includes('<version_b>') && content.includes('</version_b>'), 
    [content]
  );
  const hasCompleteVersionC = useMemo(() => 
    content.includes('<version_c>') && content.includes('</version_c>'), 
    [content]
  );
  
  // Count how many complete versions we have
  const completeVersionCount = useMemo(() => {
    let count = 0;
    if (hasCompleteVersionA) count++;
    if (hasCompleteVersionB) count++;
    if (hasCompleteVersionC) count++;
    return count;
  }, [hasCompleteVersionA, hasCompleteVersionB, hasCompleteVersionC]);
  
  // Get streaming content for the active version (when tag is incomplete)
  const streamingContent = useMemo(() => {
    if (activeIndex === 0) {
      return getStreamingVersionContent(content, 'a');
    } else if (activeIndex === 1) {
      return getStreamingVersionContent(content, 'b');
    } else {
      return getStreamingVersionContent(content, 'c');
    }
  }, [content, activeIndex]);
  
  // Get content BEFORE versions (intro text)
  const contentBeforeVersions = useMemo(() => {
    return getContentBeforeVersions(content);
  }, [content]);
  
  // Get content AFTER all version tags (outro text)
  const contentAfterVersions = useMemo(() => {
    return getContentAfterVersions(content);
  }, [content]);

  // Navigation handlers
  const handlePrevious = useCallback(() => {
    setActiveIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => Math.min(parsed.versions.length - 1, prev + 1));
  }, [parsed.versions.length]);

  const handleSelect = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);
  
  // Copy version content to clipboard
  const handleCopy = useCallback((version: EmailVersion) => {
    navigator.clipboard.writeText(version.content).then(() => {
      setCopiedId(version.id);
      toast.success(`Version ${version.id.toUpperCase()} copied to clipboard`);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        handleNext();
      }
    },
    [handlePrevious, handleNext]
  );

  // If no versions found and not streaming, just render as regular markdown
  if (!parsed.hasVersions && !isStreaming && !hasEmailVersionMarkers(content)) {
    return (
      <div className={cn('prose dark:prose-invert max-w-none', className)}>
        <ReactMarkdown remarkPlugins={remarkPlugins} components={markdownComponents}>
          {content}
        </ReactMarkdown>
      </div>
    );
  }
  
  // During streaming with incomplete tags, show a nice streaming UI
  const showStreamingUI = isStreaming || (hasEmailVersionMarkers(content) && completeVersionCount === 0);

  const activeVersion = parsed.versions[activeIndex];
  

  return (
    <div
      className={cn('email-version-renderer', className)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Email versions"
    >
      {/* Intro text BEFORE the version card */}
      {contentBeforeVersions && (
        <div className="mb-4 prose dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={remarkPlugins} components={markdownComponents}>
            {contentBeforeVersions}
          </ReactMarkdown>
        </div>
      )}
      
      {/* Container - styled like AIReasoning */}
      <div className={cn(
        'rounded-xl border overflow-hidden transition-all duration-300',
        showStreamingUI
          ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/50'
          : 'bg-gray-50/50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700'
      )}>
        {/* Streaming header - shows version tabs being built */}
        {showStreamingUI && (
          <div className="flex items-center gap-3 px-4 py-3 border-b border-blue-100 dark:border-blue-800/50">
            {/* Bouncing dots like AIReasoning */}
            <div className="flex gap-0.5 h-3 items-end pb-0.5">
              <span className="w-1 h-2 bg-blue-500 rounded-full animate-[bounce_1s_infinite_0ms]" />
              <span className="w-1 h-2 bg-blue-500 rounded-full animate-[bounce_1s_infinite_200ms]" />
              <span className="w-1 h-2 bg-blue-500 rounded-full animate-[bounce_1s_infinite_400ms]" />
            </div>
            
            <div className="flex items-center gap-2">
              {/* Version indicators */}
              {['a', 'b', 'c'].map((v) => {
                const isComplete = v === 'a' ? hasCompleteVersionA : v === 'b' ? hasCompleteVersionB : hasCompleteVersionC;
                const isInProgress = content.includes(`<version_${v}>`);
                return (
                  <div
                    key={v}
                    className={cn(
                      'w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold transition-all duration-300',
                      isComplete
                        ? 'bg-blue-500 text-white'
                        : isInProgress
                          ? 'bg-blue-200 dark:bg-blue-800 text-blue-600 dark:text-blue-300 animate-pulse'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                    )}
                  >
                    {v.toUpperCase()}
                  </div>
                );
              })}
            </div>
            
            <span className="text-xs font-medium uppercase tracking-wider text-blue-600 dark:text-blue-400">
              {completeVersionCount === 0
                ? 'Generating versions...'
                : `${completeVersionCount} of 3 ready`}
            </span>
          </div>
        )}
        
        {/* Top navigation bar - only show when we have parsed versions and not streaming */}
        {!showStreamingUI && parsed.versions.length > 1 && (
          <VersionNavigator
            versions={parsed.versions}
            activeIndex={activeIndex}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onSelect={handleSelect}
            onCopy={handleCopy}
            copiedId={copiedId}
            position="top"
          />
        )}

        {/* Single version indicator (when only one version exists) */}
        {!showStreamingUI && parsed.versions.length === 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <MailIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-blue-500 dark:bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">
                  {activeVersion?.id.toUpperCase()}
                </div>
                <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {activeVersion?.label}
                </span>
              </div>
              {activeVersion?.note && (
                <span className="text-[10px] text-gray-400 dark:text-gray-500 italic truncate max-w-[250px]">
                  — {activeVersion.note}
                </span>
              )}
            </div>
            {/* Copy button for single version */}
            {activeVersion && (
              <button
                onClick={() => handleCopy(activeVersion)}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors',
                  copiedId === activeVersion.id
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
                )}
                title="Copy"
              >
                {copiedId === activeVersion.id ? (
                  <>
                    <CheckIcon className="w-3.5 h-3.5" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <CopyIcon className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Content area */}
        <div className="px-4 py-4 bg-white/50 dark:bg-transparent">
          {/* Approach note for mobile (shown below header on small screens) */}
          {activeVersion?.note && parsed.versions.length > 1 && (
            <div className="sm:hidden mb-3 p-2 bg-blue-50/50 dark:bg-blue-900/10 rounded-md border border-blue-100 dark:border-blue-800/30">
              <p className="text-[10px] text-blue-600 dark:text-blue-400 italic">
                {activeVersion.note}
              </p>
            </div>
          )}

          {/* Email content - show streaming content or completed version */}
          {/* Use StructuredEmailRenderer for structured email copy, otherwise fallback to markdown */}
          {activeVersion?.content && isStructuredEmailCopy(activeVersion.content) ? (
            <StructuredEmailRenderer content={activeVersion.content} />
          ) : (
            <div
              className={cn(
                'prose prose-sm dark:prose-invert max-w-none select-text',
                'prose-headings:font-semibold prose-headings:text-gray-800 dark:prose-headings:text-gray-200',
                'prose-h1:text-xl prose-h2:text-lg prose-h3:text-base',
                'prose-p:text-sm prose-p:leading-relaxed prose-p:text-gray-600 dark:prose-p:text-gray-400',
                'prose-strong:text-gray-800 dark:prose-strong:text-gray-200',
                'prose-ul:list-disc prose-ul:ml-4 prose-ol:list-decimal prose-ol:ml-4',
                'prose-li:text-gray-600 dark:prose-li:text-gray-400 prose-li:my-1',
                'prose-code:text-xs prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1 prose-code:rounded',
                'prose-pre:bg-gray-50 dark:prose-pre:bg-gray-900/50 prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-700 prose-pre:rounded-md prose-pre:p-3',
                'prose-blockquote:border-l-2 prose-blockquote:border-gray-300 dark:prose-blockquote:border-gray-600 prose-blockquote:pl-3 prose-blockquote:italic prose-blockquote:text-gray-500',
                'prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline'
              )}
            >
              <ReactMarkdown remarkPlugins={remarkPlugins} components={markdownComponents}>
                {activeVersion?.content || streamingContent || ''}
              </ReactMarkdown>
            </div>
          )}
          
          {/* Streaming cursor indicator */}
          {showStreamingUI && !activeVersion?.content && streamingContent && (
            <span className="inline-block w-1.5 h-4 bg-blue-500 rounded-sm animate-pulse ml-0.5" />
          )}
        </div>

        {/* Bottom navigation bar (for long content) - only when not streaming */}
        {!showStreamingUI && parsed.versions.length > 1 && (
          <VersionNavigator
            versions={parsed.versions}
            activeIndex={activeIndex}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onSelect={handleSelect}
            onCopy={handleCopy}
            copiedId={copiedId}
            position="bottom"
          />
        )}
      </div>

      {/* Content AFTER all versions (outro text) */}
      {contentAfterVersions && (
        <div className="mt-4 prose dark:prose-invert max-w-none px-2">
          <ReactMarkdown remarkPlugins={remarkPlugins} components={markdownComponents}>
            {contentAfterVersions}
          </ReactMarkdown>
          {/* Show cursor if content after versions is still streaming */}
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1" />
          )}
        </div>
      )}
    </div>
  );
});

export default EmailVersionRenderer;

