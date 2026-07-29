import { Inject, Injectable } from "@nestjs/common";
import {
  type CashReportPreviewDto,
  type GetCashReportPreviewQuery,
  type CashReportWarning,
  type CashReportEvidenceRequirement,
  type CashReportCalculationOperand,
  type OpeningBalanceResolution,
} from "@corely/contracts";
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
  CASH_ENTRY_REPO,
  CASH_REGISTER_REPO,
  CASH_DAY_CLOSE_REPO,
  CASH_ATTACHMENT_REPO,
  type CashEntryRepoPort,
  type CashRegisterRepoPort,
  type CashDayCloseRepoPort,
  type CashAttachmentRepoPort,
} from "../ports/cash-management.ports";
import { assertCanReadCash } from "../../policies/assert-cash-policies";

const receiptRequiredTypes = new Set<string>([
  "EXPENSE_CASH",
  "REFUND_CASH",
  "BANK_DEPOSIT",
  "BANK_WITHDRAWAL",
  "CORRECTION",
  "CLOSING_ADJUSTMENT",
  "OUT",
]);

const toDayKey = (value?: string): string =>
  value ? value.slice(0, 10) : new Date().toISOString().slice(0, 10);

@RequireTenant()
@Injectable()
export class GetCashReportPreviewQueryUseCase extends BaseUseCase<
  GetCashReportPreviewQuery,
  { preview: CashReportPreviewDto }
