import { Inject, Injectable } from "@nestjs/common";
import {
  type CashReportPreviewDto,
  type GetCashReportPreviewQuery,
  type CashReportWarning,
  type CashReportEvidenceRequirement,
  type CashReportCalculationOperand,
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
import { assertCanManageCash } from "../../policies/assert-cash-policies";

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

    const [entries, dayClose, previousDayCloseResult] = await Promise.all([
      this.entryRepo.listEntries(tenantId, workspaceId, {
        registerId: register.id,
        dayKeyFrom: dayKey,
        dayKeyTo: dayKey,
      }),
      this.dayCloseRepo.findDayCloseByRegisterAndDay(tenantId, workspaceId, register.id, dayKey),
      this.dayCloseRepo.listDayCloses(tenantId, workspaceId, { registerId: register.id }),
    ]);

    // Find the previous day close
    const allClosesAsc = previousDayCloseResult
      .slice()
      .sort((a, b) => a.dayKey.localeCompare(b.dayKey));
    const previousCloses = allClosesAsc.filter(
      (c) => c.dayKey < dayKey && c.status === "SUBMITTED"
    );
    const previousClose =
      previousCloses.length > 0 ? previousCloses[previousCloses.length - 1] : null;

    const previousClosingCashCents =
      previousClose?.countedBalanceCents ?? register.currentBalanceCents; // Fallback to current if no close

    const entriesAsc = entries
      .slice()
      .sort(
        (left, right) =>
          left.occurredAt.getTime() - right.occurredAt.getTime() || left.entryNo - right.entryNo
      );

    // Using the first entry's before-balance if available as a better estimate of opening balance
    const openingBalanceCents =
      entriesAsc.length > 0
        ? entriesAsc[0].balanceAfterCents -
          (entriesAsc[0].direction === "OUT"
            ? -entriesAsc[0].amountCents
            : entriesAsc[0].amountCents)
        : previousClosingCashCents;

    const goodsPurchasesCents = 0;
    let businessExpensesCents = 0;
    let privateWithdrawalsCents = 0;
    let bankDepositsCents = 0;
    let otherCashOutflowsCents = 0;

    let cashInflowCents = 0;
    let otherNonSalesCashInflowsCents = 0;
    let privateDepositsCents = 0;
    let bankWithdrawalsToCashCents = 0;

    for (const entry of entries) {
      const amount = entry.amountCents;
      if (entry.direction === "OUT") {
        if (entry.type === "EXPENSE_CASH") {
          // We group all expenses into businessExpensesCents for now as there's no explicit GOODS_PURCHASE type
          businessExpensesCents += amount;
        } else if (entry.type === "OWNER_WITHDRAWAL") {
          privateWithdrawalsCents += amount;
        } else if (entry.type === "BANK_DEPOSIT") {
          bankDepositsCents += amount;
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
        } else {
          otherNonSalesCashInflowsCents += amount;
        }
      }
    }

    const actualClosingCashCents = dayClose?.countedBalanceCents;
    const subtotalCents = actualClosingCashCents ?? 0;

    const calculatedCashSalesCents =
      (actualClosingCashCents ?? 0) +
      goodsPurchasesCents +
      businessExpensesCents +
      privateWithdrawalsCents +
      bankDepositsCents +
      otherCashOutflowsCents -
      openingBalanceCents -
      privateDepositsCents -
      bankWithdrawalsToCashCents -
      otherNonSalesCashInflowsCents;

    const operands: CashReportCalculationOperand[] = [];
    if (actualClosingCashCents !== undefined) {
      operands.push({
        key: "actualClosingCashCents",
        label: "Tatsächlicher Kassenbestand",
        amountCents: actualClosingCashCents,
        operator: "ADD",
      });
    }
    if (goodsPurchasesCents > 0) {
      operands.push({
        key: "goodsPurchasesCents",
        label: "Wareneinkäufe",
        amountCents: goodsPurchasesCents,
        operator: "ADD",
      });
    }
    if (businessExpensesCents > 0) {
      operands.push({
        key: "businessExpensesCents",
        label: "Geschäftsausgaben",
        amountCents: businessExpensesCents,
        operator: "ADD",
      });
    }
    if (privateWithdrawalsCents > 0) {
      operands.push({
        key: "privateWithdrawalsCents",
        label: "Privatentnahmen",
        amountCents: privateWithdrawalsCents,
        operator: "ADD",
      });
    }
    if (bankDepositsCents > 0) {
      operands.push({
        key: "bankDepositsCents",
        label: "Bankeinzahlungen",
        amountCents: bankDepositsCents,
        operator: "ADD",
      });
    }
    if (otherCashOutflowsCents > 0) {
      operands.push({
        key: "otherCashOutflowsCents",
        label: "Sonstige Ausgaben",
        amountCents: otherCashOutflowsCents,
        operator: "ADD",
      });
    }

    operands.push({
      key: "previousClosingCashCents",
      label: "Kassenendbestand des Vortages",
      amountCents: openingBalanceCents,
      operator: "SUBTRACT",
    });

    if (privateDepositsCents > 0) {
      operands.push({
        key: "privateDepositsCents",
        label: "Privateinlagen",
        amountCents: privateDepositsCents,
        operator: "SUBTRACT",
      });
    }
    if (bankWithdrawalsToCashCents > 0) {
      operands.push({
        key: "bankWithdrawalsToCashCents",
        label: "Bankabhebungen",
        amountCents: bankWithdrawalsToCashCents,
        operator: "SUBTRACT",
      });
    }
    if (otherNonSalesCashInflowsCents > 0) {
      operands.push({
        key: "otherNonSalesCashInflowsCents",
        label: "Sonstige Einnahmen",
        amountCents: otherNonSalesCashInflowsCents,
        operator: "SUBTRACT",
      });
    }

    if (actualClosingCashCents !== undefined) {
      operands.push({
        key: "calculatedCashSalesCents",
        label: "Berechnete Tageslosung",
        amountCents: calculatedCashSalesCents,
        operator: "RESULT",
      });
    }

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

    const expectedClosingBalance =
      openingBalanceCents +
      cashInflowCents +
      otherNonSalesCashInflowsCents +
      privateDepositsCents +
      bankWithdrawalsToCashCents -
      businessExpensesCents -
      goodsPurchasesCents -
      privateWithdrawalsCents -
      bankDepositsCents -
      otherCashOutflowsCents;

    const warnings: CashReportWarning[] = [];
    let status: "DRAFT" | "NEEDS_REVIEW" | "READY_TO_CLOSE" | "CLOSED" = "DRAFT";

    if (dayClose?.status === "SUBMITTED") {
      status = "CLOSED";
    } else {
      if (actualClosingCashCents === undefined) {
        warnings.push({
          code: "COUNTED_CASH_MISSING",
          severity: "BLOCKING",
          message: "Gezähltes Bargeld fehlt.",
        });
      } else if (actualClosingCashCents !== expectedClosingBalance) {
        warnings.push({
          code: "BALANCE_MISMATCH",
          severity: "BLOCKING",
          message: "Kassenbestand stimmt nicht mit den berechneten Bewegungen überein.",
        });
      }

      if (previousClose && previousClose.countedBalanceCents !== openingBalanceCents) {
        warnings.push({
          code: "PREVIOUS_DAY_MISMATCH",
          severity: "BLOCKING",
          message: "Anfangsbestand stimmt nicht mit dem Endbestand des Vortages überein.",
        });
      }

      if (missingReceiptEntries.length > 0) {
        warnings.push({
          code: "MISSING_RECEIPT",
          severity: "WARNING",
          message: "Es fehlen Belege für einige Einträge.",
        });
      }

      if (calculatedCashSalesCents !== undefined && calculatedCashSalesCents < 0) {
        warnings.push({
          code: "NEGATIVE_CASH",
          severity: "BLOCKING",
          message: "Kassenbestand darf nicht negativ sein.",
        });
      }

      const hasBlocking = warnings.some((w) => w.severity === "BLOCKING");
      if (hasBlocking || warnings.length > 0) {
        status = "NEEDS_REVIEW";
      } else if (actualClosingCashCents !== undefined) {
        status = "READY_TO_CLOSE";
      }
    }

    return ok({
      preview: {
        businessDate: dayKey,
        reportNumber: dayClose?.dayCloseNo ? `${dayClose.dayCloseNo}` : undefined,
        business: {
          name: register.name,
          locationName: register.location ?? undefined,
        },
        previousClosingCashCents: openingBalanceCents,
        actualClosingCashCents,
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
        status,
        warnings,
        evidenceRequirements,
        generatedAt: new Date().toISOString(),
        version: 1,
      },
    });
  }
}
