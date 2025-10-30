'use client';

import { AIStatus } from '@/types';

interface AIStatusIndicatorProps {
  status: AIStatus;
}

const statusLabels: Record<AIStatus, string> = {
  idle: '',
  thinking: 'thinking',
  analyzing_brand: 'analyzing brand',
  crafting_subject: 'crafting subject',
  writing_hero: 'writing hero',
  developing_body: 'writing body',
  creating_cta: 'creating CTA',
  finalizing: 'finalizing',
};

export default function AIStatusIndicator({ status }: AIStatusIndicatorProps) {
  if (status === 'idle') return null;

  return (
    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
      {/* Typing indicator dots */}
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }}></div>
        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1s' }}></div>
        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1s' }}></div>
      </div>
      
      {/* Simple text */}
      <span>{statusLabels[status]}</span>
    </div>
  );
}

