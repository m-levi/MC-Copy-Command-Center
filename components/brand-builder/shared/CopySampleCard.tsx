'use client';

import React from 'react';
import { CopySample } from '@/types/brand-builder';
import { cn } from '@/lib/utils';
import {
  Mail,
  Sparkles,
  Type,
  MousePointer,
  Quote,
  ThumbsUp,
  Pencil,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const SAMPLE_TYPE_META: Record<CopySample['type'], {
  label: string;
  icon: React.ElementType;
  color: string;
}> = {
  subject_line: {
    label: 'Subject Line',
    icon: Mail,
    color: 'text-violet-600 bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400',
  },
  hero: {
    label: 'Hero Copy',
    icon: Sparkles,
    color: 'text-pink-600 bg-pink-100 dark:bg-pink-900/30 dark:text-pink-400',
  },
  body: {
    label: 'Body Copy',
    icon: Type,
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
  },
  cta: {
    label: 'Call to Action',
    icon: MousePointer,
    color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  tagline: {
    label: 'Tagline',
    icon: Quote,
    color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400',
  },
};

interface CopySampleCardProps {
  sample: CopySample;
  onFeedback?: (sampleId: string, feedback: 'approve' | 'tweak' | 'reject') => void;
  compact?: boolean;
}

export function CopySampleCard({ sample, onFeedback, compact = false }: CopySampleCardProps) {
  const meta = SAMPLE_TYPE_META[sample.type];
  const Icon = meta.icon;

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow',
        compact && 'rounded-xl'
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'px-4 py-3 flex items-center justify-between border-b border-gray-100 dark:border-gray-700',
          compact && 'px-3 py-2'
        )}
      >
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center',
              meta.color,
              compact && 'w-6 h-6'
            )}
          >
            <Icon className={cn('w-4 h-4', compact && 'w-3 h-3')} />
          </div>
          <span
            className={cn(
              'text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide',
              compact && 'text-xs'
            )}
          >
            {meta.label}
          </span>
        </div>
        <span
          className={cn(
            'px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-medium',
            compact && 'px-2 py-0.5'
          )}
        >
          {sample.tone}
        </span>
      </div>

      {/* Content */}
      <div className={cn('p-4', compact && 'p-3')}>
        <p
          className={cn(
            'text-gray-900 dark:text-gray-100 leading-relaxed',
            compact ? 'text-sm' : 'text-base',
            sample.type === 'subject_line' && 'font-medium',
            sample.type === 'cta' && 'font-semibold text-center',
            sample.type === 'tagline' && 'italic text-lg text-center'
          )}
        >
          {sample.type === 'cta' ? (
            <span className="inline-block px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg shadow-md">
              {sample.content}
            </span>
          ) : (
            sample.content
          )}
        </p>
      </div>

      {/* Feedback Actions */}
      {onFeedback && !compact && (
        <div className="px-4 pb-4 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onFeedback(sample.id, 'approve')}
            className="flex-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
          >
            <ThumbsUp className="w-4 h-4 mr-2" />
            This feels right
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onFeedback(sample.id, 'tweak')}
            className="flex-1 border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/30"
          >
            <Pencil className="w-4 h-4 mr-2" />
            Tweak it
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onFeedback(sample.id, 'reject')}
            className="border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
