import type { ValidationErrorItem } from "@corely/contracts";
import { ApiError, normalizeError } from "@corely/api-client";

/**
 * Map API validation errors to form field errors
 *
 * Converts server-side validation errors from ProblemDetails format
 * into a structure that can be used by form libraries (React Hook Form, Formik, etc.)
 *
 * @param error - The error from an API call
 * @returns Record mapping field names to error messages, or empty object if not a validation error
 *
 * @example
 * ```tsx
 * try {
 *   await apiClient.post('/customers', formData);
 * } catch (error) {
 *   const fieldErrors = mapValidationErrorsToForm(error);
 *   // fieldErrors = { email: "Email is required", name: "Name must be at least 3 characters" }
 *   // Use with your form library
 *   Object.entries(fieldErrors).forEach(([field, message]) => {
 *     form.setError(field, { message });
 *   });
 * }
 * ```
 */
export function mapValidationErrorsToForm(error: unknown): Record<string, string> {
  const apiError = error instanceof ApiError ? error : normalizeError(error);

  if (!apiError.isValidationError() || !apiError.validationErrors) {
    return {};
  }

  const fieldErrors: Record<string, string> = {};

  for (const validationError of apiError.validationErrors) {
    // Use the first member as the field name
    // For nested fields like ["address", "street"], join with dot notation
    const fieldName = validationError.members.join(".");

    if (fieldName) {
      fieldErrors[fieldName] = validationError.message;
    }
  }

  return fieldErrors;
}

/**
 * Get all validation error messages as a flat array
 *
 * Useful for showing a summary of validation errors
 *
 * @example
 * ```tsx
 * const errors = getValidationMessages(error);
 * // errors = ["Email is required", "Name must be at least 3 characters"]
 * ```
 */
export function getValidationMessages(error: unknown): string[] {
  const apiError = error instanceof ApiError ? error : normalizeError(error);

  if (!apiError.isValidationError() || !apiError.validationErrors) {
    return [];
  }

  return apiError.validationErrors.map((ve) => ve.message);
}

/**
 * Check if an error has validation errors for a specific field
 */
export function hasValidationErrorForField(error: unknown, fieldName: string): boolean {
  const apiError = error instanceof ApiError ? error : normalizeError(error);

  if (!apiError.isValidationError() || !apiError.validationErrors) {
    return false;
  }

  return apiError.validationErrors.some((ve) => {
    const field = ve.members.join(".");
    return field === fieldName || field.startsWith(`${fieldName}.`);
  });
}