> {
  constructor(
    @Inject(CASH_REGISTER_REPO)
    private readonly registerRepo: CashRegisterRepoPort,
    @Inject(CASH_ENTRY_REPO)
    private readonly entryRepo: CashEntryRepoPort,
    @Inject(CASH_DAY_CLOSE_REPO)
    private readonly dayCloseRepo: CashDayCloseRepoPort,
    @Inject(CASH_ATTACHMENT_REPO)
    private readonly attachmentRepo: CashAttachmentRepoPort
  ) {
    super({ logger: undefined });
  }

  protected async handle(
    input: GetCashReportPreviewQuery,
    ctx: UseCaseContext
  ): Promise<Result<{ preview: CashReportPreviewDto }, UseCaseError>> {
    assertCanReadCash(ctx, input.registerId);

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

    const [entries, dayClose, latestFinalizedClose, unclosedPriorDayKeys] = await Promise.all([
      this.entryRepo.listEntries(tenantId, workspaceId, {
        registerId: register.id,
        dayKeyFrom: dayKey,
        dayKeyTo: dayKey,
      }),
      this.dayCloseRepo.findDayCloseByRegisterAndDay(tenantId, workspaceId, register.id, dayKey),
      this.dayCloseRepo.getLatestFinalizedCloseBefore(tenantId, workspaceId, register.id, dayKey),
      this.entryRepo.listUnclosedDayKeysBefore(tenantId, workspaceId, register.id, dayKey),
    ]);

    const baselineBalanceCents = latestFinalizedClose
      ? latestFinalizedClose.countedBalanceCents ?? latestFinalizedClose.expectedBalanceCents
      : 0;

    const unclosedLedgerDeltaCents = await this.entryRepo.sumCashEntryDelta(
      tenantId,
      workspaceId,
      register.id,
      latestFinalizedClose ? latestFinalizedClose.dayKey : null,
      dayKey
    );

    const openingBalanceCents = baselineBalanceCents + unclosedLedgerDeltaCents;

    const isProvisional = unclosedPriorDayKeys.length > 0;
    const openingBalanceResolution: OpeningBalanceResolution = {
      amountCents: openingBalanceCents,
      source: latestFinalizedClose
        ? isProvisional
          ? "PROJECTED_FROM_LEDGER"
          : "PREVIOUS_FINALIZED_CLOSE"
        : isProvisional
        ? "PROJECTED_FROM_LEDGER"
        : "REGISTER_INITIAL_BALANCE",
      baselineDayKey: latestFinalizedClose?.dayKey ?? null,
      projectedThroughDayKey: isProvisional ? dayKey : null,
      isProvisional,
      unclosedPriorDayKeys,
    };

    let goodsPurchasesCents = 0;
    let businessExpensesCents = 0;
    let privateWithdrawalsCents = 0;
    let bankDepositsCents = 0;
    let otherCashOutflowsCents = 0;
    let cashRefundOutflowsCents = 0;

    let cashInflowCents = 0;
    let otherNonSalesCashInflowsCents = 0;
    let privateDepositsCents = 0;
    let bankWithdrawalsToCashCents = 0;
    let cashRefundInflowsCents = 0;

    for (const entry of entries) {
      if (entry.type === "INTERNAL_TRANSFER" || entry.type === "LOCATION_TRANSFER" || entry.status === "CANCELLED" || entry.status === "DRAFT") {
        continue;
      }
      const amount = entry.amountCents;
      if (entry.direction === "OUT") {
        if (entry.type === "EXPENSE_CASH") {
          businessExpensesCents += amount;
        } else if (entry.type === "OWNER_WITHDRAWAL") {
          privateWithdrawalsCents += amount;
        } else if (entry.type === "BANK_DEPOSIT") {
          bankDepositsCents += amount;
        } else if (entry.type === "REFUND_CASH") {
          cashRefundOutflowsCents += amount;
        } else {
          otherCashOutflowsCents += amount;
        }
      } else {
        // IN
        if (entry.type === "SALE_CASH") {
          cashInflowCents += amount;
        } else if (entry.type === "OWNER_DEPOSIT") {
          privateDepositsCents += amount;
        } else if (entry.type === "BANK_WITHDRAWAL") {
          bankWithdrawalsToCashCents += amount;
        } else if (entry.type === "REFUND_IN") {
          cashRefundInflowsCents += amount;
        } else {
          otherNonSalesCashInflowsCents += amount;
        }
      }
    }

    const expectedClosingCashCents =
      openingBalanceCents +
      cashInflowCents +
      cashRefundInflowsCents +
      privateDepositsCents +
      bankWithdrawalsToCashCents +
      otherNonSalesCashInflowsCents -
      businessExpensesCents -
      goodsPurchasesCents -
      privateWithdrawalsCents -
      bankDepositsCents -
      cashRefundOutflowsCents -
      otherCashOutflowsCents;

    const countedClosingCashCents = dayClose?.countedBalanceCents ?? null;
    const effectiveClosingCashCents = countedClosingCashCents ?? expectedClosingCashCents;

    const cashDifferenceCents =
      countedClosingCashCents === null ? null : countedClosingCashCents - expectedClosingCashCents;

    const totalOutflowsCents =
      goodsPurchasesCents +
      businessExpensesCents +
      privateWithdrawalsCents +
      bankDepositsCents +
      cashRefundOutflowsCents +
      otherCashOutflowsCents;

    const totalNonSalesInflowsCents =
      privateDepositsCents +
      bankWithdrawalsToCashCents +
      cashRefundInflowsCents +
      otherNonSalesCashInflowsCents;

    const cashReceivedCents = effectiveClosingCashCents + totalOutflowsCents - openingBalanceCents;
    const calculatedCashSalesCents = cashReceivedCents - totalNonSalesInflowsCents;

    const subtotalCents = effectiveClosingCashCents;

    const operands: CashReportCalculationOperand[] = [];
    operands.push({
      key: "effectiveClosingCashCents",
      label: "Kassenbestand bei Geschäftsschluss",
      amountCents: effectiveClosingCashCents,
      operator: "ADD",
    });

    if (totalOutflowsCents > 0) {
      operands.push({
        key: "totalOutflowsCents",
        label: "Ausgaben im Laufe des Tages",
        amountCents: totalOutflowsCents,
        operator: "ADD",
      });
    }

    operands.push({
      key: "previousClosingCashCents",
      label: "Kassenendbestand des Vortages",
      amountCents: openingBalanceCents,
      operator: "SUBTRACT",
    });

    operands.push({
      key: "cashReceivedCents",
      label: "Kasseneingang",
      amountCents: cashReceivedCents,
      operator: "RESULT",
    });

    if (totalNonSalesInflowsCents > 0) {
      operands.push({
        key: "totalNonSalesInflowsCents",
        label: "Sonstige Einnahmen",
        amountCents: totalNonSalesInflowsCents,
        operator: "SUBTRACT",
      });
    }

    operands.push({
      key: "calculatedCashSalesCents",
      label: "Berechnete Tageslosung",
      amountCents: calculatedCashSalesCents,
      operator: "RESULT",
    });

    const monthKey = dayKey.slice(0, 7);
    const monthAttachments = await this.attachmentRepo.listAttachmentsForMonth(
      tenantId,
      workspaceId,
      register.id,
      monthKey
    );
    const attachmentEntryIds = new Set(monthAttachments.map((a) => a.entryId));
    const evidenceRequirements: CashReportEvidenceRequirement[] = [];

    const requiresReceipt = (entry: any): boolean => receiptRequiredTypes.has(entry.type);

    const missingReceiptEntries = entries.filter(
      (entry) => requiresReceipt(entry) && !attachmentEntryIds.has(entry.id)
    );

    for (const entry of entries) {
      if (requiresReceipt(entry)) {
        let reqType: "RECEIPT" | "BANK_SLIP" | "EIGENBELEG" = "RECEIPT";
        if (entry.type === "BANK_DEPOSIT" || entry.type === "BANK_WITHDRAWAL") {
          reqType = "BANK_SLIP";
        }
        if (entry.type === "OWNER_WITHDRAWAL" || entry.type === "OWNER_DEPOSIT") {
          reqType = "EIGENBELEG";
        }

        const doc = monthAttachments.find((a) => a.entryId === entry.id);
        evidenceRequirements.push({
          entryId: entry.id,
          movementType: entry.type,
          type: reqType,
          satisfied: !!doc,
          documentId: doc?.documentId,
        });
      }
    }

    const verificationStatus =
      countedClosingCashCents === null
        ? "NOT_COUNTED"
        : cashDifferenceCents === 0
        ? "COUNTED_MATCH"
        : "COUNTED_DIFFERENCE";

    const warnings: CashReportWarning[] = [];
    let status: "OPEN" | "CALCULATED" | "VERIFIED" | "LOCKED" = "OPEN";

    if (dayClose?.status === "SUBMITTED") {
      status = "LOCKED";
    } else {
      if (countedClosingCashCents !== null && cashDifferenceCents !== 0) {
        warnings.push({
          code: "BALANCE_MISMATCH",
          severity: "BLOCKING",
          message: "Kassenbestand stimmt nicht mit den berechneten Bewegungen überein.",
        });
      }

      if (missingReceiptEntries.length > 0) {
        warnings.push({
          code: "MISSING_RECEIPT",
          severity: "WARNING",
          message: "Es fehlen Belege für einige Einträge.",
        });
      }

      if (calculatedCashSalesCents < 0) {
        warnings.push({
          code: "OTHER", // Should ideally be NEGATIVE_CALCULATED_CASH_SALES, mapped to OTHER for strict types
          severity: "WARNING",
          message: "Calculated cash sales are negative. Check the opening balance and cash entries.",
        });
      }

      if (isProvisional) {
        warnings.push({
          code: "PREVIOUS_DAY_MISMATCH",
          severity: "INFO",
          message: `The opening balance includes entries from unclosed prior days. Close ${unclosedPriorDayKeys.join(", ")} before finalizing this day.`,
        });
      }

      if (countedClosingCashCents === null) {
        status = "CALCULATED";
      } else {
        status = "VERIFIED";
      }
    }

    return ok({
      preview: {
        businessDate: dayKey,
        reportNumber: undefined,
        business: {
          name: register.name,
          locationName: register.location ?? undefined,
        },
        previousClosingCashCents: openingBalanceCents,
        openingBalanceResolution,
        expectedClosingCashCents,
        countedClosingCashCents,
        effectiveClosingCashCents,
        cashDifferenceCents,
        verificationStatus,
        goodsPurchasesCents,
        businessExpensesCents,
        privateWithdrawalsCents,
        bankDepositsCents,
        otherCashOutflowsCents,
        subtotalCents,
        cashInflowCents,
        otherNonSalesCashInflowsCents,
        privateDepositsCents,
        bankWithdrawalsToCashCents,
        calculatedCashSalesCents,
        customerCount: undefined,
        calculation: { operands },
        status: status as any,
        warnings,
        evidenceRequirements,
        generatedAt: new Date().toISOString(),
        version: 1,
      },
    });
  }
}
