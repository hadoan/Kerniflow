import { Inject, Injectable } from "@nestjs/common";
import { createHash } from "crypto";
import type {
  PrepareCashEntryConfirmationInput,
  CashEntryConfirmationDto,
} from "@corely/contracts";
import {
  BaseUseCase,
  NotFoundError,
  RequireTenant,
  ValidationError,
  ok,
  isErr,
  type Result,
  type UseCaseContext,
  type UseCaseError,
} from "@corely/kernel";
import {
  CASH_REGISTER_REPO,
  CASH_ENTRY_CONFIRMATION_REPO,
  type CashRegisterRepoPort,
  type CashEntryConfirmationRepoPort,
} from "../ports/cash-management.ports";
import { assertCanManageCash } from "../../policies/assert-cash-policies";

const toDayKey = (value?: string): string =>
  value ? value.slice(0, 10) : new Date().toISOString().slice(0, 10);

@RequireTenant()
@Injectable()
export class PrepareCashEntryConfirmationUseCase extends BaseUseCase<
  PrepareCashEntryConfirmationInput,
  { confirmation: CashEntryConfirmationDto }
> {
  constructor(
    @Inject(CASH_REGISTER_REPO)
    private readonly registerRepo: CashRegisterRepoPort,
    @Inject(CASH_ENTRY_CONFIRMATION_REPO)
    private readonly confirmationRepo: CashEntryConfirmationRepoPort
  ) {
    super({ logger: undefined });
  }

  protected async handle(
    input: PrepareCashEntryConfirmationInput,
    ctx: UseCaseContext
  ): Promise<Result<{ confirmation: CashEntryConfirmationDto }, UseCaseError>> {
    assertCanManageCash(ctx, input.registerId);

    const tenantId = ctx.tenantId;
    const workspaceId = ctx.workspaceId;
    if (!tenantId || !workspaceId) {
      throw new ValidationError("Missing tenant/workspace context");
    }

    const register = await this.registerRepo.findRegisterById(
      tenantId,
      workspaceId,
      input.registerId
    );
    if (!register) {
      throw new NotFoundError(
        "Cash register not found",
        undefined,
        "CashManagement:RegisterNotFound"
      );
    }

    const dayKey = toDayKey(input.businessDate);

    const candidatePayload = {
      businessDate: dayKey,
      movementType: input.movementType,
      amountCents: input.amountCents,
      description: input.description,
      evidenceRequirement: input.evidenceRequirement,
    };

    const candidateHash = createHash("sha256")
      .update(JSON.stringify(candidatePayload))
      .digest("hex");

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    const row = await this.confirmationRepo.createEntryConfirmation({
      tenantId,
      workspaceId,
      registerId: input.registerId,
      conversationId: ctx.correlationId ?? null,
      preparedByUserId: ctx.userId ?? "system",
      businessDate: dayKey,
      candidatePayload,
      candidateHash,
      version: 1,
      status: "PENDING",
      expiresAt,
    });

    return ok({
      confirmation: {
        id: row.id,
        tenantId: row.tenantId,
        workspaceId: row.workspaceId,
        registerId: row.registerId,
        conversationId: row.conversationId,
        preparedByUserId: row.preparedByUserId,
        businessDate: row.businessDate,
        candidatePayload: row.candidatePayload,
        candidateHash: row.candidateHash,
        version: row.version,
        status: row.status as "PENDING" | "CONFIRMED" | "CONSUMED" | "EXPIRED",
        expiresAt: row.expiresAt.toISOString(),
        createdAt: row.createdAt.toISOString(),
      },
    });
  }
}
