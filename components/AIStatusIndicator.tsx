'use client';

import { AIStatus } from '@/types';

interface AIStatusIndicatorProps {
  status: AIStatus;
}

const statusLabels: Record<AIStatus, string> = {
  idle: 'Ready',
  analyzing_brand: 'Analyzing brand voice...',
  crafting_subject: 'Crafting subject line...',
  writing_hero: 'Writing hero section...',
  developing_body: 'Developing body sections...',
  creating_cta: 'Creating call-to-action...',
  finalizing: 'Finalizing copy...',
};

export default function AIStatusIndicator({ status }: AIStatusIndicatorProps) {
  if (status === 'idle') return null;

  return (
    <div className="flex items-center gap-3 text-sm text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2.5 mb-3 shadow-sm">
      <div className="flex gap-1.5">
        <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse"></div>
        <div
          className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse"
          style={{ animationDelay: '0.2s' }}
        ></div>
        <div
          className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse"
          style={{ animationDelay: '0.4s' }}
        ></div>
      </div>
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span className="font-semibold">{statusLabels[status]}</span>
      </div>
    </div>
  );
}

