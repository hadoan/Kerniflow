import { Inject, Injectable } from "@nestjs/common";
import {
  type CashReconciliationReportDto,
  type GetCashReconciliationReportQuery,
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
  CASH_DAY_CLOSE_REPO,
  CASH_ENTRY_REPO,
  CASH_REGISTER_REPO,
  type CashDayCloseRepoPort,
  type CashEntryRepoPort,
  type CashRegisterRepoPort,
} from "../ports/cash-management.ports";
import { assertCanManageCash } from "../../policies/assert-cash-policies";
import { CashBalanceCalculator } from "../../domain/cash-balance-calculator";
import { toCashReportingMovements } from "../../domain/cash-entry-reporting";

const previousDayKey = (dayKey: string): string => {
  const date = new Date(`${dayKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
};

@RequireTenant()
@Injectable()
export class GetCashReconciliationReportQueryUseCase extends BaseUseCase<
  GetCashReconciliationReportQuery,
  { report: CashReconciliationReportDto }
> {
  constructor(
    @Inject(CASH_REGISTER_REPO) private readonly registers: CashRegisterRepoPort,
    @Inject(CASH_ENTRY_REPO) private readonly entries: CashEntryRepoPort,
    @Inject(CASH_DAY_CLOSE_REPO) private readonly closes: CashDayCloseRepoPort
  ) {
    super({ logger: undefined });
  }
  protected async handle(
    input: GetCashReconciliationReportQuery,
    ctx: UseCaseContext
  ): Promise<Result<{ report: CashReconciliationReportDto }, UseCaseError>> {
    assertCanManageCash(ctx, input.registerId);
    if (!ctx.tenantId || !ctx.workspaceId) {
      throw new ValidationError("Missing tenant/workspace context");
    }
    if (input.fromDate > input.toDate) {
      throw new ValidationError("Invalid date range");
    }
    const register = await this.registers.findRegisterById(
      ctx.tenantId,
      ctx.workspaceId,
      input.registerId
    );
    if (!register) {
      throw new NotFoundError("Cash register not found");
    }
    const [opening, periodEntries, periodCloses] = await Promise.all([
      this.entries.getExpectedBalanceAtDay(
        ctx.tenantId,
        ctx.workspaceId,
        register.id,
        previousDayKey(input.fromDate)
      ),
      this.entries.listEntries(ctx.tenantId, ctx.workspaceId, {
        registerId: register.id,
        dayKeyFrom: input.fromDate,
        dayKeyTo: input.toDate,
      }),
      this.closes.listDayCloses(ctx.tenantId, ctx.workspaceId, {
        registerId: register.id,
        dayKeyFrom: input.fromDate,
        dayKeyTo: input.toDate,
      }),
    ]);
    const ordered = [...periodEntries].sort(
      (a, b) =>
        a.dayKey.localeCompare(b.dayKey) ||
        a.occurredAt.getTime() - b.occurredAt.getTime() ||
        a.entryNo - b.entryNo
    );
    const movements = toCashReportingMovements(ordered);
    let runningBalanceCents = opening;
    const rows = ordered.map((entry, index) => {
      const movement = movements[index];
      runningBalanceCents = CashBalanceCalculator.applyDelta(runningBalanceCents, movement);

      return {
        id: entry.id,
        dayKey: entry.dayKey,
        entryNo: entry.entryNo,
        description: entry.description,
        direction: movement.direction,
        amountCents: movement.amountCents,
        balanceAfterCents: runningBalanceCents,
        receiptNumber: entry.sourceDocumentRef,
      };
    });
    const totalIncomeCents = movements
      .filter((movement) => movement.direction === "IN")
      .reduce((sum, movement) => sum + movement.amountCents, 0);
    const totalExpenseCents = movements
      .filter((movement) => movement.direction === "OUT")
      .reduce((sum, movement) => sum + movement.amountCents, 0);
    const calculatedClosingBalanceCents = opening + totalIncomeCents - totalExpenseCents;
    const lastClose = periodCloses
      .filter((close) => close.status === "SUBMITTED")
      .sort((a, b) => a.dayKey.localeCompare(b.dayKey))
      .at(-1);
    const actual = lastClose?.countedBalanceCents ?? null;
    const activeDays = new Set(ordered.map((entry) => entry.dayKey));
    const submittedDays = new Set(
      periodCloses.filter((close) => close.status === "SUBMITTED").map((close) => close.dayKey)
    );
    return ok({
      report: {
        register: { id: register.id, name: register.name, currency: register.currency },
        fromDate: input.fromDate,
        toDate: input.toDate,
        openingBalanceCents: opening,
        rows,
        totalIncomeCents,
        totalExpenseCents,
        calculatedClosingBalanceCents,
        actualCountedClosingBalanceCents: actual,
        differenceCents: actual === null ? null : actual - calculatedClosingBalanceCents,
        entryCount: ordered.length,
        unclosedDayCount: [...activeDays].filter((day) => !submittedDays.has(day)).length,
        generatedAt: new Date().toISOString(),
      },
    });
  }
}
