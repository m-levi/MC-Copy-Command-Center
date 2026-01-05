'use client';

import { useBackgroundGenerationOptional } from '@/contexts/BackgroundGenerationContext';

interface GeneratingBadgeProps {
  conversationId: string;
  size?: 'sm' | 'md';
}

export default function GeneratingBadge({ conversationId, size = 'sm' }: GeneratingBadgeProps) {
  const bgGeneration = useBackgroundGenerationOptional();
  const isGenerating = bgGeneration?.isGenerating(conversationId);

  if (!isGenerating) {
    return null;
  }

  const sizeClasses = size === 'sm' 
    ? 'w-2.5 h-2.5' 
    : 'w-3.5 h-3.5';

  return (
    <div className="relative flex items-center">
      {/* Outer pulse ring */}
      <span 
        className={`absolute ${sizeClasses} rounded-full bg-blue-400 dark:bg-blue-500 animate-ping opacity-40`} 
      />
      
      {/* Inner dot */}
      <span 
        className={`relative ${sizeClasses} rounded-full bg-gradient-to-r from-blue-500 to-purple-500`}
      >
        {/* Spinning inner element */}
        <span 
          className="absolute inset-0.5 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center"
        >
          <span 
            className="w-1 h-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse"
          />
        </span>
      </span>
    </div>
  );
}

// Inline version that can be used in text
export function GeneratingDot({ conversationId, currentConversationId }: { 
  conversationId: string;
  currentConversationId?: string;
}) {
  const bgGeneration = useBackgroundGenerationOptional();
  const isGenerating = bgGeneration?.isGenerating(conversationId);

  // Don't show badge if this is the currently active conversation
  // (user can see the generation status in the main chat UI)
  if (!isGenerating || conversationId === currentConversationId) {
    return null;
  }

  return (
    <span className="inline-flex items-center ml-1.5">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
      </span>
    </span>
  );
}

