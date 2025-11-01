import { useCallback, useState } from 'react';
import { trackError } from '@/lib/analytics';
import toast from 'react-hot-toast';

export interface ErrorState {
  hasError: boolean;
  error: Error | null;
  context?: string;
}

/**
 * Hook for handling errors in functional components
 * Provides consistent error handling across the app
 */
export function useErrorHandler(context: string = 'Unknown') {
  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    error: null,
    context,
  });

  /**
   * Handle an error - log it, track it, and optionally show toast
   */
  const handleError = useCallback((
    error: Error | unknown,
    options: {
      showToast?: boolean;
      toastMessage?: string;
      silent?: boolean;
    } = {}
  ) => {
    const {
      showToast = true,
      toastMessage,
      silent = false,
    } = options;

    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    // Log error
    if (!silent) {
      console.error(`[${context}] Error:`, errorObj);
    }

    // Track error
    trackError(errorObj, context);

    // Update state
    setErrorState({
      hasError: true,
      error: errorObj,
      context,
    });

    // Show toast notification
    if (showToast) {
      toast.error(toastMessage || errorObj.message || 'An error occurred');
    }

    return errorObj;
  }, [context]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setErrorState({
      hasError: false,
      error: null,
      context,
    });
  }, [context]);

  /**
   * Wrap an async function with error handling
   */
  const withErrorHandling = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    options: {
      showToast?: boolean;
      toastMessage?: string;
      onError?: (error: Error) => void;
    } = {}
  ) => {
    return async (...args: T): Promise<R | null> => {
      try {
        return await fn(...args);
      } catch (error) {
        const errorObj = handleError(error, options);
        options.onError?.(errorObj);
        return null;
      }
    };
  }, [handleError]);

  /**
   * Try-catch wrapper for sync functions
   */
  const tryCatch = useCallback(<T extends any[], R>(
    fn: (...args: T) => R,
    fallback?: R,
    options: {
      showToast?: boolean;
      toastMessage?: string;
    } = {}
  ) => {
    return (...args: T): R | typeof fallback => {
      try {
        return fn(...args);
      } catch (error) {
        handleError(error, options);
        return fallback as R;
      }
    };
  }, [handleError]);

  return {
    errorState,
    handleError,
    clearError,
    withErrorHandling,
    tryCatch,
  };
}

/**
 * Helper to check if error is retryable
 */
export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('fetch failed') ||
    message.includes('connection')
  );
}

/**
 * Helper to get user-friendly error message
 */
export function getUserFriendlyErrorMessage(error: Error): string {
  const message = error.message.toLowerCase();
  
  if (message.includes('network') || message.includes('fetch failed')) {
    return 'Network error. Please check your connection.';
  }
  
  if (message.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }
  
  if (message.includes('unauthorized') || message.includes('403')) {
    return 'You don\'t have permission to perform this action.';
  }
  
  if (message.includes('not found') || message.includes('404')) {
    return 'The requested resource was not found.';
  }
  
  if (message.includes('rate limit')) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  
  // Default to original message if no specific match
  return error.message || 'An unexpected error occurred.';
}

