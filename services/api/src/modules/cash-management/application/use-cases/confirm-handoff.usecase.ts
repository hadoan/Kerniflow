import { Inject, Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  NotFoundError,
  RequireTenant,
  ValidationError,
  ok,
  Result,
  UseCaseContext,
  UseCaseError,
  isErr,
} from "@corely/kernel";
import type { UnitOfWork } from "@corely/kernel";
import {
  CASH_ENTRY_CONFIRMATION_REPO,
  CASH_WORKSPACE_HANDOFF_REPO,
} from "../ports/cash-management.ports";
import type {
  CashEntryConfirmationRepoPort,
  CashWorkspaceHandoffRepoPort,
} from "../ports/cash-management.ports";
import { assertCanManageCash } from "../../policies/assert-cash-policies";
import { ConfirmCashEntryUseCase } from "./confirm-cash-entry.usecase";
import { UNIT_OF_WORK } from "@corely/kernel";

export type ConfirmHandoffInput = {
  handoffId: string;
  expectedConversationId: string;
  idempotencyKey: string;
};

@RequireTenant()
@Injectable()
export class ConfirmHandoffUseCase extends BaseUseCase<ConfirmHandoffInput, { entryId: string }> {
  constructor(
    @Inject(CASH_WORKSPACE_HANDOFF_REPO) private readonly handoffRepo: CashWorkspaceHandoffRepoPort,
    @Inject(CASH_ENTRY_CONFIRMATION_REPO)
    private readonly confirmationRepo: CashEntryConfirmationRepoPort,
    private readonly confirmCashEntryUseCase: ConfirmCashEntryUseCase,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork
  ) {
    super({ logger: undefined });
  }

  protected async handle(
    input: ConfirmHandoffInput,
    ctx: UseCaseContext
  ): Promise<Result<{ entryId: string }, UseCaseError>> {
    const tenantId = ctx.tenantId;
    const workspaceId = ctx.workspaceId;

    if (!tenantId || !workspaceId) {
      throw new ValidationError("Missing tenant/workspace context");
    }

    return await this.uow.withinTransaction(async (tx) => {
      const handoff = await this.handoffRepo.getHandoffForUpdate(input.handoffId, tx);

      if (!handoff || handoff.tenantId !== tenantId) {
        throw new NotFoundError("Handoff not found", undefined, "CashManagement:HandoffNotFound");
      }

      assertCanManageCash(ctx, handoff.registerId);

      if (handoff.targetWorkspaceId !== workspaceId) {
        throw new ValidationError("Handoff does not belong to this workspace");
      }

      if (handoff.status === "CONSUMED") {
        throw new ValidationError("Handoff has already been consumed");
      }
      if (handoff.status === "CANCELLED") {
        throw new ValidationError("Handoff has been cancelled");
      }
      if (handoff.status === "EXPIRED" || new Date(handoff.expiresAt) < new Date()) {
        throw new ValidationError("Handoff has expired");
      }

      if (!handoff.confirmationId) {
        throw new ValidationError("Handoff has no confirmation ID");
      }

      const confirmation = await this.confirmationRepo.findEntryConfirmationById(
        tenantId,
        handoff.sourceWorkspaceId,
        handoff.confirmationId,
        tx
      );

      if (!confirmation) {
        throw new NotFoundError("Confirmation not found");
      }

      const result = await this.confirmCashEntryUseCase.execute(
        {
          registerId: handoff.registerId,
          confirmationId: confirmation.id,
          idempotencyKey: input.idempotencyKey,
        },
        // We pass the context with the tx to ensure it shares the transaction
        { ...ctx, tx }
      );

      if (isErr(result)) {
        return result;
      }

      await this.handoffRepo.markHandoffConsumed(handoff.id, tx);

      return ok({ entryId: result.value.entryId });
    });
  }
}
