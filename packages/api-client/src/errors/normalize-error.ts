import { isProblemDetails } from "@corely/contracts";
import type { ProblemDetails } from "@corely/contracts";
import { HttpError } from "../http/request";
import { ApiError } from "./api-error";

type ApiErrorOptions = ConstructorParameters<typeof ApiError>[0];

/**
 * Normalize any error into a structured ApiError
 *
 * Handles:
 * - ProblemDetails responses from backend
 * - Legacy/non-standard error responses
 * - Network errors
 * - Unknown errors
 */
export function normalizeError(error: unknown): ApiError {
  // Handle HttpError with ProblemDetails body
  if (error instanceof HttpError) {
    const body = error.body;

    // Check if body is ProblemDetails
    if (isProblemDetails(body)) {
      return problemDetailsToApiError(body, error);
    }

    // Handle legacy error format { error: string, message: string }
    if (isLegacyErrorBody(body)) {
      return legacyErrorToApiError(body, error);
    }

    // Handle network/client errors (null status)
    if (error.status === null) {
      return networkErrorToApiError(error);
    }

    // Handle generic HTTP error
    return genericHttpErrorToApiError(error);
  }

  // Handle unknown errors (shouldn't happen, but just in case)
  return unknownErrorToApiError(error);
}

/**
 * Convert ProblemDetails to ApiError
 */
function problemDetailsToApiError(pd: ProblemDetails, originalError: HttpError): ApiError {
  const options: ApiErrorOptions = {
    status: pd.status,
    code: pd.code,
    detail: pd.detail,
    message: pd.detail, // Use detail as the error message
    originalError,
    isNetworkError: false,
  };

  if (pd.validationErrors !== undefined) {
    options.validationErrors = pd.validationErrors;
  }
  if (pd.traceId !== undefined) {
    options.traceId = pd.traceId;
  }
  if (pd.data !== undefined) {
    options.data = pd.data;
  }

  return new ApiError(options);
}

/**
 * Convert legacy error body to ApiError
 */
function legacyErrorToApiError(
  body: { error?: string; message?: string },
  originalError: HttpError
): ApiError {
  const status = originalError.status ?? 500;
  return new ApiError({
    status,
    code: body.error || `Http${status}`,
    detail: body.message || originalError.message || "An error occurred",
    originalError,
    isNetworkError: false,
  });
}

/**
 * Convert network error to ApiError
 */
function networkErrorToApiError(originalError: HttpError): ApiError {
  return new ApiError({
    status: 0, // Network errors don't have HTTP status
    code: "Common:NetworkError",
    detail: "Network error - please check your connection",
    message: originalError.message,
    originalError,
    isNetworkError: true,
  });
}

/**
 * Convert generic HTTP error to ApiError
 */
function genericHttpErrorToApiError(originalError: HttpError): ApiError {
  const status = originalError.status ?? 500;

  return new ApiError({
    status,
    code: `Common:Http${status}`,
    detail: getDefaultDetailForStatus(status),
    message: originalError.message,
    originalError,
    isNetworkError: false,
  });
}

/**
 * Convert unknown error to ApiError
 */
function unknownErrorToApiError(error: unknown): ApiError {
  return new ApiError({
    status: 0,
    code: "Common:UnknownError",
    detail: "An unexpected error occurred",
    message: error instanceof Error ? error.message : "Unknown error",
    isNetworkError: true,
  });
}

/**
 * Type guard for legacy error body format
 */
function isLegacyErrorBody(body: unknown): body is { error?: string; message?: string } {
  return typeof body === "object" && body !== null && ("error" in body || "message" in body);
}

/**
 * Get default user-friendly detail message for HTTP status code
 */
function getDefaultDetailForStatus(status: number): string {
  switch (status) {
    case 400:
      return "Bad request";
    case 401:
      return "Authentication required";
    case 403:
      return "You don't have permission to perform this action";
    case 404:
      return "Resource not found";
    case 409:
      return "Conflict";
    case 422:
      return "Unprocessable entity";
    case 429:
      return "Too many requests - please try again later";
    case 500:
      return "Internal server error";
    case 502:
      return "Bad gateway";
    case 503:
      return "Service temporarily unavailable";
    case 504:
      return "Gateway timeout";
    default:
      return status >= 500 ? "A server error occurred" : "An error occurred";
  }
}
