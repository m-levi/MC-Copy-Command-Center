/**
 * Logger utility - only logs in development mode
 * Replaces console.log/error/warn to improve production performance
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  error: (...args: unknown[]) => {
    // Always log errors, but format them better in production
    if (isDevelopment) {
      console.error(...args);
    } else {
      // In production, send to error tracking service if needed
      console.error(...args);
    }
  },
  
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
  
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
};

// Export individual functions for convenience
export const log = logger.log;
export const logError = logger.error;
export const logWarn = logger.warn;
export const logDebug = logger.debug;
export const logInfo = logger.info;
