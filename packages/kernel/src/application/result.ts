export type Ok<T> = { ok: true; value: T };
export type Err<E> = { ok: false; error: E };

export type Result<T, E> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

export const isOk = <T, E>(result: Result<T, E> | undefined | null): result is Ok<T> =>
  result?.ok === true;
export const isErr = <T, E>(result: Result<T, E> | undefined | null): result is Err<E> =>
  result?.ok === false;

export const unwrap = <T, E>(result: Result<T, E> | undefined | null): T => {
  if (isOk(result)) {
    return result.value;
  }

  const error = result?.error;
  if (error instanceof Error) {
    throw error;
  }

  throw new Error("Tried to unwrap an Err result");
};
