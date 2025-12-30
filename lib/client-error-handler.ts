/**
 * Client-Side Error Handler
 * Provides consistent error handling for API responses in client components
 */

import toast from 'react-hot-toast';
import { logger } from '@/lib/logger';

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
  | 'SERVICE_UNAVAILABLE'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

export interface APIErrorResponse {
  code: ErrorCode;
  message: string;
  details?: string;
  requestId?: string;
  timestamp?: string;
}

export interface ClientError {
  code: ErrorCode;
  message: string;
  details?: string;
  requestId?: string;
  statusCode: number;
  isRetryable: boolean;
}

/**
 * Default user-friendly messages for error codes
 */
const DEFAULT_ERROR_MESSAGES: Record<ErrorCode, string> = {
  VALIDATION_ERROR: 'Please check your input and try again',
  AUTHENTICATION_ERROR: 'Please sign in to continue',
  AUTHORIZATION_ERROR: 'You do not have permission to perform this action',
  NOT_FOUND: 'The requested resource was not found',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait a moment and try again',
  EXTERNAL_API_ERROR: 'An external service is temporarily unavailable',
  DATABASE_ERROR: 'A database error occurred. Please try again',
  INTERNAL_ERROR: 'An unexpected error occurred. Please try again',
  BAD_REQUEST: 'Invalid request. Please check your input',
  CONFLICT: 'This action conflicts with an existing resource',
  PAYLOAD_TOO_LARGE: 'The data you are trying to send is too large',
  SERVICE_UNAVAILABLE: 'Service is temporarily unavailable. Please try again later',
  NETWORK_ERROR: 'Network connection error. Please check your connection',
  UNKNOWN_ERROR: 'An unexpected error occurred',
};

/**
 * Errors that can be retried
 */
const RETRYABLE_ERRORS: ErrorCode[] = [
  'RATE_LIMIT_EXCEEDED',
  'EXTERNAL_API_ERROR',
  'SERVICE_UNAVAILABLE',
  'NETWORK_ERROR',
  'DATABASE_ERROR',
];

/**
 * Parse an API error response
 */
export function parseAPIError(response: Response, data: any): ClientError {
  // Check if response has structured error format
  if (data && data.code && data.message) {
    return {
      code: data.code as ErrorCode,
      message: data.message,
      details: data.details,
      requestId: data.requestId,
      statusCode: response.status,
      isRetryable: RETRYABLE_ERRORS.includes(data.code as ErrorCode),
    };
  }

  // Handle legacy error formats
  if (data && data.error) {
    const statusCode = response.status;
    const code = statusCodeToErrorCode(statusCode);
    return {
      code,
      message: typeof data.error === 'string' ? data.error : DEFAULT_ERROR_MESSAGES[code],
      details: data.details,
      statusCode,
      isRetryable: RETRYABLE_ERRORS.includes(code),
    };
  }

  // Handle completely unknown error format
  const code = statusCodeToErrorCode(response.status);
  return {
    code,
    message: DEFAULT_ERROR_MESSAGES[code],
    statusCode: response.status,
    isRetryable: RETRYABLE_ERRORS.includes(code),
  };
}

/**
 * Convert HTTP status code to error code
 */
function statusCodeToErrorCode(statusCode: number): ErrorCode {
  switch (statusCode) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'AUTHENTICATION_ERROR';
    case 403:
      return 'AUTHORIZATION_ERROR';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 413:
      return 'PAYLOAD_TOO_LARGE';
    case 429:
      return 'RATE_LIMIT_EXCEEDED';
    case 500:
      return 'INTERNAL_ERROR';
    case 502:
      return 'EXTERNAL_API_ERROR';
    case 503:
      return 'SERVICE_UNAVAILABLE';
    default:
      return 'UNKNOWN_ERROR';
  }
}

/**
 * Handle API response and throw ClientError if not ok
 */
export async function handleAPIResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return response.json();
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  const error = parseAPIError(response, data);
  throw error;
}

