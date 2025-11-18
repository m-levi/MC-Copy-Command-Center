/**
 * Error tracking with Sentry
 * Provides centralized error logging and monitoring
 */

let sentryInitialized = false;

/**
 * Initialize Sentry (call this in your app initialization)
 */
export function initErrorTracking() {
  if (sentryInitialized) return;

  try {
    // Only initialize in production or if SENTRY_DSN is set
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      // Dynamic import to avoid bundling Sentry in development
      import('@sentry/nextjs').then((Sentry) => {
        Sentry.init({
          dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
          environment: process.env.NODE_ENV,
          tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
          beforeSend(event, hint) {
            // Filter out sensitive data
            if (event.request) {
              delete event.request.cookies;
              delete event.request.headers?.['authorization'];
            }
            return event;
          },
        });
        sentryInitialized = true;
      });
    }
  } catch (error) {
    console.warn('Failed to initialize Sentry:', error);
  }
}

/**
 * Capture an error
 */
export function captureError(error: Error, context?: Record<string, any>) {
  if (!sentryInitialized) {
    console.error('Error (Sentry not initialized):', error, context);
    return;
  }

  try {
    // Dynamic import
    import('@sentry/nextjs').then((Sentry) => {
      Sentry.captureException(error, {
        contexts: {
          custom: context || {},
        },
      });
    });
  } catch (e) {
    console.error('Failed to capture error:', e);
  }
}

/**
 * Capture a message (non-error)
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (!sentryInitialized) {
    console.log(`[${level.toUpperCase()}]`, message);
    return;
  }

  try {
    import('@sentry/nextjs').then((Sentry) => {
      Sentry.captureMessage(message, level);
    });
  } catch (e) {
    console.error('Failed to capture message:', e);
  }
}

/**
 * Set user context for error tracking
 */
export function setUserContext(userId: string, email?: string) {
  if (!sentryInitialized) return;

  try {
    import('@sentry/nextjs').then((Sentry) => {
      Sentry.setUser({
        id: userId,
        email: email,
      });
    });
  } catch (e) {
    console.error('Failed to set user context:', e);
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, category?: string, data?: Record<string, any>) {
  if (!sentryInitialized) return;

  try {
    import('@sentry/nextjs').then((Sentry) => {
      Sentry.addBreadcrumb({
        message,
        category: category || 'custom',
        data,
        level: 'info',
      });
    });
  } catch (e) {
    // Silently fail
  }
}




