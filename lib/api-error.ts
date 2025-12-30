/**
 * Centralized API Error Handling
 * Provides consistent error responses and better debugging
 */

import { logger } from '@/lib/logger';
import { captureError } from '@/lib/error-tracking';

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'NOT_FOUND'
  | 'RATE_LIMIT_EXCEEDED'
  | 'EXTERNAL_API_ERROR'
  | 'DATABASE_ERROR'
  | 'INTERNAL_ERROR'
  | 'BAD_REQUEST'
  | 'CONFLICT'
  | 'PAYLOAD_TOO_LARGE'
  | 'SERVICE_UNAVAILABLE';

export interface APIError {
  code: ErrorCode;
  message: string;
  details?: string;
  requestId?: string;
  timestamp: string;
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public statusCode: number = 500,
    public details?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Generate a simple request ID for tracking
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: unknown,
  requestId?: string
): Response {
  const timestamp = new Date().toISOString();
  const id = requestId || generateRequestId();

  // Handle our custom errors
  if (error instanceof AppError) {
    const errorResponse: APIError = {
      code: error.code,
      message: error.message,
      details: error.details,
      requestId: id,
      timestamp,
    };

    logger.error(`[API Error ${id}]`, {
      code: error.code,
      message: error.message,
      details: error.details,
      stack: error.stack,
    });

    return new Response(JSON.stringify(errorResponse), {
      status: error.statusCode,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': id,
      },
    });
  }

  // Handle standard errors
  if (error instanceof Error) {
    const errorResponse: APIError = {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      requestId: id,
      timestamp,
    };

    logger.error(`[Unexpected Error ${id}]`, {
      message: error.message,
      stack: error.stack,
    });

    // Track unexpected errors in production
    captureError(error, { requestId: id, type: 'unexpected' });

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': id,
      },
    });
  }

  // Handle unknown errors
  const errorResponse: APIError = {
    code: 'INTERNAL_ERROR',
    message: 'An unknown error occurred',
    details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
    requestId: id,
    timestamp,
  };

  logger.error(`[Unknown Error ${id}]`, error);

  // Track unknown errors in production
  captureError(new Error(String(error)), { requestId: id, type: 'unknown' });

  return new Response(JSON.stringify(errorResponse), {
    status: 500,
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': id,
    },
  });
}

/**
 * Validation error helper
 */
export function validationError(message: string, details?: string): Response {
  return createErrorResponse(
    new AppError('VALIDATION_ERROR', message, 400, details)
  );
}

/**
 * Authentication error helper
 */
export function authenticationError(message: string = 'Unauthorized'): Response {
  return createErrorResponse(
    new AppError('AUTHENTICATION_ERROR', message, 401)
  );
}

/**
 * Authorization error helper
 */
export function authorizationError(message: string = 'Forbidden'): Response {
  return createErrorResponse(
    new AppError('AUTHORIZATION_ERROR', message, 403)
  );
}

/**
 * Not found error helper
 */
export function notFoundError(resource: string): Response {
  return createErrorResponse(
    new AppError('NOT_FOUND', `${resource} not found`, 404)
  );
}

/**
 * External API error helper
 */
export function externalAPIError(
  service: string,
  details?: string
): Response {
  return createErrorResponse(
    new AppError(
      'EXTERNAL_API_ERROR',
      `Failed to communicate with ${service}`,
      502,
      details
    )
  );
}

/**
 * Database error helper
 */
export function databaseError(operation: string, details?: string): Response {
  return createErrorResponse(
    new AppError(
      'DATABASE_ERROR',
      `Database ${operation} failed`,
      500,
      details
    )
  );
}

/**
 * Rate limit exceeded error helper
 */
export function rateLimitError(retryAfter?: number): Response {
  const response = createErrorResponse(
    new AppError(
      'RATE_LIMIT_EXCEEDED',
      'Too many requests. Please try again later.',
      429
    )
  );

  // Add Retry-After header if provided
  if (retryAfter) {
    const headers = new Headers(response.headers);
    headers.set('Retry-After', String(retryAfter));
    return new Response(response.body, {
      status: 429,
      headers,
    });
  }

  return response;
}

/**
 * Conflict error helper (for duplicate resources, etc.)
 */
export function conflictError(message: string, details?: string): Response {
  return createErrorResponse(
    new AppError('CONFLICT', message, 409, details)
  );
}

/**
 * Payload too large error helper
 */
export function payloadTooLargeError(maxSize: string): Response {
  return createErrorResponse(
    new AppError(
      'PAYLOAD_TOO_LARGE',
      `Request payload exceeds maximum size of ${maxSize}`,
      413
    )
  );
}

/**
 * Service unavailable error helper
 */
