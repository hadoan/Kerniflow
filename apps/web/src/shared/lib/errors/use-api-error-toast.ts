import { useCallback } from "react";
import { ApiError, normalizeError } from "@corely/api-client";
import { toast } from "../hooks/use-toast";

/**
 * Hook for displaying API errors as toasts
 *
 * Automatically handles different error types and shows appropriate messages.
 * Skips validation errors (those should be shown inline on forms).
 *
 * @example
 * ```tsx
 * const showError = useApiErrorToast();
 *
 * try {
 *   await apiClient.post('/invoices', data);
 * } catch (error) {
 *   showError(error);
 * }
 * ```
 */
export function useApiErrorToast() {
  return useCallback((error: unknown, options?: { title?: string }) => {
    const apiError = error instanceof ApiError ? error : normalizeError(error);

    // Skip validation errors - those should be shown on forms
    if (apiError.isValidationError()) {
      return;
    }

    // Skip 401/403 - those are handled by auth flow
    if (apiError.isUnauthorized() || apiError.isForbidden()) {
      return;
    }

    // Build description with trace ID if available
    let description = apiError.detail;
    if (apiError.traceId) {
      description += `\n\nTrace ID: ${apiError.traceId}`;
    }

    toast({
      title: options?.title || getDefaultTitle(apiError),
      description,
      variant: "destructive",
    });
  }, []);
}

/**
 * Get default toast title based on error type
 */
function getDefaultTitle(error: ApiError): string {
  if (error.isNetworkError) {
    return "Connection Error";
  }
  if (error.isNotFound()) {
    return "Not Found";
  }
  if (error.isConflict()) {
    return "Conflict";
  }
  if (error.isServerError()) {
    return "Server Error";
  }
  return "Error";
}
