/**
 * Client-side error helpers for fetch/API calls.
 *
 * Distinguishes real network failures (offline, DNS, connection refused) from
 * server-side errors (5xx, malformed JSON, etc.) so the UI can show an accurate
 * message instead of always blaming the network.
 */

/**
 * Returns true only when the error is a genuine client-side network failure:
 * a `fetch` rejection (TypeError) while the browser reports being offline, or
 * an explicit network-failure error name. Server errors that happen to mention
 * "network" in their message are not counted.
 */
export function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return true;
  }

  if (!(error instanceof Error)) return false;

  // `fetch` throws TypeError when it can't reach the server at all.
  if (error.name === 'TypeError' && /fetch|network/i.test(error.message)) {
    return true;
  }

  return error.name === 'NetworkError';
}

/**
 * Produce a user-facing message for a caught fetch/API error. Prefers the
 * error's own message when it's informative, falls back to a generic
 * description that matches the actual failure mode.
 */
export function getClientErrorMessage(
  error: unknown,
  fallback: string = 'Something went wrong. Please try again.'
): string {
  if (isNetworkError(error)) {
    return "Can't reach the server. Check your internet connection and try again.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
