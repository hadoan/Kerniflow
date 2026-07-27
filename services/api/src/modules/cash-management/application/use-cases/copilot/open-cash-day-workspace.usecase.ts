import { Inject, Injectable } from "@nestjs/common";
import { createHash } from "crypto";
import type { OpenCashDayWorkspaceInput, OpenCashDayWorkspaceOutput } from "@corely/contracts";
import {
  BaseUseCase,
  NotFoundError,
  RequireTenant,
  ValidationError,
  ok,
  type Result,
  type UseCaseContext,
  type UseCaseError,
} from "@corely/kernel";
import {
  CASH_REGISTER_REPO,
  CASH_WORKSPACE_REPO,
  CASH_WORKSPACE_HANDOFF_REPO,
  CASH_ENTRY_CONFIRMATION_REPO,
  type CashRegisterRepoPort,
  type CashWorkspaceRepoPort,
  type CashWorkspaceHandoffRepoPort,
  type CashEntryConfirmationRepoPort,
} from "../../ports/cash-management.ports";
import { assertCanManageCash } from "../../../policies/assert-cash-policies";

const toDayKey = (value?: string): string =>
  value ? value.slice(0, 10) : new Date().toISOString().slice(0, 10);

@RequireTenant()
@Injectable()
export class OpenCashDayWorkspaceUseCase extends BaseUseCase<
  OpenCashDayWorkspaceInput,
  OpenCashDayWorkspaceOutput
> {
  constructor(
    @Inject(CASH_REGISTER_REPO)
    private readonly registerRepo: CashRegisterRepoPort,
    @Inject(CASH_WORKSPACE_REPO)
    private readonly workspaceRepo: CashWorkspaceRepoPort,
    @Inject(CASH_WORKSPACE_HANDOFF_REPO)
    private readonly handoffRepo: CashWorkspaceHandoffRepoPort,
    @Inject(CASH_ENTRY_CONFIRMATION_REPO)
    private readonly confirmationRepo: CashEntryConfirmationRepoPort
  ) {
    super({ logger: undefined });
  }

  protected async handle(
    input: OpenCashDayWorkspaceInput,
    ctx: UseCaseContext
  ): Promise<Result<OpenCashDayWorkspaceOutput, UseCaseError>> {
    assertCanManageCash(ctx, input.registerId);

    const tenantId = ctx.tenantId;
    const sourceWorkspaceId = ctx.workspaceId;
    if (!tenantId || !sourceWorkspaceId) {
      throw new ValidationError("Missing tenant/workspace context");
    }

    const register = await this.registerRepo.findRegisterById(
      tenantId,
      sourceWorkspaceId, // Register belongs to the same core platform workspace usually
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

    // Find or create the unique DAILY_CASH_DAY workspace
    const targetWorkspace = await this.workspaceRepo.findCanonicalWorkspace(
      tenantId,
      sourceWorkspaceId,
      input.registerId,
      "DAILY_CASH_DAY",
      new Date(dayKey),
      null
    );

    let targetAssistantWorkspaceId = targetWorkspace?.id;
    let targetConversationId = targetWorkspace?.conversationId;

    if (!targetWorkspace) {
      // Assuming conversation ID can be generated here or the repo does it if null?
      // Wait, we need to generate one
      targetConversationId = `cw_${Math.random().toString(36).substr(2, 9)}`;
      const newWorkspace = await this.workspaceRepo.createWorkspace({
        tenantId,
        workspaceId: sourceWorkspaceId,
        registerId: input.registerId,
        locationId: register.location,
        type: "DAILY_CASH_DAY",
        businessDate: new Date(dayKey),
        businessMonth: null,
        conversationId: targetConversationId,
        cashDayId: null,
        createdByUserId: ctx.userId ?? "system",
      });
      targetAssistantWorkspaceId = newWorkspace.id;
    }

    // 4. Prepare entry confirmation idempotently
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

    const confirmation = await this.confirmationRepo.createEntryConfirmation({
      tenantId,
      workspaceId: sourceWorkspaceId,
      registerId: input.registerId,
      conversationId: targetConversationId!,
      preparedByUserId: ctx.userId ?? "system",
      businessDate: dayKey,
      candidatePayload,
      candidateHash,
      version: 1,
      status: "PENDING",
      expiresAt,
    });

    // 3. Persist a structured handoff candidate
    const handoff = await this.handoffRepo.createHandoff({
      tenantId,
      locationId: register.location,
      registerId: input.registerId,
      sourceWorkspaceId,
      targetWorkspaceId: sourceWorkspaceId, // they are technically the same core workspace
      sourceConversationId: ctx.correlationId ?? "unknown",
      sourceMessageId: "unknown", // can be filled later if needed
      businessDate: dayKey,
      movementType: input.movementType,
      amountCents: input.amountCents,
      description: input.description,
      evidenceRequirement: input.evidenceRequirement ?? null,
      candidateHash,
      version: 1,
      confirmationId: confirmation.id,
      status: "PENDING",
      expiresAt,
    });

    return ok({
      workspaceId: targetAssistantWorkspaceId!,
      conversationId: targetConversationId!,
      handoffId: handoff.id,
      confirmationId: confirmation.id,
    });
  }
}
