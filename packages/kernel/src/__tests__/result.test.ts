import { describe, expect, it } from "vitest";

import { err, isErr, isOk, ok, unwrap } from "../application/result";

describe("Result helpers", () => {
  it("creates Ok and Err and detects them", () => {
    const success = ok("value");
    const failure = err("error");

    expect(isOk(success)).toBe(true);
    expect(isErr(success)).toBe(false);
    expect(isOk(failure)).toBe(false);
    expect(isErr(failure)).toBe(true);
  });

  it("unwraps Ok and throws on Err", () => {
    const success = ok(42);
    expect(unwrap(success)).toBe(42);

    const failure = err(new Error("boom"));
    expect(() => unwrap(failure)).toThrowError("boom");
  });
});
