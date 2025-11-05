'use client';

import { AIStatus } from '@/types';
import { memo } from 'react';

interface AIStatusIndicatorProps {
  status: AIStatus;
}

const statusLabels: Record<AIStatus, string> = {
  idle: '',
  thinking: 'thinking through strategy',
  searching_web: 'searching for information',
  analyzing_brand: 'reviewing brand guidelines',
  crafting_subject: 'writing subject line',
  writing_hero: 'writing hero section',
  developing_body: 'writing email body',
  creating_cta: 'writing call-to-action',
  finalizing: 'finalizing email',
};

// Memoized to prevent re-renders
const AIStatusIndicator = memo(function AIStatusIndicator({ status }: AIStatusIndicatorProps) {
  if (status === 'idle') return null;

  return (
    <div 
      className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400 py-2"
      style={{
        // Fixed positioning to prevent jitter
        minHeight: '32px',
        contain: 'layout style paint',
      }}
    >
      {/* Smooth pulsing dots - using pulse instead of bounce */}
      <div className="flex gap-1" style={{ minWidth: '28px' }}>
        <div 
          className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" 
          style={{ 
            animationDelay: '0ms', 
            animationDuration: '1.4s',
            animationTimingFunction: 'cubic-bezier(0.4, 0, 0.6, 1)'
          }}
        ></div>
        <div 
          className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" 
          style={{ 
            animationDelay: '200ms', 
            animationDuration: '1.4s',
            animationTimingFunction: 'cubic-bezier(0.4, 0, 0.6, 1)'
          }}
        ></div>
        <div 
          className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" 
          style={{ 
            animationDelay: '400ms', 
            animationDuration: '1.4s',
            animationTimingFunction: 'cubic-bezier(0.4, 0, 0.6, 1)'
          }}
        ></div>
      </div>
      
      {/* Status text with fixed width to prevent jumping */}
      <span className="font-medium" style={{ minWidth: '120px' }}>{statusLabels[status]}</span>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render when status actually changes
  return prevProps.status === nextProps.status;
});

export default AIStatusIndicator;

