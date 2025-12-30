/**
 * Problem Details for HTTP APIs (RFC 7807)
 * Extended with Corely-specific fields
 *
 * This is the standard error response format used across all Corely APIs.
 * It ensures consistent, predictable error handling across backend, web, and POS clients.
 */

/**
 * Validation error item describing a field-level validation failure
 */
export interface ValidationErrorItem {
  /** Human-readable error message for this field */
  message: string;
  /** Field paths that caused the error (e.g., ["email"], ["address", "street"]) */
  members: string[];
}

/**
 * Problem Details payload - the standard error response format
 *
 * Based on RFC 7807 with Corely extensions for traceability and validation
 */
export interface ProblemDetails {
  /** Stable error type identifier (e.g., "https://errors.corely.com/validation" or "Common:ValidationFailed") */
  type: string;

  /** Short, human-readable summary of the error type */
  title: string;

  /** HTTP status code */
  status: number;

  /** Human-readable explanation specific to this occurrence (safe to show to users) */
  detail: string;

  /** URI reference identifying the specific occurrence (request path or ID) */
  instance: string;

  /** Stable machine-readable error code (e.g., "Invoices:Locked", "Common:ValidationFailed") */
  code: string;

  /** Validation errors for field-level failures (present when status=400 and validation failed) */
  validationErrors?: ValidationErrorItem[];

  /** Correlation/trace ID for debugging and support */
  traceId: string;

  /** Optional safe metadata (never includes secrets or sensitive data) */
  data?: Record<string, unknown>;
}

/**
 * Type guard to check if an unknown object looks like ProblemDetails
 * Useful for client-side error parsing
 */
export function isProblemDetails(obj: unknown): obj is ProblemDetails {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  const pd = obj as Partial<ProblemDetails>;

  return (
    typeof pd.type === "string" &&
    typeof pd.title === "string" &&
    typeof pd.status === "number" &&
    typeof pd.detail === "string" &&
    typeof pd.code === "string" &&
    typeof pd.traceId === "string"
  );
}
