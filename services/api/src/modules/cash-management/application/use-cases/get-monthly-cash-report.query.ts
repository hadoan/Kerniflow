import { Inject, Injectable } from "@nestjs/common";
import {
  type GetMonthlyCashReportQuery,
  type MonthlyCashReportDto,
  type MonthlyCashReportWarning,
  type MonthlyCashReportDayRow,
  type MonthlyCashReportTotals,
} from "@corely/contracts";
import { type CashEntryEntity } from "../../domain/entities";
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
  type CashEntryRepoPort,
  type CashRegisterRepoPort,
  type CashDayCloseRepoPort,
} from "../ports/cash-management.ports";
import { toCashReportingMovements } from "../../domain/cash-entry-reporting";
import { assertCanManageCash } from "../../policies/assert-cash-policies";

const isExpectedOperatingDay = (dayKey: string, todayKey: string): boolean => {
  // Policy: We expect all days up to today to be operating days.
  // This can be replaced with an actual business hours check later.
  return dayKey <= todayKey;
};

const getDaysInMonth = (year: number, month: number): string[] => {
  const days: string[] = [];
  const date = new Date(Date.UTC(year, month - 1, 1));
  while (date.getUTCMonth() === month - 1) {
    days.push(date.toISOString().slice(0, 10));
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return days;
};

@RequireTenant()
@Injectable()
export class GetMonthlyCashReportQueryUseCase extends BaseUseCase<
  GetMonthlyCashReportQuery,
  { report: MonthlyCashReportDto }
> {
  constructor(
    @Inject(CASH_REGISTER_REPO)
    private readonly registerRepo: CashRegisterRepoPort,
    @Inject(CASH_ENTRY_REPO)
    private readonly entryRepo: CashEntryRepoPort,
    @Inject(CASH_DAY_CLOSE_REPO)
    private readonly dayCloseRepo: CashDayCloseRepoPort
  ) {
    super({ logger: undefined });
  }

  protected async handle(
    input: GetMonthlyCashReportQuery,
    ctx: UseCaseContext
  ): Promise<Result<{ report: MonthlyCashReportDto }, UseCaseError>> {
    assertCanManageCash(ctx, input.registerId);

    const tenantId = ctx.tenantId;
    const workspaceId = ctx.workspaceId;
    if (!tenantId || !workspaceId) {
      throw new ValidationError("Missing tenant/workspace context");
    }

    if (input.month < 1 || input.month > 12) {
      throw new ValidationError("Invalid month");
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

    const monthPadded = String(input.month).padStart(2, "0");
    const monthKey = `${input.year}-${monthPadded}`;
    const periodStart = `${monthKey}-01`;
    const lastDay = new Date(Date.UTC(input.year, input.month, 0)).getUTCDate();
    const periodEnd = `${monthKey}-${String(lastDay).padStart(2, "0")}`;

    const [entries, closesResult] = await Promise.all([
      this.entryRepo.listEntries(tenantId, workspaceId, {
        registerId: register.id,
        dayKeyFrom: periodStart,
        dayKeyTo: periodEnd,
      }),
      this.dayCloseRepo.listDayCloses(tenantId, workspaceId, {
        registerId: register.id,
        dayKeyFrom: periodStart,
        dayKeyTo: periodEnd,
      }),
    ]);

    const submittedCloses = closesResult.filter((c) => c.status === "SUBMITTED");
    const submittedClosesMap = new Map(submittedCloses.map((c) => [c.dayKey, c]));

    const entriesByDay = new Map<string, CashEntryEntity[]>();
    for (const entry of entries) {
      // Only process entries for submitted closes
      if (submittedClosesMap.has(entry.dayKey)) {
        if (!entriesByDay.has(entry.dayKey)) {
          entriesByDay.set(entry.dayKey, []);
        }
        entriesByDay.get(entry.dayKey)!.push(entry);
      }
    }

    const totals: MonthlyCashReportTotals = {
      cashSalesCents: 0,
      goodsPurchasesCents: 0,
      businessExpensesCents: 0,
      privateWithdrawalsCents: 0,
      privateDepositsCents: 0,
      bankDepositsCents: 0,
      bankWithdrawalsToCashCents: 0,
      otherCashOutflowsCents: 0,
      otherNonSalesCashInflowsCents: 0,
    };

    const warnings: MonthlyCashReportWarning[] = [];
    const dayRows: MonthlyCashReportDayRow[] = [];
    const todayKey = new Date().toISOString().slice(0, 10);
    const allDays = getDaysInMonth(input.year, input.month);

    let previousClosingCashCents: number | null = null;
    let previousClosedDayKey: string | null = null;

    // Get previous day close BEFORE this month if needed for continuity of first day
    // This is optional but good if we want strict continuity across months
    const prevMonthClosesResult = await this.dayCloseRepo.listDayCloses(tenantId, workspaceId, {
      registerId: register.id,
    });
    const beforeMonthCloses = prevMonthClosesResult
      .filter((c) => c.status === "SUBMITTED" && c.dayKey < periodStart)
      .sort((a, b) => a.dayKey.localeCompare(b.dayKey));

    if (beforeMonthCloses.length > 0) {
      previousClosingCashCents =
        beforeMonthCloses[beforeMonthCloses.length - 1].countedBalanceCents;
      previousClosedDayKey = beforeMonthCloses[beforeMonthCloses.length - 1].dayKey;
    }

    let closedDayCount = 0;
    let missingDayCount = 0;
    let discrepancyDayCount = 0;

    let firstClosedDayKey: string | null = null;
    let lastClosedDayKey: string | null = null;

    for (const dayKey of allDays) {
      if (submittedClosesMap.has(dayKey)) {
        if (!firstClosedDayKey) {
          firstClosedDayKey = dayKey;
        }
        lastClosedDayKey = dayKey;
      }
    }

    let coverageStatus:
      | "KNOWN"
      | "NOT_ACTIVE"
      | "ACTIVE_PERIOD_UNKNOWN"
      | "INCOMPLETE_CONFIGURATION" = "KNOWN";

    if (!firstClosedDayKey) {
      coverageStatus = "ACTIVE_PERIOD_UNKNOWN";
      warnings.push({
        code: "REGISTER_ACTIVE_PERIOD_UNKNOWN",
        severity: "warning",
        message:
          "Der Zeitraum der Kassenführung ist nicht bekannt, weshalb fehlende Tage nicht ermittelt werden können.",
      });
    }

    for (const dayKey of allDays) {
      const dayClose = submittedClosesMap.get(dayKey);
      const isExpected = isExpectedOperatingDay(dayKey, todayKey);
      const isWithinActiveBounds =
        firstClosedDayKey &&
        lastClosedDayKey &&
        dayKey >= firstClosedDayKey &&
        dayKey <= lastClosedDayKey;

      if (!dayClose) {
        if (isExpected && isWithinActiveBounds) {
          missingDayCount++;
          dayRows.push({
            date: dayKey,
            status: "MISSING",
            openingCashCents: null,
            cashSalesCents: 0,
            cashInflowsCents: 0,
            cashOutflowsCents: 0,
            calculatedClosingCashCents: null,
            actualClosingCashCents: null,
            discrepancyCents: null,
          });
          warnings.push({
            code: "MISSING_CASH_DAY",
            severity: "warning",
            message: `Der Kassenabschluss für ${dayKey} fehlt.`,
            date: dayKey,
          });
        }
        continue;
      }

      closedDayCount++;
      const dayEntries = entriesByDay.get(dayKey) ?? [];
      const entriesAsc = [...dayEntries].sort((a, b) => {
        if (a.occurredAt instanceof Date && b.occurredAt instanceof Date) {
          return a.occurredAt.getTime() - b.occurredAt.getTime() || a.entryNo - b.entryNo;
        }
        const timeA = new Date(a.occurredAt).getTime();
        const timeB = new Date(b.occurredAt).getTime();
        return timeA - timeB || a.entryNo - b.entryNo;
      });

      let openingBalanceCents = 0;
      if (entriesAsc.length > 0) {
        openingBalanceCents =
          entriesAsc[0].balanceAfterCents -
          (entriesAsc[0].direction === "OUT"
            ? -entriesAsc[0].amountCents
            : entriesAsc[0].amountCents);
      } else {
        // Fallback to previous day closing cash if no entries, or 0
        openingBalanceCents = previousClosingCashCents ?? 0;
      }

      if (previousClosingCashCents !== null && previousClosingCashCents !== openingBalanceCents) {
        warnings.push({
          code: "BALANCE_CONTINUITY_MISMATCH",
          severity: "error",
          message: `Anfangsbestand stimmt nicht mit dem Endbestand des vorherigen abgeschlossenen Tages überein.`,
          date: dayKey,
          previousDate: previousClosedDayKey ?? undefined,
          expectedOpeningCashCents: previousClosingCashCents,
          actualOpeningCashCents: openingBalanceCents,
        });
      }

      if (openingBalanceCents < 0) {
        warnings.push({
          code: "NEGATIVE_CASH",
          severity: "error",
          message: `Negativer Anfangsbestand am ${dayKey}.`,
          date: dayKey,
        });
      }

      const goodsPurchasesCents = 0;
      let businessExpensesCents = 0;
      let privateWithdrawalsCents = 0;
      let bankDepositsCents = 0;
      let otherCashOutflowsCents = 0;

      let cashInflowCents = 0;
      let otherNonSalesCashInflowsCents = 0;
      let privateDepositsCents = 0;
      let bankWithdrawalsToCashCents = 0;

      for (const entry of toCashReportingMovements(dayEntries)) {
        const amount = entry.amountCents;
        if (entry.direction === "OUT") {
          if (entry.type === "EXPENSE_CASH") {
            businessExpensesCents += amount;
          } else if (entry.type === "OWNER_WITHDRAWAL") {
            privateWithdrawalsCents += amount;
          } else if (entry.type === "BANK_DEPOSIT") {
            bankDepositsCents += amount;
          } else {
            otherCashOutflowsCents += amount;
          }
        } else {
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

      const totalCashInflowsCents =
        cashInflowCents +
        privateDepositsCents +
        bankWithdrawalsToCashCents +
        otherNonSalesCashInflowsCents;
      const totalCashOutflowsCents =
        goodsPurchasesCents +
        businessExpensesCents +
        privateWithdrawalsCents +
        bankDepositsCents +
        otherCashOutflowsCents;

      const calculatedClosingCashCents =
        openingBalanceCents + totalCashInflowsCents - totalCashOutflowsCents;
      const actualClosingCashCents = dayClose.countedBalanceCents;
      const discrepancyCents = actualClosingCashCents - calculatedClosingCashCents;

      // Note: calculatedCashSalesCents is calculated retrogradely in the daily report,
      // but for the monthly report totals, we sum up the individual categories directly.
      // cashInflowCents here reflects SALE_CASH which is the same logic as daily (except daily calculates it retrogradely).
      // Wait, the prompt says: "The daily calculated closing balance must use the same formula and sign conventions as the existing daily Kassenbericht."
      // Let's use the retrograde calculation for cash sales to be consistent with daily Kassenbericht.
      const calculatedCashSalesCents =
        actualClosingCashCents +
        goodsPurchasesCents +
        businessExpensesCents +
        privateWithdrawalsCents +
        bankDepositsCents +
        otherCashOutflowsCents -
        openingBalanceCents -
        privateDepositsCents -
        bankWithdrawalsToCashCents -
        otherNonSalesCashInflowsCents;

      if (actualClosingCashCents < 0 || calculatedClosingCashCents < 0) {
        warnings.push({
          code: "NEGATIVE_CASH",
          severity: "error",
          message: `Negativer Endbestand am ${dayKey}.`,
          date: dayKey,
        });
      }

      let status: MonthlyCashReportDayRow["status"] = "CLOSED";
      if (discrepancyCents !== 0) {
        status = "DISCREPANCY";
        discrepancyDayCount++;
        warnings.push({
          code: "BALANCE_MISMATCH",
          severity: "warning",
          message: `Kassendifferenz von ${discrepancyCents} am ${dayKey}.`,
          date: dayKey,
        });
      }

      dayRows.push({
        date: dayKey,
        status,
        openingCashCents: openingBalanceCents,
        cashSalesCents: calculatedCashSalesCents,
        cashInflowsCents: totalCashInflowsCents,
        cashOutflowsCents: totalCashOutflowsCents,
        calculatedClosingCashCents,
        actualClosingCashCents,
        discrepancyCents,
        cashDayCloseId: dayClose.id,
      });

      totals.cashSalesCents += calculatedCashSalesCents;
      totals.goodsPurchasesCents += goodsPurchasesCents;
      totals.businessExpensesCents += businessExpensesCents;
      totals.privateWithdrawalsCents += privateWithdrawalsCents;
      totals.privateDepositsCents += privateDepositsCents;
      totals.bankDepositsCents += bankDepositsCents;
      totals.bankWithdrawalsToCashCents += bankWithdrawalsToCashCents;
      totals.otherCashOutflowsCents += otherCashOutflowsCents;
      totals.otherNonSalesCashInflowsCents += otherNonSalesCashInflowsCents;

      previousClosingCashCents = actualClosingCashCents;
      previousClosedDayKey = dayKey;
    }

    if (closedDayCount === 0) {
      warnings.push({
        code: "NO_CLOSED_CASH_DAYS",
        severity: "warning",
        message: "Keine abgeschlossenen Kassentage in diesem Monat gefunden.",
      });
    }

    const firstRow = dayRows.find((r) => r.status === "CLOSED" || r.status === "DISCREPANCY");
    const lastRow = [...dayRows]
      .reverse()
      .find((r) => r.status === "CLOSED" || r.status === "DISCREPANCY");

    const isComplete =
      coverageStatus === "KNOWN" &&
      missingDayCount === 0 &&
      discrepancyDayCount === 0 &&
      !warnings.some((w) => w.code === "BALANCE_CONTINUITY_MISMATCH") &&
      !warnings.some((w) => w.severity === "blocking" || w.severity === "error") &&
      closedDayCount > 0;

    return ok({
      report: {
        registerId: register.id,
        year: input.year,
        month: input.month,
        periodStart,
        periodEnd,
        openingCashCents: firstRow?.openingCashCents ?? null,
        closingCashCents: lastRow?.actualClosingCashCents ?? null,
        totals,
        days: dayRows,
        warnings,
        coverage: {
          status: coverageStatus,
          missingDayCount: coverageStatus === "ACTIVE_PERIOD_UNKNOWN" ? null : missingDayCount,
          expectedFrom: firstClosedDayKey ?? undefined,
          expectedTo: lastClosedDayKey ?? undefined,
          evaluatedDayCount: allDays.length,
        },
        closedDayCount,
        discrepancyDayCount,
        isComplete,
        generatedAt: new Date().toISOString(),
      },
    });
  }
}
