import { describe, expect, it } from "vitest";
import { HttpError } from "../../http/request";
import { normalizeError } from "../normalize-error";
import { ApiError } from "../api-error";

describe("normalizeError", () => {
  describe("ProblemDetails responses", () => {
    it("should convert ProblemDetails HttpError to ApiError", () => {
      const httpError = new HttpError("Bad Request", 400, {
        type: "https://errors.corely.com/Invoices:Locked",
        title: "Conflict",
        status: 409,
        detail: "This invoice has already been finalized",
        instance: "/api/invoices/123",
        code: "Invoices:Locked",
        traceId: "abc-123",
        data: { invoiceId: "123" },
      });

      const result = normalizeError(httpError);

      expect(result).toBeInstanceOf(ApiError);
      expect(result.status).toBe(409);
      expect(result.code).toBe("Invoices:Locked");
      expect(result.detail).toBe("This invoice has already been finalized");
      expect(result.traceId).toBe("abc-123");
      expect(result.data).toEqual({ invoiceId: "123" });
      expect(result.isNetworkError).toBe(false);
    });

    it("should handle validation errors with validationErrors array", () => {
      const httpError = new HttpError("Validation Failed", 400, {
        type: "https://errors.corely.com/Common:ValidationFailed",
        title: "Bad Request",
        status: 400,
        detail: "Validation failed",
        instance: "/api/customers",
        code: "Common:ValidationFailed",
        traceId: "xyz-456",
        validationErrors: [
          { message: "Email is required", members: ["email"] },
          { message: "Amount must be positive", members: ["amount"] },
        ],
      });

      const result = normalizeError(httpError);

      expect(result.isValidationError()).toBe(true);
      expect(result.validationErrors).toHaveLength(2);
      expect(result.validationErrors?.[0]).toEqual({
        message: "Email is required",
        members: ["email"],
      });
    });
  });

  describe("Legacy error responses", () => {
    it("should handle legacy { error, message } format", () => {
      const httpError = new HttpError("Not Found", 404, {
        error: "NOT_FOUND",
        message: "Resource not found",
      });

      const result = normalizeError(httpError);

      expect(result).toBeInstanceOf(ApiError);
      expect(result.status).toBe(404);
      expect(result.code).toBe("NOT_FOUND");
      expect(result.detail).toBe("Resource not found");
      expect(result.isNetworkError).toBe(false);
    });

    it("should use Http{status} code if error field is missing", () => {
      const httpError = new HttpError("Server Error", 500, {
        message: "Something went wrong",
      });

      const result = normalizeError(httpError);

      expect(result.code).toBe("Http500");
      expect(result.detail).toBe("Something went wrong");
    });
  });

  describe("Network errors", () => {
    it("should handle network errors (null status)", () => {
      const httpError = new HttpError("Network request failed", null);

      const result = normalizeError(httpError);

      expect(result).toBeInstanceOf(ApiError);
      expect(result.status).toBe(0);
      expect(result.code).toBe("Common:NetworkError");
      expect(result.detail).toBe("Network error - please check your connection");
      expect(result.isNetworkError).toBe(true);
      expect(result.isRetryable()).toBe(true);
    });
  });

  describe("Generic HTTP errors", () => {
    it("should handle generic 404 error", () => {
      const httpError = new HttpError("Not Found", 404, "Plain text error");

      const result = normalizeError(httpError);

      expect(result.status).toBe(404);
      expect(result.code).toBe("Common:Http404");
      expect(result.detail).toBe("Resource not found");
    });

    it("should handle generic 500 error", () => {
      const httpError = new HttpError("Internal Server Error", 500);

      const result = normalizeError(httpError);

      expect(result.status).toBe(500);
      expect(result.code).toBe("Common:Http500");
      expect(result.detail).toBe("Internal server error");
    });

    it("should handle 503 as retryable", () => {
      const httpError = new HttpError("Service Unavailable", 503);

      const result = normalizeError(httpError);

      expect(result.status).toBe(503);
      expect(result.isRetryable()).toBe(true);
    });
  });

  describe("Unknown errors", () => {
    it("should handle plain Error objects", () => {
      const error = new Error("Something unexpected happened");

      const result = normalizeError(error);

      expect(result).toBeInstanceOf(ApiError);
      expect(result.status).toBe(0);
      expect(result.code).toBe("Common:UnknownError");
      expect(result.detail).toBe("An unexpected error occurred");
      expect(result.message).toBe("Something unexpected happened");
      expect(result.isNetworkError).toBe(true);
    });

    it("should handle non-Error objects", () => {
      const result = normalizeError("string error");

      expect(result).toBeInstanceOf(ApiError);
      expect(result.status).toBe(0);
      expect(result.code).toBe("Common:UnknownError");
      expect(result.isNetworkError).toBe(true);
    });
  });
});

describe("ApiError convenience methods", () => {
  it("isValidationError should work correctly", () => {
    const validationError = new ApiError({
      status: 400,
      code: "Common:ValidationFailed",
      detail: "Validation failed",
      validationErrors: [{ message: "Required", members: ["field"] }],
    });

    const otherError = new ApiError({
      status: 400,
      code: "Common:BadRequest",
      detail: "Bad request",
    });

    expect(validationError.isValidationError()).toBe(true);
    expect(otherError.isValidationError()).toBe(false);
  });

  it("isUnauthorized should work correctly", () => {
    const error = new ApiError({
      status: 401,
      code: "Common:Unauthorized",
      detail: "Auth required",
    });

    expect(error.isUnauthorized()).toBe(true);
    expect(error.isForbidden()).toBe(false);
  });

  it("isForbidden should work correctly", () => {
    const error = new ApiError({
      status: 403,
      code: "Common:Forbidden",
      detail: "Forbidden",
    });

    expect(error.isForbidden()).toBe(true);
    expect(error.isUnauthorized()).toBe(false);
  });

  it("isNotFound should work correctly", () => {
    const error = new ApiError({
      status: 404,
      code: "Common:NotFound",
      detail: "Not found",
    });

    expect(error.isNotFound()).toBe(true);
  });

  it("isConflict should work correctly", () => {
    const error = new ApiError({
      status: 409,
      code: "Common:Conflict",
      detail: "Conflict",
    });

    expect(error.isConflict()).toBe(true);
  });

  it("isServerError should work correctly", () => {
    const error500 = new ApiError({
      status: 500,
      code: "Common:Internal",
      detail: "Internal error",
    });

    const error400 = new ApiError({
      status: 400,
      code: "Common:BadRequest",
      detail: "Bad request",
    });

    expect(error500.isServerError()).toBe(true);
    expect(error400.isServerError()).toBe(false);
  });

  it("isRetryable should work correctly", () => {
    const networkError = new ApiError({
      status: 0,
      code: "Common:NetworkError",
      detail: "Network error",
      isNetworkError: true,
    });

    const serviceUnavailable = new ApiError({
      status: 503,
      code: "Common:ServiceUnavailable",
      detail: "Service unavailable",
    });

    const badRequest = new ApiError({
      status: 400,
      code: "Common:BadRequest",
      detail: "Bad request",
    });

    expect(networkError.isRetryable()).toBe(true);
    expect(serviceUnavailable.isRetryable()).toBe(true);
    expect(badRequest.isRetryable()).toBe(false);
  });
});
