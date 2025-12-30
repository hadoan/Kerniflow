import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { ExceptionToProblemDetailsMapper } from "../exception-to-problem-details.mapper.js";
import { HttpStatus } from "@nestjs/common";

describe("ExceptionToProblemDetailsMapper - Prisma Errors", () => {
  const traceId = "test-trace-123";
  const instance = "/api/customers";

  describe("P2002 - Unique constraint violation", () => {
    it("should map to 409 Conflict", () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed on the fields: (`email`)",
        {
          code: "P2002",
          clientVersion: "5.0.0",
          meta: { target: ["email"] },
        }
      );

      const mapper = new ExceptionToProblemDetailsMapper(traceId, instance, false);
      const result = mapper.map(prismaError);

      expect(result).toEqual({
        type: "https://errors.corely.com/Common:Conflict",
        title: "Conflict",
        status: HttpStatus.CONFLICT,
        detail: "A record with this value already exists",
        instance,
        code: "Common:Conflict",
        traceId,
        data: { prismaCode: "P2002" },
      });
    });

    it("should not include prismaCode in production", () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "5.0.0",
      });

      const mapper = new ExceptionToProblemDetailsMapper(traceId, instance, true);
      const result = mapper.map(prismaError);

      expect(result.data).toBeUndefined();
    });
  });

  describe("P2025 - Record not found", () => {
    it("should map to 404 Not Found", () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        "An operation failed because it depends on one or more records that were required but not found.",
        {
          code: "P2025",
          clientVersion: "5.0.0",
          meta: { cause: "Record to update not found." },
        }
      );

      const mapper = new ExceptionToProblemDetailsMapper(traceId, instance, false);
      const result = mapper.map(prismaError);

      expect(result).toEqual({
        type: "https://errors.corely.com/Common:NotFound",
        title: "Not Found",
        status: HttpStatus.NOT_FOUND,
        detail: "Resource not found",
        instance,
        code: "Common:NotFound",
        traceId,
      });
    });
  });

  describe("P2003 - Foreign key constraint violation", () => {
    it("should map to 409 Conflict", () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        "Foreign key constraint failed on the field: `customerId`",
        {
          code: "P2003",
          clientVersion: "5.0.0",
          meta: { field_name: "customerId" },
        }
      );

      const mapper = new ExceptionToProblemDetailsMapper(traceId, instance, false);
      const result = mapper.map(prismaError);

      expect(result).toEqual({
        type: "https://errors.corely.com/Common:Conflict",
        title: "Conflict",
        status: HttpStatus.CONFLICT,
        detail: "Referenced resource does not exist",
        instance,
        code: "Common:ForeignKeyViolation",
        traceId,
      });
    });
  });

  describe("Unknown Prisma error codes", () => {
    it("should map to 500 Internal Server Error", () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError("Unknown database error", {
        code: "P9999", // Unknown code
        clientVersion: "5.0.0",
      });

      const mapper = new ExceptionToProblemDetailsMapper(traceId, instance, false);
      const result = mapper.map(prismaError);

      expect(result).toEqual({
        type: "https://errors.corely.com/Common:DatabaseError",
        title: "Internal Server Error",
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        detail: "A database error occurred",
        instance,
        code: "Common:DatabaseError",
        traceId,
        data: { prismaCode: "P9999" },
      });
    });
  });
});
