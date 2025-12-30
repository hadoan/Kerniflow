import { describe, expect, it, beforeEach, vi } from "vitest";
import { ArgumentsHost, HttpStatus } from "@nestjs/common";
import { ProblemDetailsExceptionFilter } from "../problem-details.filter.js";
import { UserFriendlyError, ValidationFailedError, NotFoundError } from "@corely/domain";

describe("ProblemDetailsExceptionFilter", () => {
  let filter: ProblemDetailsExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new ProblemDetailsExceptionFilter();

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockRequest = {
      url: "/api/invoices/123",
      method: "POST",
      traceId: "test-trace-id-123",
      headers: {
        "user-agent": "test-agent",
      },
    };

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as ArgumentsHost;
  });

  describe("UserFriendlyError", () => {
    it("should return ProblemDetails with public message", () => {
      const error = new UserFriendlyError("This invoice has already been finalized", {
        code: "Invoices:Locked",
      });

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 400,
          code: "Invoices:Locked",
          detail: "This invoice has already been finalized",
          traceId: "test-trace-id-123",
          instance: "/api/invoices/123",
          type: expect.stringContaining("Invoices:Locked"),
          title: "Bad Request",
        })
      );
    });

    it("should use default code if not provided", () => {
      const error = new UserFriendlyError("Something went wrong");

      filter.catch(error, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "Common:UserFriendly",
        })
      );
    });
  });

  describe("ValidationFailedError", () => {
    it("should include validation errors array", () => {
      const error = new ValidationFailedError("Validation failed", [
        { message: "Email is required", members: ["email"] },
        { message: "Amount must be positive", members: ["amount"] },
      ]);

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 400,
          code: "Common:ValidationFailed",
          detail: "Validation failed",
          validationErrors: [
            { message: "Email is required", members: ["email"] },
            { message: "Amount must be positive", members: ["amount"] },
          ],
          traceId: "test-trace-id-123",
        })
      );
    });
  });

  describe("NotFoundError", () => {
    it("should sanitize internal message", () => {
      const error = new NotFoundError("Invoice ABC-123 not found for tenant XYZ-456");

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 404,
          code: "Common:NotFound",
          detail: "Resource not found", // Generic safe message
          traceId: "test-trace-id-123",
        })
      );
    });
  });

  describe("Unknown errors", () => {
    it("should handle generic Error with sanitized message in production", () => {
      // Temporarily set to production
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const error = new Error("Internal database connection failed");

      filter.catch(error, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 500,
          code: "Common:UnexpectedError",
          detail: "An unexpected error occurred", // Sanitized
          traceId: "test-trace-id-123",
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it("should include error message in development", () => {
      process.env.NODE_ENV = "development";

      const error = new Error("Database connection failed");

      filter.catch(error, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: "Database connection failed",
        })
      );
    });
  });

  describe("Trace ID handling", () => {
    it("should use 'unknown' if trace ID not present", () => {
      delete mockRequest.traceId;

      const error = new UserFriendlyError("Test error");

      filter.catch(error, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          traceId: "unknown",
        })
      );
    });
  });
});
