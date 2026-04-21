'use client';

import { memo, useState, useCallback, useMemo } from 'react';
import { parseEmailVersions, ParsedEmailVersions, EmailVersion, hasEmailVersionMarkers, getStreamingVersionContent, getContentBeforeVersions, getContentAfterVersions } from '@/lib/email-version-parser';
import { isStructuredEmailCopy } from '@/lib/email-copy-parser';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { ChevronLeftIcon, ChevronRightIcon, MailIcon, CopyIcon, CheckIcon, StarIcon } from 'lucide-react';
import StructuredEmailRenderer from './StructuredEmailRenderer';
import toast from 'react-hot-toast';

// Extended version with pinned state
interface DisplayVersion extends EmailVersion {
  isPinned?: boolean;
}

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
  pinnedId,
  onPrevious,
  onNext,
  onSelect,
  onPin,
  onCopy,
  copiedId,
  position = 'top',
}: {
  versions: DisplayVersion[];
  activeIndex: number;
  pinnedId: string | null;
  onPrevious: () => void;
  onNext: () => void;
  onSelect: (index: number) => void;
  onPin: (versionId: string) => void;
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
      {/* Left: Version selector */}
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="flex items-center gap-2">
          {/* Version badges */}
          <div className="flex items-center gap-2 py-1">
            {versions.map((v, idx) => (
              <div key={v.id} className="relative">
                <button
                  onClick={() => onSelect(idx)}
                  className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-200',
                    idx === activeIndex
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-md shadow-blue-500/20'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  )}
                  title={v.note ? `${v.label}: ${v.note}` : v.label}
                >
                  {v.id.toUpperCase()}
                </button>
                {/* Pinned indicator - outside button for visibility */}
                {pinnedId === v.id && (
                  <StarIcon className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 text-amber-500 fill-amber-500 drop-shadow-sm" />
                )}
              </div>
            ))}
          </div>
          
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {activeVersion?.label}
            {pinnedId === activeVersion?.id && (
              <span className="ml-1.5 text-[10px] text-amber-500 font-medium">(selected)</span>
            )}
          </span>
        </div>
      </div>

      {/* Right: Pin button, Copy button and Navigation arrows */}
      <div className="flex items-center gap-2">
        {/* Pin/Select button */}
        {activeVersion && (
          <button
            onClick={() => onPin(activeVersion.id)}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors',
              pinnedId === activeVersion.id
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
            )}
            title={pinnedId === activeVersion.id ? 'Unselect this version' : `Select Version ${activeVersion.id.toUpperCase()} as preferred`}
          >
            <StarIcon className={cn('w-3.5 h-3.5', pinnedId === activeVersion.id && 'fill-amber-500')} />
            <span className="hidden sm:inline">
              {pinnedId === activeVersion.id ? 'Selected' : 'Select'}
            </span>
          </button>
        )}
        
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
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  // Parse the content for versions
  const parsed = useMemo(() => parseEmailVersions(content), [content]);
  
  // Reorder versions to put pinned version first (but keep original letter)
  const displayVersions: DisplayVersion[] = useMemo(() => {
    if (!pinnedId || parsed.versions.length === 0) {
      return parsed.versions.map(v => ({ ...v, isPinned: false }));
    }
    
    const pinnedIndex = parsed.versions.findIndex(v => v.id === pinnedId);
    if (pinnedIndex === -1) {
      return parsed.versions.map(v => ({ ...v, isPinned: false }));
    }
    
    // Create DisplayVersion array with isPinned flag, then reorder
    const reordered: DisplayVersion[] = parsed.versions.map(v => ({ ...v, isPinned: v.id === pinnedId }));
    if (pinnedIndex > 0) {
      const [pinnedVersion] = reordered.splice(pinnedIndex, 1);
      reordered.unshift(pinnedVersion);
    }
    
    return reordered;
  }, [parsed.versions, pinnedId]);
  
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
  // Use the actual version ID from displayVersions, not hardcoded index mapping
  // This ensures correct streaming content even when versions are reordered (e.g., after pinning)
  const streamingContent = useMemo(() => {
    const activeVersion = displayVersions[activeIndex];
    if (!activeVersion) {
      return getStreamingVersionContent(content, 'a'); // Fallback to 'a'
    }
    return getStreamingVersionContent(content, activeVersion.id);
  }, [content, activeIndex, displayVersions]);
  
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
    setActiveIndex((prev) => Math.min(displayVersions.length - 1, prev + 1));
  }, [displayVersions.length]);

  const handleSelect = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);
  
  // Pin/unpin a version as preferred
  const handlePin = useCallback((versionId: string) => {
    if (pinnedId === versionId) {
      // Unpin - need to update activeIndex to show the same version in the original order
      // Currently viewing the pinned version at index 0 in reordered array
      // Find its position in the original (un-reordered) array
      const originalIndex = parsed.versions.findIndex(v => v.id === versionId);
      setPinnedId(null);
      // Set activeIndex to the original position so user keeps viewing the same version
      if (originalIndex !== -1) {
        setActiveIndex(originalIndex);
      }
      toast.success('Selection cleared');
    } else {
      // Pin the new version - it will be moved to index 0 in displayVersions
      setPinnedId(versionId);
      setActiveIndex(0);
      toast.success(`Version ${versionId.toUpperCase()} selected as preferred`);
    }
  }, [pinnedId, parsed.versions]);
  
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

  const activeVersion = displayVersions[activeIndex];
  

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
        {!showStreamingUI && displayVersions.length > 1 && (
          <VersionNavigator
            versions={displayVersions}
            activeIndex={activeIndex}
            pinnedId={pinnedId}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onSelect={handleSelect}
            onPin={handlePin}
            onCopy={handleCopy}
            copiedId={copiedId}
            position="top"
          />
        )}

        {/* Single version indicator (when only one version exists) */}
        {!showStreamingUI && displayVersions.length === 1 && (
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
          {/* Approach note card - prominent display on all screens */}
          {activeVersion?.note && !showStreamingUI && (
            <div className="mb-4 flex items-start gap-3 p-3 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 rounded-lg border border-violet-200/60 dark:border-violet-800/40">
              <div className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-md flex items-center justify-center shadow-sm">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-0.5">
                  Approach
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                  {activeVersion.note}
                </p>
              </div>
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
        {!showStreamingUI && displayVersions.length > 1 && (
          <VersionNavigator
            versions={displayVersions}
            activeIndex={activeIndex}
            pinnedId={pinnedId}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onSelect={handleSelect}
            onPin={handlePin}
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

