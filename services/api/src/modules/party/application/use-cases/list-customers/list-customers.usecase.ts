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
import { type ListCustomersInput, type ListCustomersOutput } from "@corely/contracts";
import { type PartyRepoPort } from "../../ports/party-repository.port";
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
