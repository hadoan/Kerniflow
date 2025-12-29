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
import {
  type CreateLoyaltyAdjustEntryInput,
  type CreateLoyaltyAdjustEntryOutput,
} from "@kerniflow/contracts";
import { toLoyaltyLedgerEntryDto } from "../mappers/engagement-dto.mappers";
import type { LoyaltyRepositoryPort } from "../ports/loyalty-repository.port";

type Deps = { logger: LoggerPort; loyalty: LoyaltyRepositoryPort };

export class CreateLoyaltyAdjustEntryUseCase extends BaseUseCase<
  CreateLoyaltyAdjustEntryInput,
  CreateLoyaltyAdjustEntryOutput
> {
  constructor(private readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: CreateLoyaltyAdjustEntryInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateLoyaltyAdjustEntryOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const now = new Date();
    await this.deps.loyalty.createLedgerEntry({
      entryId: input.entryId,
      tenantId: ctx.tenantId,
      customerPartyId: input.customerPartyId,
      entryType: "ADJUST",
      pointsDelta: input.pointsDelta,
      reasonCode: "MANUAL_ADJUSTMENT",
      sourceType: "MANUAL",
      sourceId: input.entryId,
      createdAt: now,
      createdByEmployeePartyId: input.createdByEmployeePartyId,
    });

    const account =
      (await this.deps.loyalty.getAccountByCustomer(ctx.tenantId, input.customerPartyId)) ??
      (await this.deps.loyalty.upsertAccount(ctx.tenantId, input.customerPartyId, "ACTIVE"));
    await this.deps.loyalty.updateAccountBalance(
      ctx.tenantId,
      input.customerPartyId,
      account.currentPointsBalance + input.pointsDelta
    );

    return ok({
      entry: toLoyaltyLedgerEntryDto({
        entryId: input.entryId,
        tenantId: ctx.tenantId,
        customerPartyId: input.customerPartyId,
        entryType: "ADJUST",
        pointsDelta: input.pointsDelta,
        reasonCode: "MANUAL_ADJUSTMENT",
        sourceType: "MANUAL",
        sourceId: input.entryId,
        createdAt: now,
        createdByEmployeePartyId: input.createdByEmployeePartyId,
      }),
    });
  }
}