export function serviceUnavailableError(service: string, details?: string): Response {
  return createErrorResponse(
    new AppError(
      'SERVICE_UNAVAILABLE',
      `${service} is temporarily unavailable`,
      503,
      details
    )
  );
}

/**
 * Bad request error helper
 */
export function badRequestError(message: string, details?: string): Response {
  return createErrorResponse(
    new AppError('BAD_REQUEST', message, 400, details)
  );
}

// ============================================
// Throwable Error Helpers (for use with withErrorHandling)
// ============================================

/**
 * Throw a validation error (use inside withErrorHandling)
 */
export function throwValidationError(message: string, details?: string): never {
  throw new AppError('VALIDATION_ERROR', message, 400, details);
}

/**
 * Throw an authentication error (use inside withErrorHandling)
 */
export function throwAuthenticationError(message: string = 'Please sign in to continue'): never {
  throw new AppError('AUTHENTICATION_ERROR', message, 401);
}

/**
 * Throw an authorization error (use inside withErrorHandling)
 */
export function throwAuthorizationError(message: string = 'You do not have permission to perform this action'): never {
  throw new AppError('AUTHORIZATION_ERROR', message, 403);
}

/**
 * Throw a not found error (use inside withErrorHandling)
 */
export function throwNotFoundError(resource: string): never {
  throw new AppError('NOT_FOUND', `${resource} not found`, 404);
}

/**
 * Throw a database error (use inside withErrorHandling)
 */
export function throwDatabaseError(operation: string, details?: string): never {
  throw new AppError('DATABASE_ERROR', `Database ${operation} failed`, 500, details);
}

/**
 * Throw a rate limit error (use inside withErrorHandling)
 */
export function throwRateLimitError(): never {
  throw new AppError('RATE_LIMIT_EXCEEDED', 'Too many requests. Please try again later.', 429);
}

// ============================================
// Supabase Error Handling
// ============================================

/**
 * Sanitize Supabase/Postgres error messages for client display
 * Prevents leaking internal database details
 */
export function sanitizeSupabaseError(error: { message?: string; code?: string; details?: string }): string {
  // Common Supabase/Postgres error codes and their user-friendly messages
  const errorMap: Record<string, string> = {
    '23505': 'A record with this information already exists',
    '23503': 'This operation references a record that does not exist',
    '23502': 'Required information is missing',
    '22P02': 'Invalid data format',
    '42501': 'You do not have permission to perform this action',
    'PGRST116': 'Record not found',
    'PGRST204': 'No records found',
    '42P01': 'Database configuration error',
    '28P01': 'Authentication failed',
  };

  if (error.code && errorMap[error.code]) {
    return errorMap[error.code];
  }

  // Check for common error patterns in message
  const message = error.message || '';

  if (message.includes('duplicate key')) {
    return 'A record with this information already exists';
  }
  if (message.includes('foreign key')) {
    return 'This operation references a record that does not exist';
  }
  if (message.includes('not-null')) {
    return 'Required information is missing';
  }
  if (message.includes('permission denied') || message.includes('RLS')) {
    return 'You do not have permission to perform this action';
  }

  // Return generic message for unknown errors (don't expose internals)
  return 'An error occurred while processing your request';
}

/**
 * Handle Supabase error and throw appropriate AppError
 */
export function handleSupabaseError(
  error: { message?: string; code?: string; details?: string },
  operation: string
): never {
  const sanitizedMessage = sanitizeSupabaseError(error);

  // Determine the appropriate error type based on error code
  if (error.code === '23505') {
    throw new AppError('CONFLICT', sanitizedMessage, 409);
  }
  if (error.code === '42501' || error.message?.includes('RLS')) {
    throw new AppError('AUTHORIZATION_ERROR', sanitizedMessage, 403);
  }
  if (error.code === 'PGRST116') {
    throw new AppError('NOT_FOUND', sanitizedMessage, 404);
  }

  throw new AppError('DATABASE_ERROR', sanitizedMessage, 500, `Operation: ${operation}`);
}

/**
 * Wrap async route handlers with error handling
 * Supports both single-param and two-param (with params) handlers
 * Accepts both Request and NextRequest types
 */
export function withErrorHandling<T = any, R extends Request = Request>(
  handler: (req: R, context?: T) => Promise<Response>
): (req: R, context?: T) => Promise<Response> {
  return async (req: R, context?: T) => {
    const requestId = generateRequestId();
    logger.log(`[${requestId}] ${req.method} ${req.url}`);

    try {
      return await handler(req, context);
    } catch (error) {
      logger.error(`[${requestId}] Error in handler:`, error);
      return createErrorResponse(error, requestId);
    }
  };
}

