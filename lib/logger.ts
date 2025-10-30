/**
 * Production-safe logger utility
 * Replaces console.log calls to prevent sensitive data exposure
 */

const IS_DEV = process.env.NODE_ENV === 'development';
const IS_DEBUG = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

export const logger = {
  /**
   * Log general information (only in development)
   */
  log: (...args: any[]) => {
    if (IS_DEV || IS_DEBUG) {
      console.log(...args);
    }
  },
  
  /**
   * Log errors (always shown, also sent to error tracking)
   */
  error: (...args: any[]) => {
    console.error(...args);
    // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
    // if (typeof window !== 'undefined' && window.Sentry) {
    //   window.Sentry.captureException(args[0]);
    // }
  },
  
  /**
   * Log warnings (only in development)
   */
  warn: (...args: any[]) => {
    if (IS_DEV || IS_DEBUG) {
      console.warn(...args);
    }
  },
  
  /**
   * Log debug information (only when DEBUG_MODE is enabled)
   */
  debug: (...args: any[]) => {
    if (IS_DEBUG) {
      console.debug(...args);
    }
  },
  
  /**
   * Log information with context (for structured logging)
   */
  info: (message: string, context?: Record<string, any>) => {
    if (IS_DEV || IS_DEBUG) {
      if (context) {
        console.log(`[INFO] ${message}`, context);
      } else {
        console.log(`[INFO] ${message}`);
      }
    }
  },
};

export default logger;

