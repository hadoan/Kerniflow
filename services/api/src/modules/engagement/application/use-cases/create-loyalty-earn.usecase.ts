import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  ConflictError,
  ok,
  err,
} from "@corely/kernel";
import {
  type CreateLoyaltyEarnEntryInput,
  type CreateLoyaltyEarnEntryOutput,
} from "@corely/contracts";
import { toLoyaltyLedgerEntryDto } from "../mappers/engagement-dto.mappers";
import type { LoyaltyRepositoryPort } from "../ports/loyalty-repository.port";

type Deps = { logger: LoggerPort; loyalty: LoyaltyRepositoryPort };

export class CreateLoyaltyEarnEntryUseCase extends BaseUseCase<
  CreateLoyaltyEarnEntryInput,
  CreateLoyaltyEarnEntryOutput
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: CreateLoyaltyEarnEntryInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateLoyaltyEarnEntryOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    if (input.sourceType && input.sourceId) {
      const existing = await this.deps.loyalty.findLedgerEntryBySource(
        ctx.tenantId,
        input.sourceType,
        input.sourceId,
        input.reasonCode
      );
      if (existing) {
        return err(
          new ConflictError(
            "Loyalty entry already exists for source",
            { entryId: existing.entryId },
            "LOYALTY_DUPLICATE"
          )
        );
      }
    }

    const now = new Date();
    await this.deps.loyalty.createLedgerEntry({
      entryId: input.entryId,
      tenantId: ctx.tenantId,
      customerPartyId: input.customerPartyId,
      entryType: "EARN",
      pointsDelta: input.pointsDelta,
      reasonCode: input.reasonCode,
      sourceType: input.sourceType ?? null,
      sourceId: input.sourceId ?? null,
      createdAt: now,
      createdByEmployeePartyId: input.createdByEmployeePartyId ?? null,
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
        entryType: "EARN",
        pointsDelta: input.pointsDelta,
        reasonCode: input.reasonCode,
        sourceType: input.sourceType ?? null,
        sourceId: input.sourceId ?? null,
        createdAt: now,
        createdByEmployeePartyId: input.createdByEmployeePartyId ?? null,
      }),
    });
  }
}
