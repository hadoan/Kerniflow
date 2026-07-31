import { HttpStatus } from "@nestjs/common";
import { ConflictError } from "@corely/kernel";
import { describe, expect, it } from "vitest";
import { ExceptionToProblemDetailsMapper } from "../exception-to-problem-details.mapper";

describe("ExceptionToProblemDetailsMapper - kernel use-case errors", () => {
  it("maps a conflict error to HTTP 409", () => {
    const mapper = new ExceptionToProblemDetailsMapper("trace-1", "/cash/resolutions/1", false);

    const result = mapper.map(new ConflictError("Resolution already processed"));

    expect(result).toMatchObject({
      title: "Conflict",
      status: HttpStatus.CONFLICT,
      code: "CONFLICT",
    });
  });
});
