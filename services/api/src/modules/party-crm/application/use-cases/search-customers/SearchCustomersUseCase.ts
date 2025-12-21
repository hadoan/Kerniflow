import {
  BaseUseCase,
  LoggerPort,
  Result,
  UseCaseContext,
  UseCaseError,
  ValidationError,
  err,
  ok,
} from "@kerniflow/kernel";
import { SearchCustomersInput, SearchCustomersOutput } from "@kerniflow/contracts";
import { PartyRepoPort } from "../../ports/party-repo.port";
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
