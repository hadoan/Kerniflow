import { Inject, Injectable } from "@nestjs/common";
import type { ConfirmCashEntryInput } from "@corely/contracts";
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
  CASH_ENTRY_CONFIRMATION_REPO,
  type CashEntryConfirmationRepoPort,
} from "../ports/cash-management.ports";
import { assertCanManageCash } from "../../policies/assert-cash-policies";
import { AddEntryUseCase } from "./add-entry.usecase";

@RequireTenant()
@Injectable()
export class ConfirmCashEntryUseCase extends BaseUseCase<
  ConfirmCashEntryInput,
  { entryId: string }
> {
  constructor(
    @Inject(CASH_ENTRY_CONFIRMATION_REPO)
    private readonly confirmationRepo: CashEntryConfirmationRepoPort,
    private readonly addEntryUseCase: AddEntryUseCase
  ) {
    super({ logger: undefined });
  }

  protected async handle(
    input: ConfirmCashEntryInput,
    ctx: UseCaseContext
  ): Promise<Result<{ entryId: string }, UseCaseError>> {
    assertCanManageCash(ctx, input.registerId);

    const tenantId = ctx.tenantId;
    const workspaceId = ctx.workspaceId;
    if (!tenantId || !workspaceId) {
      throw new ValidationError("Missing tenant/workspace context");
    }

    const confirmation = await this.confirmationRepo.findEntryConfirmationById(
      tenantId,
      workspaceId,
      input.confirmationId
    );

    if (!confirmation || confirmation.registerId !== input.registerId) {
      throw new NotFoundError(
        "Confirmation not found or does not belong to this register",
        undefined,
        "CashManagement:ConfirmationNotFound"
      );
    }

    if (confirmation.status === "CONSUMED") {
      throw new ValidationError("Confirmation has already been consumed");
    }
    if (confirmation.status === "EXPIRED" || confirmation.expiresAt < new Date()) {
      throw new ValidationError("Confirmation has expired");
    }

    const payload = confirmation.candidatePayload;

    // Use AddEntryUseCase to safely add the entry
    const result = await this.addEntryUseCase.execute(
      {
        registerId: input.registerId,
        direction: payload.amountCents >= 0 ? "IN" : "OUT",
        type: payload.movementType,
        source: "COPILOT", // Handled by LLM
        description: payload.description,
        amountCents: Math.abs(payload.amountCents),
        businessDate: payload.businessDate,
        idempotencyKey: input.idempotencyKey,
      },
      ctx
    );

    if (isErr(result)) {
      return result; // Pass error up
    }

    await this.confirmationRepo.markEntryConfirmationConsumed(
      tenantId,
      workspaceId,
      input.confirmationId
    );

    return ok({ entryId: result.value.id });
  }
}
