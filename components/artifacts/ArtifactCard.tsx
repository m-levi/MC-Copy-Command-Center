'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { EmailArtifactWithContent } from '@/types/artifacts';
import { FileTextIcon, SparklesIcon, StarIcon, ChevronRightIcon } from 'lucide-react';

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
  const preview = previewContent.slice(0, 120).replace(/\*\*/g, '').replace(/\n/g, ' ').replace(/#+\s*/g, '').trim();

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full max-w-md p-4 rounded-xl border transition-all duration-200 text-left group',
        isActive
          ? 'border-blue-500/50 bg-blue-50/80 dark:bg-blue-900/20 dark:border-blue-500/40 shadow-sm'
          : 'border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-800/60 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50/50 dark:hover:bg-gray-800/80 hover:shadow-sm'
      )}
    >
      <div className="flex items-start gap-3.5">
        {/* Icon */}
        <div className={cn(
          'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-200',
          isActive
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 dark:bg-gray-700/80 text-gray-500 dark:text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'
        )}>
          <FileTextIcon className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 py-0.5">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={cn(
              "font-medium text-[15px] truncate",
              isActive ? "text-blue-900 dark:text-blue-100" : "text-gray-900 dark:text-gray-100"
            )}>
              {artifact.title}
            </span>
            {isNew && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded">
                New
              </span>
            )}
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium bg-gray-100 dark:bg-gray-700/80 text-gray-600 dark:text-gray-400 rounded">
              <SparklesIcon className="w-3 h-3" />
              {variantCount} {variantCount === 1 ? 'version' : 'versions'}
            </span>
            {artifact.selected_variant && (
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                <StarIcon className="w-3 h-3 fill-amber-400 text-amber-400" />
                {artifact.selected_variant.toUpperCase()}
              </span>
            )}
            <span className="text-[11px] text-gray-400 dark:text-gray-500">
              v{artifact.version_count}
            </span>
          </div>

          {/* Preview */}
          <p className="text-[13px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
            {preview ? `${preview}...` : 'Click to view content'}
          </p>
        </div>

        {/* Arrow */}
        <ChevronRightIcon className={cn(
          'w-4 h-4 flex-shrink-0 transition-all duration-200 self-center',
          isActive ? 'text-blue-500' : 'text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500 group-hover:translate-x-0.5'
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
    <div className="w-full max-w-md p-4 rounded-xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-800/60">
      <div className="flex items-start gap-3.5">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700/80 flex items-center justify-center">
          <div className="relative">
            <FileTextIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          </div>
        </div>
        <div className="flex-1 py-0.5">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="font-medium text-gray-900 dark:text-gray-100 text-[15px]">{title}</span>
            <span className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium bg-gray-100 dark:bg-gray-700/80 text-gray-500 dark:text-gray-400 rounded-md">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
              </span>
              Writing
            </span>
          </div>
          <div className="space-y-2">
            <div className="h-2 bg-gray-100 dark:bg-gray-700/60 rounded w-full animate-pulse" />
            <div className="h-2 bg-gray-100 dark:bg-gray-700/60 rounded w-4/5 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
});

export default ArtifactCard;






























