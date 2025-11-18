/**
 * Centralized API Error Handling
 * Provides consistent error responses and better debugging
 */

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'NOT_FOUND'
  | 'RATE_LIMIT_EXCEEDED'
  | 'EXTERNAL_API_ERROR'
  | 'DATABASE_ERROR'
  | 'INTERNAL_ERROR'
  | 'BAD_REQUEST';

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

    console.error(`[API Error ${id}]`, {
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

    console.error(`[Unexpected Error ${id}]`, {
      message: error.message,
      stack: error.stack,
    });

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

  console.error(`[Unknown Error ${id}]`, error);

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
 * Wrap async route handlers with error handling
 * Supports both single-param and two-param (with params) handlers
 */
export function withErrorHandling<T = any>(
  handler: (req: Request, context?: T) => Promise<Response>
): (req: Request, context?: T) => Promise<Response> {
  return async (req: Request, context?: T) => {
    const requestId = generateRequestId();
    console.log(`[${requestId}] ${req.method} ${req.url}`);

    try {
      return await handler(req, context);
    } catch (error) {
      console.error(`[${requestId}] Error in handler:`, error);
      return createErrorResponse(error, requestId);
    }
  };
}

