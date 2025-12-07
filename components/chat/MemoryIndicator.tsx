'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BrainIcon, SparklesIcon, XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MemoryEvent {
  id: string;
  type: 'saved' | 'recalled' | 'learning';
  content: string;
  timestamp: Date;
}

interface MemoryIndicatorProps {
  events: MemoryEvent[];
  onDismiss?: (id: string) => void;
  className?: string;
}

export function MemoryIndicator({ events, onDismiss, className }: MemoryIndicatorProps) {
  return (
    <div className={cn("fixed bottom-24 right-6 z-50 flex flex-col gap-2 max-w-sm", className)}>
      <AnimatePresence mode="popLayout">
        {events.map((event) => (
          <MemoryNotificationCard
            key={event.id}
            event={event}
            onDismiss={() => onDismiss?.(event.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface MemoryNotificationCardProps {
  event: MemoryEvent;
  onDismiss?: () => void;
}

function MemoryNotificationCard({ event, onDismiss }: MemoryNotificationCardProps) {
  // Auto-dismiss after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss?.();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const getIcon = () => {
    switch (event.type) {
      case 'saved':
        return <BrainIcon className="w-4 h-4 text-purple-500" />;
      case 'recalled':
        return <SparklesIcon className="w-4 h-4 text-blue-500" />;
      case 'learning':
        return <BrainIcon className="w-4 h-4 text-green-500 animate-pulse" />;
    }
  };

  const getMessage = () => {
    switch (event.type) {
      case 'saved':
        return 'Memory saved';
      case 'recalled':
        return 'Memory recalled';
      case 'learning':
        return 'Learning...';
    }
  };

  const getBgColor = () => {
    switch (event.type) {
      case 'saved':
        return 'bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800';
      case 'recalled':
        return 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800';
      case 'learning':
        return 'bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.8 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className={cn(
        "relative flex items-start gap-3 p-3 rounded-lg border shadow-lg backdrop-blur-sm",
        getBgColor()
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
          {getMessage()}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
          {event.content}
        </p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-1 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded transition-colors"
        >
          <XIcon className="w-3 h-3 text-gray-400" />
        </button>
      )}
    </motion.div>
  );
}

// Inline memory badge for showing in chat messages
interface MemoryBadgeProps {
  type: 'saved' | 'recalled';
  className?: string;
}

export function MemoryBadge({ type, className }: MemoryBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
        type === 'saved' 
          ? "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300"
          : "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300",
        className
      )}
    >
      {type === 'saved' ? (
        <>
          <BrainIcon className="w-3 h-3" />
          Remembered
        </>
      ) : (
        <>
          <SparklesIcon className="w-3 h-3" />
          Recalled
        </>
      )}
    </span>
  );
}

export default MemoryIndicator;









