'use client';

import { forwardRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { announceToScreenReader } from '@/lib/accessibility';

/**
 * Visually Hidden component
 * Hides content visually while keeping it accessible to screen readers
 */
interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  /** If true, becomes visible when focused (for skip links) */
  focusable?: boolean;
}

export const VisuallyHidden = forwardRef<HTMLSpanElement, VisuallyHiddenProps>(
  function VisuallyHidden({ children, focusable = false, className, ...props }, ref) {
    return (
      <span
        ref={ref}
        className={cn(
          focusable ? 'sr-only-focusable' : 'sr-only',
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

/**
 * Skip Link component
 * Allows keyboard users to skip to main content
 */
interface SkipLinkProps {
  /** ID of the target element to skip to */
  targetId: string;
  /** Label for the skip link */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

export function SkipLink({
  targetId,
  label = 'Skip to main content',
  className,
}: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        'sr-only focus:not-sr-only',
        'focus:fixed focus:top-4 focus:left-4 focus:z-[9999]',
        'focus:px-4 focus:py-2',
        'focus:bg-white dark:focus:bg-gray-900',
        'focus:text-gray-900 dark:focus:text-white',
        'focus:rounded-lg focus:shadow-lg',
        'focus:outline-none focus:ring-2 focus:ring-blue-500',
        'font-medium text-sm',
        className
      )}
    >
      {label}
    </a>
  );
}

/**
 * Live Region component
 * Announces dynamic content changes to screen readers
 */
interface LiveRegionProps {
  /** The message to announce */
  message: string;
  /** Priority level */
  priority?: 'polite' | 'assertive';
  /** Whether the region is atomic (announces whole region) */
  atomic?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function LiveRegion({
  message,
  priority = 'polite',
  atomic = true,
  className,
}: LiveRegionProps) {
  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic={atomic}
      className={cn('sr-only', className)}
    >
      {message}
    </div>
  );
}

/**
 * Hook version of LiveRegion for imperative announcements
 */
export function useAnnounce() {
  return {
    announce: (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      announceToScreenReader(message, priority);
    },
    announcePolite: (message: string) => {
      announceToScreenReader(message, 'polite');
    },
    announceAssertive: (message: string) => {
      announceToScreenReader(message, 'assertive');
    },
  };
}

/**
 * Loading Announcement component
 * Announces loading state to screen readers
 */
interface LoadingAnnouncementProps {
  /** Whether loading is in progress */
  isLoading: boolean;
  /** Loading message */
  loadingMessage?: string;
  /** Completed message */
  completedMessage?: string;
}

export function LoadingAnnouncement({
  isLoading,
  loadingMessage = 'Loading...',
  completedMessage = 'Content loaded',
}: LoadingAnnouncementProps) {
  const [announced, setAnnounced] = useState(false);

  useEffect(() => {
    if (isLoading && !announced) {
      announceToScreenReader(loadingMessage, 'polite');
      setAnnounced(true);
    } else if (!isLoading && announced) {
      announceToScreenReader(completedMessage, 'polite');
      setAnnounced(false);
    }
  }, [isLoading, announced, loadingMessage, completedMessage]);

  return null;
}

/**
 * Accessible Icon Button
 * Icon-only button with proper accessibility
 */
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible label (required for icon-only buttons) */
  label: string;
  /** Icon element */
  icon: React.ReactNode;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Visual variant */
  variant?: 'default' | 'ghost' | 'outline';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { label, icon, size = 'md', variant = 'default', className, disabled, ...props },
    ref
  ) {
    const sizeClasses = {
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-12 h-12',
    };

    const variantClasses = {
      default: 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700',
      ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800',
      outline: 'border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800',
    };

    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center rounded-lg',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'touch-target touch-feedback',
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {icon}
        <VisuallyHidden>{label}</VisuallyHidden>
      </button>
    );
  }
);

/**
 * Accessible Description
 * Associates a description with a form field or other element
 */
interface DescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  /** The description text */
  children: React.ReactNode;
}

export const Description = forwardRef<HTMLParagraphElement, DescriptionProps>(
  function Description({ children, className, ...props }, ref) {
    return (
      <p
        ref={ref}
        className={cn('text-sm text-gray-500 dark:text-gray-400', className)}
        {...props}
      >
        {children}
      </p>
    );
  }
);

/**
 * Accessible Error Message
 * Displays error messages with proper ARIA attributes
 */
interface ErrorMessageProps extends React.HTMLAttributes<HTMLParagraphElement> {
  /** The error message */
  children: React.ReactNode;
  /** ID for aria-describedby */
  id?: string;
}

export const ErrorMessage = forwardRef<HTMLParagraphElement, ErrorMessageProps>(
  function ErrorMessage({ children, id, className, ...props }, ref) {
    return (
      <p
        ref={ref}
        id={id}
        role="alert"
        aria-live="polite"
        className={cn('text-sm text-red-600 dark:text-red-400', className)}
        {...props}
      >
        {children}
      </p>
    );
  }
);

/**
 * Heading with proper hierarchy tracking
 */
interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Heading level (1-6) */
  level: 1 | 2 | 3 | 4 | 5 | 6;
  /** Heading content */
  children: React.ReactNode;
  /** Visual size (can differ from semantic level) */
  visualLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}

export function Heading({ level, children, visualLevel, className, ...props }: HeadingProps) {
  const Tag = `h${level}` as const;

  const sizeClasses = {
    1: 'text-3xl font-bold',
    2: 'text-2xl font-bold',
    3: 'text-xl font-semibold',
    4: 'text-lg font-semibold',
    5: 'text-base font-medium',
    6: 'text-sm font-medium',
  };

  return (
    <Tag
      className={cn(sizeClasses[visualLevel || level], className)}
      {...props}
    >
      {children}
    </Tag>
  );
}

// Add CSS for sr-only and sr-only-focusable if not in globals.css
// These should be in globals.css but we include them here for reference:
// .sr-only {
//   position: absolute;
//   width: 1px;
//   height: 1px;
//   padding: 0;
//   margin: -1px;
//   overflow: hidden;
//   clip: rect(0, 0, 0, 0);
//   white-space: nowrap;
//   border: 0;
// }
// .sr-only-focusable:focus {
//   position: static;
//   width: auto;
//   height: auto;
//   padding: inherit;
//   margin: inherit;
//   overflow: visible;
//   clip: auto;
//   white-space: normal;
// }
