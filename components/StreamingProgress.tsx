'use client';

import { useState, useEffect } from 'react';
import { AIStatus } from '@/types';

interface StreamingProgressProps {
  status: AIStatus;
  chunkCount?: number;
  estimatedTime?: number;
}

const STATUS_LABELS: Record<AIStatus, string> = {
  idle: 'Ready',
  analyzing_brand: 'Analyzing brand context...',
  crafting_subject: 'Crafting subject line...',
  writing_hero: 'Writing hero section...',
  developing_body: 'Developing email body...',
  creating_cta: 'Creating call-to-action...',
  finalizing: 'Finalizing email...',
};

const STATUS_PROGRESS: Record<AIStatus, number> = {
  idle: 0,
  analyzing_brand: 10,
  crafting_subject: 25,
  writing_hero: 40,
  developing_body: 60,
  creating_cta: 80,
  finalizing: 95,
};

export default function StreamingProgress({
  status,
  chunkCount = 0,
  estimatedTime,
}: StreamingProgressProps) {
  const [elapsed, setElapsed] = useState(0);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (status === 'idle') {
      setElapsed(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 100);

    return () => clearInterval(interval);
  }, [status, startTime]);

  if (status === 'idle') {
    return null;
  }

  const progress = STATUS_PROGRESS[status];
  const label = STATUS_LABELS[status];
  const elapsedSeconds = Math.floor(elapsed / 1000);

  return (
    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div
              className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse"
              style={{ animationDelay: '0ms' }}
            />
            <div
              className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse"
              style={{ animationDelay: '200ms' }}
            />
            <div
              className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse"
              style={{ animationDelay: '400ms' }}
            />
          </div>
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-blue-700 dark:text-blue-300">
          {chunkCount > 0 && (
            <span>
              {chunkCount} chunks
            </span>
          )}
          <span>
            {elapsedSeconds}s
          </span>
          {estimatedTime && (
            <span>
              ~{Math.ceil((estimatedTime - elapsed) / 1000)}s remaining
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative w-full h-1.5 bg-blue-200 dark:bg-blue-900/50 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-blue-600 dark:bg-blue-400 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
        </div>
      </div>
    </div>
  );
}

/**
 * Mini streaming indicator for compact spaces
 */
export function MiniStreamingIndicator({ status }: { status: AIStatus }) {
  if (status === 'idle') return null;

  return (
    <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
      <div className="flex gap-0.5">
        <div className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
        <div className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
        <div className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
      </div>
      <span>Generating...</span>
    </div>
  );
}

/**
 * Section-level streaming indicator
 */
export function SectionStreamingIndicator({ sectionName }: { sectionName: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 italic">
      <div className="flex gap-0.5">
        <div className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
        <div className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
        <div className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
      </div>
      <span>Writing {sectionName}...</span>
    </div>
  );
}

// Add shimmer animation to global styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    .animate-shimmer {
      animation: shimmer 2s infinite;
    }
  `;
  document.head.appendChild(style);
}

