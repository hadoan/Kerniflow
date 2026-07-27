import { type Result, type UseCaseError, isErr } from "@corely/kernel";

export type ToolMapperFailure = {
  ok: false;
  code: string;
  message: string;
  details?: unknown;
};

export type ToolMapperSuccess<T extends Record<string, unknown>> = { ok: true } & T;

export const mapToolResult = <T extends Record<string, unknown>>(
  result: Result<T, UseCaseError> | undefined | null
): ToolMapperSuccess<T> | ToolMapperFailure => {
  if (!result) {
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Unexpected undefined result from use case",
    };
  }

  if (isErr(result)) {
    const error = result.error;
    return {
      ok: false,
      code: error.code ?? "UNKNOWN_ERROR",
      message: error.message,
      details: error.details,
    };
  }

  return { ok: true, ...result.value } as ToolMapperSuccess<T>;
};
