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
import { ListCustomersInput, ListCustomersOutput } from "@kerniflow/contracts";
import { PartyRepoPort } from "../../ports/party-repo.port";
import { toCustomerDto } from "../../mappers/customer-dto.mapper";

type Deps = { logger: LoggerPort; partyRepo: PartyRepoPort };

export class ListCustomersUseCase extends BaseUseCase<ListCustomersInput, ListCustomersOutput> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected async handle(
    input: ListCustomersInput,
    ctx: UseCaseContext
  ): Promise<Result<ListCustomersOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const pageSize = input.pageSize ?? 20;
    const { items, nextCursor } = await this.useCaseDeps.partyRepo.listCustomers(
      ctx.tenantId,
      { includeArchived: input.includeArchived },
      { pageSize, cursor: input.cursor }
    );

    return ok({ items: items.map(toCustomerDto), nextCursor: nextCursor ?? null });
  }
}
