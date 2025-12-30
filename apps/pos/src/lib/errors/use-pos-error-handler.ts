import { useCallback, useState } from "react";
import { ApiError, normalizeError } from "@corely/api-client";
import {
  determineErrorStrategy,
  getErrorDisplayMessage,
  type ErrorHandlingOptions,
} from "./offline-error-handler";

export interface ErrorState {
  message: string;
  traceId?: string;
  variant: "error" | "warning" | "info";
  visible: boolean;
}

export interface UsePosErrorHandlerOptions {
  /**
   * Callback when error should be queued for offline sync
   */
  onQueue?: (error: ApiError) => void;

  /**
   * Callback when error should trigger retry
   */
  onRetry?: (error: ApiError) => void;

  /**
   * Callback when auth error occurs
   */
  onAuthError?: () => void;

  /**
   * Function to check if currently online
   */
  isOnline: () => boolean;

  /**
   * Maximum retry attempts for retryable errors
   */
  maxRetries?: number;
}

/**
 * Hook for handling errors in POS context with offline awareness
 *
 * @example
 * ```tsx
 * const { handleError, errorState, dismissError } = usePosErrorHandler({
 *   onQueue: (error) => offlineQueue.enqueue(action),
 *   onAuthError: () => navigation.navigate('Login'),
 *   isOnline: () => netInfo.isConnected ?? false,
 * });
 *
 * try {
 *   await apiClient.post('/sales', data);
 * } catch (error) {
 *   handleError(error, { isIdempotent: true });
 * }
 *
 * // In render:
 * {errorState.visible && (
 *   <ErrorBanner
 *     message={errorState.message}
 *     traceId={errorState.traceId}
 *     variant={errorState.variant}
 *     onDismiss={dismissError}
 *   />
 * )}
 * ```
 */
export function usePosErrorHandler(options: UsePosErrorHandlerOptions) {
  const [errorState, setErrorState] = useState<ErrorState>({
    message: "",
    visible: false,
    variant: "error",
  });

  const showError = useCallback(
    (message: string, traceId?: string, variant: "error" | "warning" | "info" = "error") => {
      setErrorState({
        message,
        traceId,
        variant,
        visible: true,
      });
    },
    []
  );

  const dismissError = useCallback(() => {
    setErrorState((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleError = useCallback(
    (error: unknown, handlingOptions?: Partial<ErrorHandlingOptions>) => {
      const apiError = error instanceof ApiError ? error : normalizeError(error);

      const strategy = determineErrorStrategy(error, {
        isOnline: options.isOnline(),
        isIdempotent: handlingOptions?.isIdempotent ?? false,
        currentRetryCount: handlingOptions?.currentRetryCount ?? 0,
        maxRetries: options.maxRetries ?? 3,
      });

      switch (strategy.type) {
        case "queue":
          // Queue for offline sync
          if (options.onQueue) {
            options.onQueue(apiError);
          }
          showError("Queued - will sync when online", apiError.traceId, "info");
          break;

        case "retry":
          // Trigger retry logic
          if (options.onRetry) {
            options.onRetry(apiError);
          }
          showError(strategy.reason, apiError.traceId, "warning");
          break;

        case "auth":
          // Trigger re-authentication
          if (options.onAuthError) {
            options.onAuthError();
          }
          showError(strategy.reason, apiError.traceId, "warning");
          break;

        case "show":
          // Show error to user
          const { message, traceId } = getErrorDisplayMessage(error);
          showError(message, traceId, "error");
          break;
      }
    },
    [options, showError]
  );

  return {
    handleError,
    errorState,
    dismissError,
    showError,
  };
}
