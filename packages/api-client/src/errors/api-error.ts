import type { ProblemDetails, ValidationErrorItem, isProblemDetails } from "@corely/contracts";
import { type HttpError } from "../http/request";

/**
 * Structured API error that wraps HTTP errors with ProblemDetails support
 *
 * This class normalizes all API errors into a consistent shape, whether they're
 * properly formatted ProblemDetails or legacy/unexpected errors.
 */
export class ApiError extends Error {
  /** HTTP status code */
  readonly status: number;

  /** Stable machine-readable error code */
  readonly code: string;

  /** Human-readable detail message */
  readonly detail: string;

  /** Validation errors (if this is a validation failure) */
  readonly validationErrors: ValidationErrorItem[] | undefined;

  /** Trace/correlation ID for debugging */
  readonly traceId: string | undefined;

  /** Additional safe metadata */
  readonly data: Record<string, unknown> | undefined;

  /** Original HTTP error */
  readonly originalError: HttpError | undefined;

  /** Whether this is a network/client error (vs server error) */
  readonly isNetworkError: boolean;

  constructor(options: {
    status: number;
    code: string;
    detail: string;
    message?: string;
    validationErrors?: ValidationErrorItem[];
    traceId?: string;
    data?: Record<string, unknown>;
    originalError?: HttpError;
    isNetworkError?: boolean;
  }) {
    super(options.message || options.detail);
    this.name = "ApiError";
    this.status = options.status;
    this.code = options.code;
    this.detail = options.detail;
    this.validationErrors = options.validationErrors;
    this.traceId = options.traceId;
    this.data = options.data;
    this.originalError = options.originalError;
    this.isNetworkError = options.isNetworkError ?? false;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }

    Object.setPrototypeOf(this, ApiError.prototype);
  }

  /**
   * Check if this is a validation error
   */
  isValidationError(): boolean {
    return this.status === 400 && !!this.validationErrors && this.validationErrors.length > 0;
  }

  /**
   * Check if this is an authentication error
   */
  isUnauthorized(): boolean {
    return this.status === 401;
  }

  /**
   * Check if this is an authorization error
   */
  isForbidden(): boolean {
    return this.status === 403;
  }

  /**
   * Check if this is a not found error
   */
  isNotFound(): boolean {
    return this.status === 404;
  }

  /**
   * Check if this is a conflict error
   */
  isConflict(): boolean {
    return this.status === 409;
  }

  /**
   * Check if this is a server error
   */
  isServerError(): boolean {
    return this.status >= 500;
  }

  /**
   * Check if this error might be retryable
   */
  isRetryable(): boolean {
    return this.isNetworkError || this.status === 503 || this.status === 502 || this.status === 504;
  }
}
