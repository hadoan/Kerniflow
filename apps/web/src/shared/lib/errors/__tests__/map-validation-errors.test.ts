import { describe, expect, it } from "vitest";
import { HttpError } from "@kerniflow/api-client";
import {
  mapValidationErrorsToForm,
  getValidationMessages,
  hasValidationErrorForField,
} from "../map-validation-errors";

describe("mapValidationErrorsToForm", () => {
  it("should map validation errors to field names", () => {
    const error = new HttpError("Validation Failed", 400, {
      type: "https://errors.kerniflow.com/Common:ValidationFailed",
      title: "Bad Request",
      status: 400,
      detail: "Validation failed",
      instance: "/api/customers",
      code: "Common:ValidationFailed",
      traceId: "abc-123",
      validationErrors: [
        { message: "Email is required", members: ["email"] },
        { message: "Name must be at least 3 characters", members: ["name"] },
      ],
    });

    const result = mapValidationErrorsToForm(error);

    expect(result).toEqual({
      email: "Email is required",
      name: "Name must be at least 3 characters",
    });
  });

  it("should handle nested field paths with dot notation", () => {
    const error = new HttpError("Validation Failed", 400, {
      type: "https://errors.kerniflow.com/Common:ValidationFailed",
      title: "Bad Request",
      status: 400,
      detail: "Validation failed",
      instance: "/api/customers",
      code: "Common:ValidationFailed",
      traceId: "abc-123",
      validationErrors: [
        { message: "Street is required", members: ["address", "street"] },
        { message: "ZIP code is invalid", members: ["address", "zip"] },
      ],
    });

    const result = mapValidationErrorsToForm(error);

    expect(result).toEqual({
      "address.street": "Street is required",
      "address.zip": "ZIP code is invalid",
    });
  });

  it("should return empty object for non-validation errors", () => {
    const error = new HttpError("Not Found", 404, {
      type: "https://errors.kerniflow.com/Common:NotFound",
      title: "Not Found",
      status: 404,
      detail: "Resource not found",
      instance: "/api/customers/123",
      code: "Common:NotFound",
      traceId: "abc-123",
    });

    const result = mapValidationErrorsToForm(error);

    expect(result).toEqual({});
  });

  it("should return empty object for errors without validationErrors", () => {
    const error = new HttpError("Bad Request", 400, {
      type: "https://errors.kerniflow.com/Common:BadRequest",
      title: "Bad Request",
      status: 400,
      detail: "Invalid request",
      instance: "/api/customers",
      code: "Common:BadRequest",
      traceId: "abc-123",
    });

    const result = mapValidationErrorsToForm(error);

    expect(result).toEqual({});
  });

  it("should handle non-HttpError objects", () => {
    const error = new Error("Generic error");

    const result = mapValidationErrorsToForm(error);

    expect(result).toEqual({});
  });
});

describe("getValidationMessages", () => {
  it("should return array of validation messages", () => {
    const error = new HttpError("Validation Failed", 400, {
      type: "https://errors.kerniflow.com/Common:ValidationFailed",
      title: "Bad Request",
      status: 400,
      detail: "Validation failed",
      instance: "/api/customers",
      code: "Common:ValidationFailed",
      traceId: "abc-123",
      validationErrors: [
        { message: "Email is required", members: ["email"] },
        { message: "Name must be at least 3 characters", members: ["name"] },
        { message: "Amount must be positive", members: ["amount"] },
      ],
    });

    const result = getValidationMessages(error);

    expect(result).toEqual([
      "Email is required",
      "Name must be at least 3 characters",
      "Amount must be positive",
    ]);
  });

  it("should return empty array for non-validation errors", () => {
    const error = new HttpError("Not Found", 404, {
      type: "https://errors.kerniflow.com/Common:NotFound",
      title: "Not Found",
      status: 404,
      detail: "Resource not found",
      instance: "/api/customers/123",
      code: "Common:NotFound",
      traceId: "abc-123",
    });

    const result = getValidationMessages(error);

    expect(result).toEqual([]);
  });
});

describe("hasValidationErrorForField", () => {
  const validationError = new HttpError("Validation Failed", 400, {
    type: "https://errors.kerniflow.com/Common:ValidationFailed",
    title: "Bad Request",
    status: 400,
    detail: "Validation failed",
    instance: "/api/customers",
    code: "Common:ValidationFailed",
    traceId: "abc-123",
    validationErrors: [
      { message: "Email is required", members: ["email"] },
      { message: "Street is required", members: ["address", "street"] },
    ],
  });

  it("should return true for fields with validation errors", () => {
    expect(hasValidationErrorForField(validationError, "email")).toBe(true);
  });

  it("should return true for nested fields", () => {
    expect(hasValidationErrorForField(validationError, "address.street")).toBe(true);
  });

  it("should return true for parent field with nested errors", () => {
    expect(hasValidationErrorForField(validationError, "address")).toBe(true);
  });

  it("should return false for fields without errors", () => {
    expect(hasValidationErrorForField(validationError, "name")).toBe(false);
    expect(hasValidationErrorForField(validationError, "age")).toBe(false);
  });

  it("should return false for non-validation errors", () => {
    const error = new HttpError("Not Found", 404);

    expect(hasValidationErrorForField(error, "email")).toBe(false);
  });
});
