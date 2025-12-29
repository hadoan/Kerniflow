import { type Result, type UseCaseError, isErr } from "@kerniflow/kernel";

export const mapToolResult = <T extends Record<string, unknown>>(
  result: Result<T, UseCaseError>
) => {
  if (isErr(result)) {
    const error = result.error;
    return { ok: false, code: error.code, message: error.message, details: error.details };
  }

  return { ok: true, ...result.value };
};
