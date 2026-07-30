import { Inject, Injectable } from "@nestjs/common";
import { createHash } from "crypto";
import type { PrepareCashDayConfirmationInput, CashDayConfirmationDto } from "@corely/contracts";
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
  CASH_CONFIRMATION_REPO,
  type CashRegisterRepoPort,
  type CashConfirmationRepoPort,
} from "../ports/cash-management.ports";
import { assertCanManageCash } from "../../policies/assert-cash-policies";
import { GetCashReportPreviewQueryUseCase } from "./get-cash-report-preview.query";

const toDayKey = (value?: string): string =>
  value ? value.slice(0, 10) : new Date().toISOString().slice(0, 10);

@RequireTenant()
@Injectable()
export class PrepareCashDayConfirmationUseCase extends BaseUseCase<
  PrepareCashDayConfirmationInput,
  { confirmation: CashDayConfirmationDto }
> {
  constructor(
    @Inject(CASH_REGISTER_REPO)
    private readonly registerRepo: CashRegisterRepoPort,
    @Inject(CASH_CONFIRMATION_REPO)
    private readonly confirmationRepo: CashConfirmationRepoPort,
    private readonly previewUseCase: GetCashReportPreviewQueryUseCase
  ) {
    super({ logger: undefined });
  }

  protected async handle(
    input: PrepareCashDayConfirmationInput,
    ctx: UseCaseContext
  ): Promise<Result<{ confirmation: CashDayConfirmationDto }, UseCaseError>> {
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
      movements: input.movements,
      actualClosingCashCents: input.actualClosingCashCents,
    };

    const candidateHash = createHash("sha256")
      .update(JSON.stringify(candidatePayload))
      .digest("hex");

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    const row = await this.confirmationRepo.createConfirmation({
      tenantId,
      workspaceId,
      registerId: input.registerId,
      conversationId: ctx.correlationId ?? "unknown",
      preparedByUserId: ctx.userId ?? "system",
      businessDate: dayKey,
      candidatePayload,
      candidateHash,
      version: 1,
      status: "PENDING",
      expiresAt,
    });

    const previewResult = await this.previewUseCase.execute(
      {
        registerId: input.registerId,
        businessDate: dayKey,
      },
      ctx
    );

    if (isErr(previewResult)) {
      return previewResult as any;
    }

    const basePreview = previewResult.value.preview;

    for (const m of input.movements) {
      if (m.type === "EXPENSE_CASH") {
        basePreview.businessExpensesCents += m.amountCents;
      }
      if (m.type === "OWNER_WITHDRAWAL") {
        basePreview.privateWithdrawalsCents += m.amountCents;
      }
      if (m.type === "BANK_DEPOSIT") {
        basePreview.bankDepositsCents += m.amountCents;
      }
      if (m.type === "OWNER_DEPOSIT") {
        basePreview.privateDepositsCents += m.amountCents;
      }
      if (m.type === "BANK_WITHDRAWAL") {
        basePreview.bankWithdrawalsToCashCents += m.amountCents;
      }

      const isOut = ["EXPENSE_CASH", "OWNER_WITHDRAWAL", "BANK_DEPOSIT", "OUT"].includes(m.type);
      if (isOut) {
        basePreview.calculation.operands.push({
          key: m.type,
          label: m.description || m.type,
          amountCents: m.amountCents,
          operator: "ADD",
        });
      } else {
        basePreview.calculation.operands.push({
          key: m.type,
          label: m.description || m.type,
          amountCents: m.amountCents,
          operator: "SUBTRACT",
        });
      }
    }

    basePreview.countedClosingCashCents = input.actualClosingCashCents;
    const confirmationDto: CashDayConfirmationDto = {
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
      status: row.status,
      expiresAt: row.expiresAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      summary: basePreview,
    };

    return ok({ confirmation: confirmationDto });
  }
}
