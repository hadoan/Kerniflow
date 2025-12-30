import { ApiError, normalizeError } from "@corely/api-client";

/**
 * POS-specific error handling with offline-aware behavior
 *
 * This module determines how errors should be handled in the POS context,
 * particularly considering offline/online status and retry-ability.
 */

export type ErrorHandlingStrategy =
  | { type: "queue"; reason: string } // Queue for later sync
  | { type: "show"; reason: string } // Show to user, do not retry
  | { type: "retry"; reason: string; maxRetries?: number } // Retry with backoff
  | { type: "auth"; reason: string }; // Trigger re-auth flow

export interface ErrorHandlingOptions {
  isOnline: boolean;
  isIdempotent?: boolean;
  currentRetryCount?: number;
  maxRetries?: number;
}

/**
 * Determine how to handle an error in POS context
 *
 * @param error - The error that occurred
 * @param options - Context about network status and retry state
 * @returns Strategy for handling the error
 */
export function determineErrorStrategy(
  error: unknown,
  options: ErrorHandlingOptions
): ErrorHandlingStrategy {
  const apiError = error instanceof ApiError ? error : normalizeError(error);

  // 1. Handle network/offline errors
  if (!options.isOnline || apiError.isNetworkError) {
    return {
      type: "queue",
      reason: "No connection - action queued for sync when online",
    };
  }

  // 2. Handle authentication errors
  if (apiError.isUnauthorized()) {
    return {
      type: "auth",
      reason: "Authentication required - please log in again",
    };
  }

  // 3. Handle validation errors (400) - DO NOT RETRY
  if (apiError.isValidationError()) {
    return {
      type: "show",
      reason: "Validation error - user must fix the input",
    };
  }

  // 4. Handle business logic conflicts (409) - DO NOT RETRY
  if (apiError.isConflict()) {
    return {
      type: "show",
      reason: "Business rule violation - user action required",
    };
  }

  // 5. Handle permission errors (403) - DO NOT RETRY
  if (apiError.isForbidden()) {
    return {
      type: "show",
      reason: "Insufficient permissions",
    };
  }

  // 6. Handle not found (404) - typically don't retry
  if (apiError.isNotFound()) {
    return {
      type: "show",
      reason: "Resource not found",
    };
  }

  // 7. Handle retryable server errors (502, 503, 504)
  if (apiError.isRetryable()) {
    const currentRetry = options.currentRetryCount ?? 0;
    const maxRetries = options.maxRetries ?? 3;

    if (currentRetry >= maxRetries) {
      return {
        type: "show",
        reason: `Server error - maximum retries (${maxRetries}) exceeded`,
      };
    }

    // Only retry if operation is idempotent
    if (options.isIdempotent) {
      return {
        type: "retry",
        reason: "Temporary server issue - retrying...",
        maxRetries,
      };
    }

    return {
      type: "show",
      reason: "Server error - operation not safe to retry automatically",
    };
  }

  // 8. Other server errors (500) - show to user
  if (apiError.isServerError()) {
    return {
      type: "show",
      reason: "Server error occurred",
    };
  }

  // 9. Unknown/client errors - show to user
  return {
    type: "show",
    reason: "An error occurred",
  };
}

/**
 * Get user-friendly message for error with trace ID
 */
export function getErrorDisplayMessage(error: unknown): {
  message: string;
  traceId?: string;
} {
  const apiError = error instanceof ApiError ? error : normalizeError(error);

  return {
    message: apiError.detail,
    traceId: apiError.traceId,
  };
}

/**
 * Check if error should trigger offline queue
 */
export function shouldQueueForOffline(error: unknown, isOnline: boolean): boolean {
  if (!isOnline) {
    return true;
  }

  const apiError = error instanceof ApiError ? error : normalizeError(error);
  return apiError.isNetworkError;
}

/**
 * Check if error is a user-fixable validation/business error
 */
export function isUserFixableError(error: unknown): boolean {
  const apiError = error instanceof ApiError ? error : normalizeError(error);

  return (
    apiError.isValidationError() ||
    apiError.isConflict() ||
    apiError.isNotFound() ||
    apiError.isForbidden()
  );
}
