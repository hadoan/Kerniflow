import { describe, expect, it } from "vitest";
import { HttpError } from "@corely/api-client";
import {
  determineErrorStrategy,
  getErrorDisplayMessage,
  shouldQueueForOffline,
  isUserFixableError,
} from "../offline-error-handler";

describe("determineErrorStrategy", () => {
  describe("Network/offline errors", () => {
    it("should queue when offline", () => {
      const error = new HttpError("Service Error", 500);

      const strategy = determineErrorStrategy(error, {
        isOnline: false,
        isIdempotent: true,
      });

      expect(strategy).toEqual({
        type: "queue",
        reason: expect.stringContaining("queued for sync"),
      });
    });

    it("should queue for network errors even when online", () => {
      const error = new HttpError("Network error", null);

      const strategy = determineErrorStrategy(error, {
        isOnline: true,
        isIdempotent: true,
      });

      expect(strategy.type).toBe("queue");
    });
  });

  describe("Authentication errors", () => {
    it("should trigger auth flow for 401 errors", () => {
      const error = new HttpError("Unauthorized", 401, {
        type: "https://errors.corely.com/Common:Unauthorized",
        title: "Unauthorized",
        status: 401,
        detail: "Authentication required",
        instance: "/api/sales",
        code: "Common:Unauthorized",
        traceId: "abc-123",
      });

      const strategy = determineErrorStrategy(error, {
        isOnline: true,
      });

      expect(strategy).toEqual({
        type: "auth",
        reason: expect.stringContaining("log in"),
      });
    });
  });

  describe("Validation errors", () => {
    it("should show validation errors without retry", () => {
      const error = new HttpError("Validation Failed", 400, {
        type: "https://errors.corely.com/Common:ValidationFailed",
        title: "Bad Request",
        status: 400,
        detail: "Validation failed",
        instance: "/api/sales",
        code: "Common:ValidationFailed",
        traceId: "abc-123",
        validationErrors: [{ message: "Email is required", members: ["email"] }],
      });

      const strategy = determineErrorStrategy(error, {
        isOnline: true,
        isIdempotent: true,
      });

      expect(strategy).toEqual({
        type: "show",
        reason: expect.stringContaining("Validation"),
      });
    });
  });

  describe("Conflict errors", () => {
    it("should show conflict errors without retry", () => {
      const error = new HttpError("Conflict", 409, {
        type: "https://errors.corely.com/Common:Conflict",
        title: "Conflict",
        status: 409,
        detail: "Resource already exists",
        instance: "/api/customers",
        code: "Common:Conflict",
        traceId: "abc-123",
      });

      const strategy = determineErrorStrategy(error, {
        isOnline: true,
        isIdempotent: true,
      });

      expect(strategy.type).toBe("show");
      expect(strategy.reason).toContain("Business rule");
    });
  });

  describe("Permission errors", () => {
    it("should show forbidden errors", () => {
      const error = new HttpError("Forbidden", 403, {
        type: "https://errors.corely.com/Common:Forbidden",
        title: "Forbidden",
        status: 403,
        detail: "Insufficient permissions",
        instance: "/api/sales",
        code: "Common:Forbidden",
        traceId: "abc-123",
      });

      const strategy = determineErrorStrategy(error, {
        isOnline: true,
      });

      expect(strategy.type).toBe("show");
      expect(strategy.reason).toContain("permissions");
    });
  });

  describe("Retryable server errors", () => {
    it("should retry idempotent operations on 503 errors", () => {
      const error = new HttpError("Service Unavailable", 503);

      const strategy = determineErrorStrategy(error, {
        isOnline: true,
        isIdempotent: true,
        currentRetryCount: 0,
      });

      expect(strategy).toEqual({
        type: "retry",
        reason: expect.stringContaining("retrying"),
        maxRetries: 3,
      });
    });

    it("should not retry non-idempotent operations", () => {
      const error = new HttpError("Service Unavailable", 503);

      const strategy = determineErrorStrategy(error, {
        isOnline: true,
        isIdempotent: false,
      });

      expect(strategy.type).toBe("show");
      expect(strategy.reason).toContain("not safe to retry");
    });

    it("should stop retrying after max retries", () => {
      const error = new HttpError("Service Unavailable", 503);

      const strategy = determineErrorStrategy(error, {
        isOnline: true,
        isIdempotent: true,
        currentRetryCount: 3,
        maxRetries: 3,
      });

      expect(strategy.type).toBe("show");
      expect(strategy.reason).toContain("maximum retries");
    });
  });

  describe("Other server errors", () => {
    it("should show 500 errors without retry", () => {
      const error = new HttpError("Internal Server Error", 500);

      const strategy = determineErrorStrategy(error, {
        isOnline: true,
        isIdempotent: true,
      });

      expect(strategy.type).toBe("show");
    });
  });
});

describe("getErrorDisplayMessage", () => {
  it("should extract message and trace ID from ProblemDetails", () => {
    const error = new HttpError("Not Found", 404, {
      type: "https://errors.corely.com/Common:NotFound",
      title: "Not Found",
      status: 404,
      detail: "Invoice not found",
      instance: "/api/invoices/123",
      code: "Common:NotFound",
      traceId: "trace-123-456",
    });

    const result = getErrorDisplayMessage(error);

    expect(result).toEqual({
      message: "Invoice not found",
      traceId: "trace-123-456",
    });
  });

  it("should handle errors without trace ID", () => {
    const error = new Error("Generic error");

    const result = getErrorDisplayMessage(error);

    expect(result.message).toBeDefined();
    expect(result.traceId).toBeUndefined();
  });
});

describe("shouldQueueForOffline", () => {
  it("should return true when offline", () => {
    const error = new HttpError("Server Error", 500);

    expect(shouldQueueForOffline(error, false)).toBe(true);
  });

  it("should return true for network errors even when online", () => {
    const error = new HttpError("Network error", null);

    expect(shouldQueueForOffline(error, true)).toBe(true);
  });

  it("should return false for server errors when online", () => {
    const error = new HttpError("Server Error", 500);

    expect(shouldQueueForOffline(error, true)).toBe(false);
  });
});

describe("isUserFixableError", () => {
  it("should return true for validation errors", () => {
    const error = new HttpError("Validation Failed", 400, {
      type: "https://errors.corely.com/Common:ValidationFailed",
      title: "Bad Request",
      status: 400,
      detail: "Validation failed",
      instance: "/api/sales",
      code: "Common:ValidationFailed",
      traceId: "abc-123",
      validationErrors: [{ message: "Required", members: ["email"] }],
    });

    expect(isUserFixableError(error)).toBe(true);
  });

  it("should return true for conflict errors", () => {
    const error = new HttpError("Conflict", 409);

    expect(isUserFixableError(error)).toBe(true);
  });

  it("should return true for not found errors", () => {
    const error = new HttpError("Not Found", 404);

    expect(isUserFixableError(error)).toBe(true);
  });

  it("should return false for server errors", () => {
    const error = new HttpError("Server Error", 500);

    expect(isUserFixableError(error)).toBe(false);
  });

  it("should return false for network errors", () => {
    const error = new HttpError("Network error", null);

    expect(isUserFixableError(error)).toBe(false);
  });
});
