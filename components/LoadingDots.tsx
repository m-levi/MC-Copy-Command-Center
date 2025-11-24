'use client';

/**
 * Better loading indicator - pulsing dots instead of spinning circle
 * Much less annoying and more subtle
 */

interface LoadingDotsProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'gray' | 'white';
  className?: string;
}

export default function LoadingDots({ 
  size = 'md', 
  color = 'blue',
  className = '' 
}: LoadingDotsProps) {
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-1.5 h-1.5',
    lg: 'w-2 h-2'
  };

  const colorClasses = {
    blue: 'bg-blue-500 dark:bg-blue-400',
    gray: 'bg-gray-500 dark:bg-gray-400',
    white: 'bg-white'
  };

  const dotClass = `${sizeClasses[size]} ${colorClasses[color]} rounded-full`;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div 
        className={`${dotClass} animate-pulse`} 
        style={{ animationDelay: '0ms', animationDuration: '1.4s' }}
      />
      <div 
        className={`${dotClass} animate-pulse`} 
        style={{ animationDelay: '200ms', animationDuration: '1.4s' }}
      />
      <div 
        className={`${dotClass} animate-pulse`} 
        style={{ animationDelay: '400ms', animationDuration: '1.4s' }}
      />
    </div>
  );
}

/**
 * Simple loading text with dots
 */
export function LoadingText({ 
  text = 'Loading',
  size = 'md'
}: { 
  text?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className="flex items-center gap-2">
      <span className={`${textSizeClasses[size]} text-gray-600 dark:text-gray-400`}>
        {text}
      </span>
      <LoadingDots size={size} color="gray" />
    </div>
  );
}





