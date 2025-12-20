import { UseCaseContext } from "./context";
import { UseCaseError } from "./errors";
import { Result } from "./result";

export interface UseCase<I, O, E = UseCaseError> {
  execute(input: I, ctx: UseCaseContext): Promise<Result<O, E>>;
}
