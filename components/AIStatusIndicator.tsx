'use client';

import { AIStatus } from '@/types';
import { useEffect, useState } from 'react';

interface AIStatusIndicatorProps {
  status: AIStatus;
}

// Smarter status configuration with icons, colors, and progress weights
const statusConfig: Record<AIStatus, { 
  label: string; 
  icon: string;
  progress: number; // 0-100
  color: string;
}> = {
  idle: { 
    label: 'Ready', 
    icon: '✓', 
    progress: 0,
    color: 'text-gray-500'
  },
  thinking: { 
    label: 'Thinking', 
    icon: '🤔', 
    progress: 5,
    color: 'text-purple-600 dark:text-purple-400'
  },
  analyzing_brand: { 
    label: 'Analyzing brand', 
    icon: '🎨', 
    progress: 15,
    color: 'text-blue-600 dark:text-blue-400'
  },
  crafting_subject: { 
    label: 'Crafting subject', 
    icon: '✍️', 
    progress: 30,
    color: 'text-cyan-600 dark:text-cyan-400'
  },
  writing_hero: { 
    label: 'Writing hero', 
    icon: '⚡', 
    progress: 50,
    color: 'text-indigo-600 dark:text-indigo-400'
  },
  developing_body: { 
    label: 'Writing body', 
    icon: '📝', 
    progress: 70,
    color: 'text-violet-600 dark:text-violet-400'
  },
  creating_cta: { 
    label: 'Creating CTA', 
    icon: '🎯', 
    progress: 85,
    color: 'text-pink-600 dark:text-pink-400'
  },
  finalizing: { 
    label: 'Finalizing', 
    icon: '✨', 
    progress: 95,
    color: 'text-green-600 dark:text-green-400'
  },
};

export default function AIStatusIndicator({ status }: AIStatusIndicatorProps) {
  const [elapsed, setElapsed] = useState(0);
  const [smoothProgress, setSmoothProgress] = useState(0);

  // Track elapsed time
  useEffect(() => {
    if (status === 'idle') {
      setElapsed(0);
      setSmoothProgress(0);
      return;
    }

    const startTime = Date.now();
    const timer = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 100);

    return () => clearInterval(timer);
  }, [status]);

  // Smooth progress animation
  useEffect(() => {
    if (status === 'idle') {
      setSmoothProgress(0);
      return;
    }

    const targetProgress = statusConfig[status].progress;
    const step = (targetProgress - smoothProgress) / 10;
    
    const animation = setInterval(() => {
      setSmoothProgress(prev => {
        const next = prev + step;
        return next >= targetProgress ? targetProgress : next;
      });
    }, 50);

    return () => clearInterval(animation);
  }, [status]);

  if (status === 'idle') return null;

  const config = statusConfig[status];
  const elapsedSeconds = Math.floor(elapsed / 1000);

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 border border-gray-200 dark:border-gray-700 shadow-sm mb-4">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 dark:from-blue-500/10 dark:via-purple-500/10 dark:to-pink-500/10 animate-pulse" />
      
      {/* Content */}
      <div className="relative px-4 py-3">
        {/* Top section - Status and timer */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2.5">
            {/* Animated icon */}
            <span className="text-xl animate-bounce" style={{ animationDuration: '1.5s' }}>
              {config.icon}
            </span>
            
            {/* Status text */}
            <span className={`text-sm font-semibold ${config.color}`}>
              {config.label}
            </span>
          </div>
          
          {/* Timer */}
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-mono">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{elapsedSeconds}s</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          {/* Background shimmer */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent animate-shimmer" 
               style={{ 
                 animation: 'shimmer 2s infinite linear',
                 backgroundSize: '200% 100%'
               }} 
          />
          
          {/* Progress fill */}
          <div 
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${smoothProgress}%` }}
          >
            {/* Inner glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent" />
          </div>
        </div>

        {/* Progress percentage */}
        <div className="flex justify-between items-center mt-1.5">
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
            {Math.round(smoothProgress)}%
          </span>
          
          {/* Activity dots */}
          <div className="flex gap-1">
            <div className="w-1 h-1 bg-blue-400 dark:bg-blue-500 rounded-full animate-ping" style={{ animationDuration: '1s' }} />
            <div className="w-1 h-1 bg-purple-400 dark:bg-purple-500 rounded-full animate-ping" style={{ animationDuration: '1.2s', animationDelay: '0.1s' }} />
            <div className="w-1 h-1 bg-pink-400 dark:bg-pink-500 rounded-full animate-ping" style={{ animationDuration: '1.4s', animationDelay: '0.2s' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

