import { type UseCaseContext } from "./context";
import { type UseCaseError } from "./errors";
import { type Result } from "./result";

export interface UseCase<I, O, E = UseCaseError> {
  execute(input: I, ctx: UseCaseContext): Promise<Result<O, E>>;
}
