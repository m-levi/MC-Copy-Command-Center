'use client';

import { memo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { MailIcon, SparklesIcon, ChevronRightIcon, FileTextIcon } from 'lucide-react';
import { EmailArtifactWithContent } from '@/types/artifacts';

interface InlineArtifactCardProps {
  artifact?: EmailArtifactWithContent;
  isStreaming?: boolean;
  streamingTitle?: string;
  onClick: () => void;
}

/**
 * Inline artifact card shown in chat messages instead of full email content.
 * Clean, professional design that matches the app's aesthetic.
 */
export const InlineArtifactCard = memo(function InlineArtifactCard({
  artifact,
  isStreaming = false,
  streamingTitle = 'Email Copy',
  onClick,
}: InlineArtifactCardProps) {
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  }, [onClick]);

  // Streaming state - show animated card
  if (isStreaming) {
    return (
      <button
        onClick={handleClick}
        className={cn(
          'group w-full rounded-xl border transition-all duration-200',
          'border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-800/60',
          'hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md',
          'cursor-pointer text-left'
        )}
      >
        <div className="p-4">
          <div className="flex items-start gap-3.5">
            {/* Icon with subtle pulse */}
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700/80 flex items-center justify-center">
              <div className="relative">
                <MailIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              </div>
            </div>

            <div className="flex-1 min-w-0 py-0.5">
              <div className="flex items-center gap-2.5 mb-2">
                <span className="font-medium text-gray-900 dark:text-gray-100 text-[15px]">
                  {streamingTitle}
                </span>
                <span className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium bg-gray-100 dark:bg-gray-700/80 text-gray-500 dark:text-gray-400 rounded-md">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
                  </span>
                  Writing
                </span>
              </div>
              
              {/* Skeleton preview */}
              <div className="space-y-2">
                <div className="h-2 bg-gray-100 dark:bg-gray-700/60 rounded w-full animate-pulse" />
                <div className="h-2 bg-gray-100 dark:bg-gray-700/60 rounded w-4/5 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </button>
    );
  }

  // No artifact yet - shouldn't happen but handle gracefully
  if (!artifact) {
    return null;
  }

  // Get variant count and preview
  const variantCount = [
    artifact.version_a_content,
    artifact.version_b_content,
    artifact.version_c_content,
  ].filter(Boolean).length;

  const previewContent = artifact.version_a_content || artifact.content || '';
  const preview = previewContent
    .slice(0, 100)
    .replace(/\*\*/g, '')
    .replace(/\n/g, ' ')
    .replace(/#+\s*/g, '')
    .trim();

  // Get approach description if available
  const approachMatch = artifact.version_a_content?.match(/Approach:\s*([^\n]+)/i);
  const approach = approachMatch ? approachMatch[1].trim() : null;

  return (
    <button
      onClick={handleClick}
      className={cn(
        'group w-full rounded-xl border transition-all duration-200',
        'border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-800/60',
        'hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md hover:bg-gray-50/50 dark:hover:bg-gray-800/80',
        'cursor-pointer text-left'
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-3.5">
          {/* Icon */}
          <div className={cn(
            'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-200',
            'bg-gray-100 dark:bg-gray-700/80 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'
          )}>
            <FileTextIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </div>

          <div className="flex-1 min-w-0 py-0.5">
            {/* Title row */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-medium text-gray-900 dark:text-gray-100 text-[15px] truncate">
                {artifact.title}
              </span>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-2 mb-2">
              {variantCount > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium bg-gray-100 dark:bg-gray-700/80 text-gray-600 dark:text-gray-400 rounded">
                  <SparklesIcon className="w-3 h-3" />
                  {variantCount} {variantCount === 1 ? 'version' : 'versions'}
                </span>
              )}
              <span className="text-[11px] text-gray-400 dark:text-gray-500">
                v{artifact.version_count || 1}
              </span>
            </div>

            {/* Preview or approach */}
            <p className="text-[13px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
              {approach || (preview ? `${preview}...` : 'Click to view content')}
            </p>
          </div>

          {/* Arrow indicator */}
          <div className={cn(
            'flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center transition-all duration-200 self-center',
            'text-gray-300 dark:text-gray-600',
            'group-hover:text-gray-400 dark:group-hover:text-gray-500 group-hover:translate-x-0.5'
          )}>
            <ChevronRightIcon className="w-4 h-4" />
          </div>
        </div>
      </div>
    </button>
  );
});

export default InlineArtifactCard;