/**
 * Show error toast with appropriate styling
 */
export function showErrorToast(error: ClientError | Error | string, options?: {
  showRequestId?: boolean;
  customMessage?: string;
}): void {
  let message: string;
  let requestId: string | undefined;

  if (typeof error === 'string') {
    message = error;
  } else if ('code' in error && 'message' in error) {
    // ClientError
    message = options?.customMessage || error.message;
    requestId = error.requestId;
  } else if (error instanceof Error) {
    message = options?.customMessage || error.message || 'An unexpected error occurred';
  } else {
    message = 'An unexpected error occurred';
  }

  // Show toast with optional request ID
  if (options?.showRequestId && requestId) {
    toast.error(`${message}\n(Request ID: ${requestId})`, { duration: 5000 });
  } else {
    toast.error(message, { duration: 4000 });
  }
}

/**
 * Log error to console with context
 */
export function logClientError(
  error: ClientError | Error | unknown,
  context?: string
): void {
  if ('code' in (error as any)) {
    const clientError = error as ClientError;
    logger.error(`[Client Error${context ? ` - ${context}` : ''}]`, {
      code: clientError.code,
      message: clientError.message,
      details: clientError.details,
      requestId: clientError.requestId,
      statusCode: clientError.statusCode,
    });
  } else if (error instanceof Error) {
    logger.error(`[Client Error${context ? ` - ${context}` : ''}]`, {
      message: error.message,
      stack: error.stack,
    });
  } else {
    logger.error(`[Client Error${context ? ` - ${context}` : ''}]`, error);
  }
}

/**
 * Handle fetch errors (network errors, etc.)
 */
export function handleFetchError(error: unknown): ClientError {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      code: 'NETWORK_ERROR',
      message: DEFAULT_ERROR_MESSAGES.NETWORK_ERROR,
      statusCode: 0,
      isRetryable: true,
    };
  }

  if ('code' in (error as any)) {
    return error as ClientError;
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: error instanceof Error ? error.message : DEFAULT_ERROR_MESSAGES.UNKNOWN_ERROR,
    statusCode: 0,
    isRetryable: false,
  };
}

/**
 * Wrapper for fetch that handles errors consistently
 */
export async function fetchWithErrorHandling<T>(
  url: string,
  options?: RequestInit,
  context?: string
): Promise<T> {
  try {
    const response = await fetch(url, options);
    return await handleAPIResponse<T>(response);
  } catch (error) {
    const clientError = handleFetchError(error);
    logClientError(clientError, context);
    throw clientError;
  }
}

/**
 * Create a retry wrapper for API calls
 */
export function createRetryableRequest<T>(
  requestFn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    delayMs?: number;
    onRetry?: (attempt: number, error: ClientError) => void;
  }
): () => Promise<T> {
  const maxRetries = options?.maxRetries ?? 3;
  const delayMs = options?.delayMs ?? 1000;

  return async () => {
    let lastError: ClientError | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        const clientError = handleFetchError(error);
        lastError = clientError;

        if (!clientError.isRetryable || attempt === maxRetries) {
          throw clientError;
        }

        options?.onRetry?.(attempt, clientError);

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }

    throw lastError;
  };
}

/**
 * Check if an error requires authentication redirect
 */
export function requiresAuthRedirect(error: ClientError): boolean {
  return error.code === 'AUTHENTICATION_ERROR';
}

/**
 * Check if an error is a rate limit error
 */
export function isRateLimitError(error: ClientError): boolean {
  return error.code === 'RATE_LIMIT_EXCEEDED';
}

/**
 * Get retry-after time from rate limit error (in seconds)
 */
export function getRetryAfter(headers: Headers): number | null {
  const retryAfter = headers.get('Retry-After');
  if (retryAfter) {
    const seconds = parseInt(retryAfter, 10);
    return isNaN(seconds) ? null : seconds;
  }
  return null;
}
