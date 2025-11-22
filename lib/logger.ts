/**
 * Logger utility - only logs in development mode
 * Replaces console.log/error/warn to improve production performance
 */

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Format an error object for better logging
 */
function formatError(error: unknown): string {
  if (!error) return 'Unknown error';
  
  if (error instanceof Error) {
    return `${error.name}: ${error.message}${error.stack ? '\n' + error.stack : ''}`;
  }
  
  if (typeof error === 'object') {
    // Handle Supabase error objects and other plain objects
    const obj = error as Record<string, unknown>;
    
    // Try common error properties
    const message = obj.message || obj.error || obj.details || obj.hint;
    const code = obj.code || obj.statusCode || obj.status;
    
    if (message || code) {
      const parts = [];
      if (code) parts.push(`[${code}]`);
      if (message && String(message).trim()) {
        parts.push(String(message));
      }
      
      // Add additional details if available
      if (obj.details && obj.details !== message && String(obj.details).trim()) {
        parts.push(`Details: ${obj.details}`);
      }
      if (obj.hint && obj.hint !== message && String(obj.hint).trim()) {
        parts.push(`Hint: ${obj.hint}`);
      }
      
      // If we have some parts, return them
      if (parts.length > 0) {
        return parts.join(' ');
      }
    }
    
    // Fallback to JSON stringify
    try {
      const json = JSON.stringify(error, null, 2);
      if (json === '{}' || json === '{"message":""}') {
        return 'Error object (no details available)';
      }
      return json;
    } catch {
      return String(error);
    }
  }
  
  return String(error);
}

export const logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  error: (...args: unknown[]) => {
    // Format error objects for better readability
    const formattedArgs = args.map(arg => {
      if (arg instanceof Error || (typeof arg === 'object' && arg !== null && !Array.isArray(arg))) {
        // Check if it looks like an error object
        const obj = arg as Record<string, unknown>;
        if ('message' in obj || 'error' in obj || 'code' in obj || arg instanceof Error) {
          return formatError(arg);
        }
      }
      return arg;
    });
    
    // Always log errors, but format them better in production
    if (isDevelopment) {
      console.error(...formattedArgs);
    } else {
      // In production, send to error tracking service if needed
      console.error(...formattedArgs);
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
