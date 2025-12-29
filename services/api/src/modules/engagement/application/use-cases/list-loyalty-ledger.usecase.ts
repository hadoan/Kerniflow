import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  ok,
  err,
} from "@kerniflow/kernel";
import { type ListLoyaltyLedgerInput, type ListLoyaltyLedgerOutput } from "@kerniflow/contracts";
import { toLoyaltyLedgerEntryDto } from "../mappers/engagement-dto.mappers";
import type { LoyaltyRepositoryPort } from "../ports/loyalty-repository.port";

type Deps = { logger: LoggerPort; loyalty: LoyaltyRepositoryPort };

export class ListLoyaltyLedgerUseCase extends BaseUseCase<
  ListLoyaltyLedgerInput,
  ListLoyaltyLedgerOutput
> {
  constructor(private readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: ListLoyaltyLedgerInput,
    ctx: UseCaseContext
  ): Promise<Result<ListLoyaltyLedgerOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const pageSize = input.pageSize ?? 50;
    const result = await this.deps.loyalty.listLedger(ctx.tenantId, input.customerPartyId, {
      cursor: input.cursor,
      pageSize,
    });

    return ok({
      items: result.items.map(toLoyaltyLedgerEntryDto),
      nextCursor: result.nextCursor ?? null,
    });
  }
}
