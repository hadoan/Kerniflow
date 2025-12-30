import type { ValidationErrorItem } from "@corely/contracts";
import { AppError } from "./app-error";

/**
 * Validation failed error - for field-level validation failures
 *
 * Use this when request validation fails (DTOs, form inputs, etc.)
 * Clients can map validationErrors to form fields using the members array.
 *
 * @example
 * ```ts
 * throw new ValidationFailedError("Validation failed", [
 *   { message: "Email is required", members: ["email"] },
 *   { message: "Amount must be positive", members: ["amount"] }
 * ]);
 * ```
 */
export class ValidationFailedError extends AppError {
  constructor(message = "Validation failed", validationErrors?: ValidationErrorItem[]) {
    super({
      code: "Common:ValidationFailed",
      message,
      publicMessage: message, // Validation messages are safe to show
      status: 400,
      validationErrors,
      logLevel: "info", // Validation errors are expected user input issues
    });
  }
}
