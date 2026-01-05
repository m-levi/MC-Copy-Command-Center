'use client';

import { memo, useState, useCallback, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { EmailArtifactWithContent, ArtifactVariant } from '@/types/artifacts';
import { 
  CopyIcon, 
  CheckIcon,
  EyeIcon,
  FileTextIcon,
  MessageSquareIcon,
  MessageCircleIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import SubjectLineGeneratorInline from '@/components/SubjectLineGeneratorInline';

interface EmailArtifactViewProps {
  artifact: EmailArtifactWithContent;
  availableVariants: ArtifactVariant[];
  selectedVariant: ArtifactVariant;
  onVariantChange: (variant: ArtifactVariant) => void;
  isStreaming?: boolean;
  streamingContent?: string;
  onCommentText?: (text: string) => void;
  onQuoteText?: (text: string) => void;
}

export const EmailArtifactView = memo(function EmailArtifactView({
  artifact,
  availableVariants,
  selectedVariant,
  onVariantChange,
  isStreaming = false,
  streamingContent = '',
  onCommentText,
  onQuoteText,
}: EmailArtifactViewProps) {
  // Default to Raw view
  const [viewMode, setViewMode] = useState<'raw' | 'preview'>('raw');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionPosition, setSelectionPosition] = useState<{ x: number; y: number } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Parse streaming content for versions when editing
  const streamingVersions = useMemo(() => {
    if (!isStreaming || !streamingContent) return null;
    
    const versionAMatch = streamingContent.match(/<version_a>([\s\S]*?)(<\/version_a>|$)/i);
    const versionBMatch = streamingContent.match(/<version_b>([\s\S]*?)(<\/version_b>|$)/i);
    const versionCMatch = streamingContent.match(/<version_c>([\s\S]*?)(<\/version_c>|$)/i);
    
    return {
      a: versionAMatch ? versionAMatch[1].trim() : null,
      b: versionBMatch ? versionBMatch[1].trim() : null,
      c: versionCMatch ? versionCMatch[1].trim() : null,
    };
  }, [isStreaming, streamingContent]);

  // Get content for the selected variant
  const getVariantContent = useCallback((variant: ArtifactVariant): string => {
    // When streaming, try to get content from parsed streaming versions
    if (isStreaming && streamingVersions) {
      const streamingVariantContent = streamingVersions[variant];
      if (streamingVariantContent) {
        return streamingVariantContent;
      }
      // Fall back to the first available streaming version if selected isn't ready
      if (streamingVersions.a) return streamingVersions.a;
      if (streamingVersions.b) return streamingVersions.b;
      if (streamingVersions.c) return streamingVersions.c;
      // If no versions parsed yet, return the raw streaming content
      return streamingContent;
    }
    switch (variant) {
      case 'a': return artifact.version_a_content || '';
      case 'b': return artifact.version_b_content || '';
      case 'c': return artifact.version_c_content || '';
      default: return artifact.version_a_content || '';
    }
  }, [artifact, isStreaming, streamingContent, streamingVersions]);

  const getVariantApproach = useCallback((variant: ArtifactVariant): string | undefined => {
    switch (variant) {
      case 'a': return artifact.version_a_approach;
      case 'b': return artifact.version_b_approach;
      case 'c': return artifact.version_c_approach;
      default: return artifact.version_a_approach;
    }
  }, [artifact]);

  const currentContent = getVariantContent(selectedVariant);
  const currentApproach = getVariantApproach(selectedVariant);

  // Clean content - remove code fences and approach line (since it's shown separately)
  const cleanContent = useMemo(() => {
    let cleaned = currentContent
      .replace(/^```\n?/gm, '')
      .replace(/\n?```$/gm, '')
      .trim();
    
    // If approach is shown separately, remove it from the main content
    if (currentApproach) {
      // Remove **Approach:** line and any following empty lines
      cleaned = cleaned
        .replace(/^\*\*Approach:\*\*\s*[^\n]*\n*/im, '')
        .replace(/^Approach:\s*[^\n]*\n*/im, '')
        .trim();
    }
    
    return cleaned;
  }, [currentContent, currentApproach]);

  // Copy handler
  const handleCopy = useCallback(async (content: string, section?: string) => {
    const clean = content.replace(/^```\n?/gm, '').replace(/\n?```$/gm, '').trim();
    await navigator.clipboard.writeText(clean);
    setCopiedSection(section || 'all');
    toast.success('Copied!');
    setTimeout(() => setCopiedSection(null), 2000);
  }, []);

  // Handle text selection - use fixed positioning for reliable popup placement
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.selection-popup')) return;
    
    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      
      if (text && text.length > 3) {
        try {
          const range = selection?.getRangeAt(0);
          const rect = range?.getBoundingClientRect();
          
          if (rect && rect.width > 0) {
            // Use viewport-relative coordinates for fixed positioning
            const x = rect.left + rect.width / 2;
            const y = rect.top - 10; // Position above selection
            
            setSelectedText(text);
            setSelectionPosition({ x, y });
          }
        } catch (err) {
          // Selection might be invalid
        }
      } else {
        setSelectedText('');
        setSelectionPosition(null);
      }
    }, 10);
  }, []);

  // Clear selection when clicking outside
  const handleClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.selection-popup')) return;
    
    // Clear selection if clicking on empty area
    const selection = window.getSelection();
    if (!selection?.toString().trim()) {
      setSelectedText('');
      setSelectionPosition(null);
    }
  }, []);

  const handleCommentClick = useCallback(() => {
    if (selectedText && onCommentText) {
      onCommentText(selectedText);
      setSelectedText('');
      setSelectionPosition(null);
      window.getSelection()?.removeAllRanges();
    }
  }, [selectedText, onCommentText]);

  const handleQuoteClick = useCallback(() => {
    if (selectedText && onQuoteText) {
      onQuoteText(selectedText);
      toast.success('Quote added – type your feedback below', {
        icon: '💬',
        duration: 2500,
      });
      setSelectedText('');
      setSelectionPosition(null);
      window.getSelection()?.removeAllRanges();
    }
  }, [selectedText, onQuoteText]);

  const handleCopySelection = useCallback(async () => {
    if (selectedText) {
      await navigator.clipboard.writeText(selectedText);
      toast.success('Copied!');
      setSelectedText('');
      setSelectionPosition(null);
      window.getSelection()?.removeAllRanges();
    }
  }, [selectedText]);

  // During streaming, show variants that are available from streaming content
  const effectiveVariants = useMemo(() => {
    if (isStreaming && streamingVersions) {
      const variants: ArtifactVariant[] = [];
      if (streamingVersions.a) variants.push('a');
      if (streamingVersions.b) variants.push('b');
      if (streamingVersions.c) variants.push('c');
      return variants.length > 0 ? variants : availableVariants;
    }
    return availableVariants;
  }, [isStreaming, streamingVersions, availableVariants]);

  // Detect which version is currently being written
  const currentlyStreamingVersion = useMemo(() => {
    if (!isStreaming || !streamingContent) return null;
    // Check which version tag is open but not closed
    if (streamingContent.includes('<version_c>') && !streamingContent.includes('</version_c>')) return 'c';
    if (streamingContent.includes('<version_b>') && !streamingContent.includes('</version_b>')) return 'b';
    if (streamingContent.includes('<version_a>') && !streamingContent.includes('</version_a>')) return 'a';
    return null;
  }, [isStreaming, streamingContent]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Options Bar - Show during streaming edits or when multiple variants exist */}
      {(effectiveVariants.length > 1 || isStreaming) && (
        <div className="flex-shrink-0 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">
                {isStreaming ? 'Writing:' : 'Options:'}
              </span>
              {(['a', 'b', 'c'] as const).map((variant) => {
                const isAvailable = effectiveVariants.includes(variant);
                const isStreamingThis = currentlyStreamingVersion === variant;
                const isSelected = selectedVariant === variant;
                
                return (
                  <button
                    key={variant}
                    onClick={() => isAvailable && onVariantChange(variant)}
                    disabled={!isAvailable}
                    className={cn(
                      'w-9 h-9 rounded-xl text-sm font-bold transition-all relative',
                      isSelected
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105'
                        : isAvailable
                          ? 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-blue-400 hover:scale-105 hover:shadow-md'
                          : 'bg-gray-100 dark:bg-gray-800/50 text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-50'
                    )}
                  >
                    {variant.toUpperCase()}
                    {isStreamingThis && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse ring-2 ring-white dark:ring-gray-800" />
                    )}
                  </button>
                );
              })}
            </div>
            <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
          </div>
        </div>
      )}

      {availableVariants.length <= 1 && (
        <div className="flex-shrink-0 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-end">
            <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
          </div>
        </div>
      )}

      {/* Content Area */}
      <div 
        ref={contentRef}
        className="flex-1 overflow-y-auto relative"
        onMouseUp={handleMouseUp}
        onClick={handleClick}
      >
        {/* Selection popup - uses fixed positioning for reliable placement */}
        {selectedText && selectionPosition && (
          <div 
            className="selection-popup fixed z-[100] flex items-center gap-1 p-1.5 bg-gray-900 dark:bg-gray-700 rounded-lg shadow-2xl border border-gray-700 dark:border-gray-600"
            style={{ 
              left: selectionPosition.x, 
              top: selectionPosition.y,
              transform: 'translate(-50%, -100%)',
            }}
          >
            {onQuoteText && (
              <button
                onClick={handleQuoteClick}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 rounded transition-colors"
              >
                <MessageCircleIcon className="w-3.5 h-3.5" />
                Quote
              </button>
            )}
            {onCommentText && (
              <button
                onClick={handleCommentClick}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 rounded transition-colors"
              >
                <MessageSquareIcon className="w-3.5 h-3.5" />
                Comment
              </button>
            )}
            <button
              onClick={handleCopySelection}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 rounded transition-colors"
            >
              <CopyIcon className="w-3.5 h-3.5" />
              Copy
            </button>
            {/* Arrow pointer */}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-gray-900 dark:bg-gray-700 border-b border-r border-gray-700 dark:border-gray-600 rotate-45" />
          </div>
        )}

        {isStreaming && (
          <div className="mx-4 mt-4 flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-600 dark:text-blue-400">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            <span className="font-medium">Updating...</span>
          </div>
        )}

        {currentApproach && !isStreaming && (
          <div className="mx-4 mt-4 px-3.5 py-3 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl border border-violet-100 dark:border-violet-800/50">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-800/50 flex items-center justify-center">
                <svg className="w-3 h-3 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-violet-700 dark:text-violet-300 uppercase tracking-wide">Approach</span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{currentApproach}</p>
          </div>
        )}

        <div className="p-4 select-text">
          {viewMode === 'raw' ? (
            <RawView content={cleanContent} isStreaming={isStreaming} />
          ) : (
            <PreviewView content={cleanContent} />
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
        {/* Subject Line Generator */}
        {!isStreaming && cleanContent && (
          <div className="px-4 pt-2">
            <SubjectLineGeneratorInline emailContent={cleanContent} />
          </div>
        )}
        
        {/* Copy Button */}
        <div className="px-4 py-3">
          <button
            onClick={() => handleCopy(cleanContent)}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
              copiedSection === 'all'
                ? 'bg-green-500 text-white shadow-lg shadow-green-500/25'
                : 'bg-gradient-to-r from-gray-900 to-gray-800 dark:from-white dark:to-gray-100 text-white dark:text-gray-900 hover:shadow-lg hover:shadow-gray-900/25 dark:hover:shadow-white/25 hover:-translate-y-0.5 active:translate-y-0'
            )}
          >
            {copiedSection === 'all' ? (
              <>
                <CheckIcon className="w-4 h-4" />
                Copied to Clipboard!
              </>
            ) : (
              <>
                <CopyIcon className="w-4 h-4" />
                Copy Email Content
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

function ViewToggle({ viewMode, setViewMode }: { viewMode: 'raw' | 'preview'; setViewMode: (v: 'raw' | 'preview') => void }) {
  return (
    <div className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-lg p-0.5">
      <button
        onClick={() => setViewMode('raw')}
        className={cn(
          'flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-all',
          viewMode === 'raw'
            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-600 dark:text-gray-400'
        )}
      >
        <FileTextIcon className="w-3 h-3" />
        Raw
      </button>
      <button
        onClick={() => setViewMode('preview')}
        className={cn(
          'flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-all',
          viewMode === 'preview'
            ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
            : 'text-gray-600 dark:text-gray-400'
        )}
      >
        <EyeIcon className="w-3 h-3" />
        Preview
      </button>
    </div>
  );
}

function RawView({ content, isStreaming }: { content: string; isStreaming: boolean }) {
  const knownLabels = ['Headline', 'Subhead', 'Subheadline', 'Body', 'CTA', 'Accent', 'Quote', 'Attribution', 'Product Name', 'Price', 'One-liner', 'Code', 'Message', 'Expiry'];
  const labelPattern = new RegExp(`^(${knownLabels.join('|')}):`, 'i');
  
  const lines = content.split('\n');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="text-sm leading-relaxed space-y-1 font-mono">
        {lines.map((line, index) => {
          const trimmed = line.trim();
          
          if (!trimmed) return <div key={index} className="h-2" />;
          
          const blockMatch = trimmed.match(/^\*\*([A-Z][A-Z0-9 _+&-]*)\*\*$/);
          if (blockMatch) {
            return (
              <div key={index} className="flex items-center gap-2 pt-4 pb-2 first:pt-0 mb-2 border-b border-gray-100 dark:border-gray-700">
                <div className="w-1 h-4 bg-blue-500 rounded-full" />
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {blockMatch[1]}
                </span>
              </div>
            );
          }
          
          const fieldMatch = trimmed.match(labelPattern);
          if (fieldMatch) {
            const colonIndex = trimmed.indexOf(':');
            const label = trimmed.slice(0, colonIndex);
            const value = trimmed.slice(colonIndex + 1).trim();
            const isCTA = label.toLowerCase() === 'cta';
            return (
              <div key={index} className={cn(
                "text-gray-800 dark:text-gray-200 py-0.5",
                isCTA && "mt-1 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800"
              )}>
                <span className={cn(
                  "font-semibold",
                  isCTA ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"
                )}>{label}:</span>{' '}
                <span className={isCTA ? "font-medium" : ""}>{value}</span>
              </div>
            );
          }
          
          if (/^[•\-\*]\s+/.test(trimmed)) {
            return (
              <div key={index} className="text-gray-800 dark:text-gray-200 pl-2">
                <span className="text-gray-400 mr-1">•</span>
                {trimmed.replace(/^[•\-\*]\s+/, '')}
              </div>
            );
          }
          
          return (
            <div key={index} className="text-gray-800 dark:text-gray-200">
              {trimmed}
            </div>
          );
        })}
        
        {isStreaming && (
          <span className="inline-block w-0.5 h-4 bg-blue-500 animate-pulse ml-0.5 rounded-full" />
        )}
      </div>
    </div>
  );
}

function PreviewView({ content }: { content: string }) {
  if (!content || content.trim().length === 0) {
    return (
      <div className="text-gray-400 dark:text-gray-500 text-sm italic">
        No content to preview
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="text-sm">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => <h1 className="text-xl font-bold mb-3 mt-4 first:mt-0 text-gray-900 dark:text-white">{children}</h1>,
            h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-4 first:mt-0 text-gray-900 dark:text-white">{children}</h2>,
            h3: ({ children }) => <h3 className="text-base font-semibold mb-2 mt-3 first:mt-0 text-gray-900 dark:text-white">{children}</h3>,
            p: ({ children }) => <p className="mb-3 text-gray-700 dark:text-gray-300 leading-relaxed">{children}</p>,
            strong: ({ children }) => <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>,
            em: ({ children }) => <em className="italic">{children}</em>,
            ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
            li: ({ children }) => <li className="text-gray-700 dark:text-gray-300">{children}</li>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-blue-400 pl-4 italic text-gray-600 dark:text-gray-400 my-3">
                {children}
              </blockquote>
            ),
            hr: () => <hr className="my-4 border-gray-200 dark:border-gray-700" />,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}

export default EmailArtifactView;














