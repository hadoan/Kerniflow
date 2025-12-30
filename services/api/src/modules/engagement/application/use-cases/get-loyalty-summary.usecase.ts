import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  ok,
  err,
} from "@corely/kernel";
import { type GetLoyaltySummaryInput, type GetLoyaltySummaryOutput } from "@corely/contracts";
import { toLoyaltyAccountDto } from "../mappers/engagement-dto.mappers";
import type { LoyaltyRepositoryPort } from "../ports/loyalty-repository.port";

type Deps = { logger: LoggerPort; loyalty: LoyaltyRepositoryPort };

export class GetLoyaltySummaryUseCase extends BaseUseCase<
  GetLoyaltySummaryInput,
  GetLoyaltySummaryOutput
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: GetLoyaltySummaryInput,
    ctx: UseCaseContext
  ): Promise<Result<GetLoyaltySummaryOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const account =
      (await this.deps.loyalty.getAccountByCustomer(ctx.tenantId, input.customerPartyId)) ??
      (await this.deps.loyalty.upsertAccount(ctx.tenantId, input.customerPartyId, "ACTIVE"));

    return ok({ account: toLoyaltyAccountDto(account) });
  }
}
