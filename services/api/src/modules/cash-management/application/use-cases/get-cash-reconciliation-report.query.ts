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
    const [allEntries, periodEntries, periodCloses] = await Promise.all([
      this.entries.listEntries(ctx.tenantId, ctx.workspaceId, { registerId: register.id }),
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
    const orderedAll = [...allEntries].sort(
      (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime() || a.entryNo - b.entryNo
    );
    const opening =
      orderedAll.filter((entry) => entry.dayKey < input.fromDate).at(-1)?.balanceAfterCents ?? 0;
    const ordered = [...periodEntries].sort(
      (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime() || a.entryNo - b.entryNo
    );
    const totalIncomeCents = ordered
      .filter((entry) => entry.direction === "IN")
      .reduce((sum, entry) => sum + entry.amountCents, 0);
    const totalExpenseCents = ordered
      .filter((entry) => entry.direction === "OUT")
      .reduce((sum, entry) => sum + entry.amountCents, 0);
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
        rows: ordered.map((entry) => ({
          id: entry.id,
          dayKey: entry.dayKey,
          entryNo: entry.entryNo,
          description: entry.description,
          direction: entry.direction,
          amountCents: entry.amountCents,
          balanceAfterCents: entry.balanceAfterCents,
          receiptNumber: entry.sourceDocumentRef,
        })),
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
