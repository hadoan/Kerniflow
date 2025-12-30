import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  err,
  ok,
} from "@corely/kernel";
import { type SearchCustomersInput, type SearchCustomersOutput } from "@corely/contracts";
import { type PartyRepoPort } from "../../ports/party-repository.port";
import { toCustomerDto } from "../../mappers/customer-dto.mapper";

type Deps = { logger: LoggerPort; partyRepo: PartyRepoPort };

export class SearchCustomersUseCase extends BaseUseCase<
  SearchCustomersInput,
  SearchCustomersOutput
> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected async handle(
    input: SearchCustomersInput,
    ctx: UseCaseContext
  ): Promise<Result<SearchCustomersOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const pageSize = input.pageSize ?? 20;
    const { items, nextCursor } = await this.useCaseDeps.partyRepo.searchCustomers(
      ctx.tenantId,
      input.q,
      { pageSize, cursor: input.cursor }
    );

    return ok({ items: items.map(toCustomerDto), nextCursor: nextCursor ?? null });
  }
}
