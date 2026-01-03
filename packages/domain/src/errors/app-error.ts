import type { ValidationErrorItem } from "@corely/contracts";

/**
 * Log level hint for error handlers
 */
export type ErrorLogLevel = "info" | "warn" | "error";

/**
 * Base application error class
 *
 * Framework-agnostic error base that provides structure for all domain/application errors.
 * This error hierarchy is safe to use in packages/domain and packages/kernel without
 * any framework dependencies.
 */
export abstract class AppError extends Error {
  /** Stable machine-readable error code (e.g., "Invoices:Locked", "Common:ValidationFailed") */
  readonly code: string;

  /** Public message safe to show to end users (only set for user-friendly errors) */
  readonly publicMessage?: string | undefined;

  /** HTTP status code */
  readonly status: number;

  /** Internal details (for logging/debugging, not exposed to clients in production) */
  readonly internalDetails?: string | undefined;

  /** Safe metadata that can be included in error responses (never include secrets) */
  readonly data?: Record<string, unknown> | undefined;

  /** Validation errors for field-level failures */
  readonly validationErrors?: ValidationErrorItem[] | undefined;

  /** Log level hint for error handlers */
  readonly logLevel: ErrorLogLevel;

  /** Original cause of this error */
  readonly cause?: Error | undefined;

  constructor(options: {
    code: string;
    message: string;
    publicMessage?: string | undefined;
    status: number;
    internalDetails?: string | undefined;
    data?: Record<string, unknown> | undefined;
    validationErrors?: ValidationErrorItem[] | undefined;
    logLevel?: ErrorLogLevel;
    cause?: Error | undefined;
  }) {
    super(options.message);
    this.name = this.constructor.name;
    this.code = options.code;
    this.publicMessage = options.publicMessage;
    this.status = options.status;
    this.internalDetails = options.internalDetails;
    this.data = options.data;
    this.validationErrors = options.validationErrors;
    this.logLevel = options.logLevel ?? "error";
    this.cause = options.cause;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    // Ensure prototype chain is maintained for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Returns true if this error's message is safe to expose to end users
   */
  isPublic(): boolean {
    return this.publicMessage !== undefined;
  }
}
