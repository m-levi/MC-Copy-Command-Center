'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { EmailArtifactWithContent } from '@/types/artifacts';
import { MailIcon, SparklesIcon, StarIcon, EditIcon, ChevronRightIcon } from 'lucide-react';

interface ArtifactCardProps {
  artifact: EmailArtifactWithContent;
  onClick: () => void;
  isActive?: boolean;
  isNew?: boolean;
}

export const ArtifactCard = memo(function ArtifactCard({
  artifact,
  onClick,
  isActive = false,
  isNew = false,
}: ArtifactCardProps) {
  // Get available variants count
  const variantCount = [
    artifact.version_a_content,
    artifact.version_b_content,
    artifact.version_c_content,
  ].filter(Boolean).length;

  // Get preview text
  const previewContent = artifact.version_a_content || '';
  const preview = previewContent.slice(0, 150).replace(/\*\*/g, '').replace(/\n/g, ' ');

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full max-w-md p-4 rounded-2xl border transition-all text-left group',
        isActive
          ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-900/20 dark:border-blue-600'
          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn(
          'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
          isActive
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 group-hover:text-blue-500'
        )}>
          <MailIcon className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-gray-900 dark:text-white truncate">
              {artifact.title}
            </span>
            {isNew && (
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded">
                <SparklesIcon className="w-2.5 h-2.5" />
                New
              </span>
            )}
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-2">
            <span className="flex items-center gap-1">
              <SparklesIcon className="w-3 h-3" />
              {variantCount} version{variantCount !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <StarIcon className={cn(
                'w-3 h-3',
                artifact.selected_variant && 'fill-yellow-400 text-yellow-400'
              )} />
              {(artifact.selected_variant || 'A').toUpperCase()} selected
            </span>
            <span className="flex items-center gap-1">
              <EditIcon className="w-3 h-3" />
              v{artifact.version_count}
            </span>
          </div>

          {/* Preview */}
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {preview}...
          </p>
        </div>

        {/* Arrow */}
        <ChevronRightIcon className={cn(
          'w-5 h-5 flex-shrink-0 transition-transform',
          isActive ? 'text-blue-500' : 'text-gray-400 group-hover:translate-x-0.5'
        )} />
      </div>
    </button>
  );
});

// Streaming placeholder card
export const StreamingArtifactCard = memo(function StreamingArtifactCard({
  title = 'Email Copy',
}: {
  title?: string;
}) {
  return (
    <div className="w-full max-w-md p-4 rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
          <MailIcon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-gray-900 dark:text-white">{title}</span>
            <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded">
              <div className="flex gap-0.5">
                <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              Writing
            </span>
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2" />
          </div>
        </div>
      </div>
    </div>
  );
});

export default ArtifactCard;

