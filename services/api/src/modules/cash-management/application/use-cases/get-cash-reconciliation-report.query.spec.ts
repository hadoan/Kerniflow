import { CashEntryDirection, CashEntryType, type CashRegister } from "@corely/contracts";
import { isErr, type UseCaseContext } from "@corely/kernel";
import { mock } from "vitest-mock-extended";
import type {
  CashDayCloseRepoPort,
  CashEntryRepoPort,
  CashRegisterRepoPort,
} from "../ports/cash-management.ports";
import type { CashEntryEntity } from "../../domain/entities";
import { GetCashReconciliationReportQueryUseCase } from "./get-cash-reconciliation-report.query";

const ctx: UseCaseContext = {
  tenantId: "tenant-1",
  workspaceId: "workspace-1",
  userId: "user-1",
  permissions: ["cash:read"],
};

const makeEntry = (overrides: Partial<CashEntryEntity>): CashEntryEntity => ({
  id: "entry-1",
  tenantId: "tenant-1",
  workspaceId: "workspace-1",
  registerId: "register-1",
  entryNo: 1,
  occurredAt: new Date("2026-07-31T12:00:00.000Z"),
  dayKey: "2026-07-31",
  description: "Cash sale",
  type: CashEntryType.SALE_CASH,
  direction: CashEntryDirection.IN,
  source: "MANUAL",
  paymentMethod: "CASH",
  amountCents: 12000,
  grossAmountCents: 12000,
  netAmountCents: 10084,
  taxAmountCents: 1916,
  taxMode: "OUTPUT_VAT",
  taxCodeId: "tax-code-1",
  taxCode: "DE_STD_19",
  taxRateBps: 1900,
  taxLabel: "USt 19%",
  currency: "EUR",
  balanceAfterCents: 45640,
  sourceDocumentId: null,
  sourceDocumentRef: null,
  sourceDocumentKind: null,
  referenceId: null,
  reversalOfEntryId: null,
  reversedByEntryId: null,
  lockedByDayCloseId: null,
  createdAt: new Date("2026-08-02T12:00:00.000Z"),
  createdByUserId: "user-1",
  ...overrides,
});

describe("GetCashReconciliationReportQueryUseCase", () => {
  const registerRepo = mock<CashRegisterRepoPort>();
  const entryRepo = mock<CashEntryRepoPort>();
  const dayCloseRepo = mock<CashDayCloseRepoPort>();
  let useCase: GetCashReconciliationReportQueryUseCase;

  beforeEach(() => {
    vi.resetAllMocks();
    useCase = new GetCashReconciliationReportQueryUseCase(registerRepo, entryRepo, dayCloseRepo);
    registerRepo.findRegisterById.mockResolvedValue({
      id: "register-1",
      name: "Main Register",
      currency: "EUR",
    } as CashRegister);
    dayCloseRepo.listDayCloses.mockResolvedValue([]);
  });

  it("recalculates row balances from the ledger opening instead of stored snapshots", async () => {
    entryRepo.getExpectedBalanceAtDay.mockResolvedValue(85640);
    entryRepo.listEntries.mockResolvedValue([makeEntry({})]);

    const result = await useCase.execute(
      { registerId: "register-1", fromDate: "2026-08-16", toDate: "2026-08-31" },
      ctx
    );

    expect(isErr(result)).toBe(false);
    if (!isErr(result)) {
      expect(result.value.report.openingBalanceCents).toBe(85640);
      expect(result.value.report.rows[0].balanceAfterCents).toBe(97640);
      expect(result.value.report.calculatedClosingBalanceCents).toBe(97640);
    }
    expect(entryRepo.getExpectedBalanceAtDay).toHaveBeenCalledWith(
      "tenant-1",
      "workspace-1",
      "register-1",
      "2026-08-15"
    );
  });

  it("nets a same-day reversal against income and preserves the audit rows", async () => {
    const original = makeEntry({
      id: "sale-original",
      entryNo: 1,
      amountCents: 12660,
      grossAmountCents: 12660,
    });
    const duplicate = makeEntry({
      id: "sale-duplicate",
      entryNo: 2,
      amountCents: 12660,
      grossAmountCents: 12660,
      reversedByEntryId: "sale-reversal",
    });
    const reversal = makeEntry({
      id: "sale-reversal",
      entryNo: 3,
      description: "Reversal #2: duplicate sale",
      type: CashEntryType.CORRECTION,
      direction: CashEntryDirection.OUT,
      amountCents: 12660,
      grossAmountCents: 12660,
      reversalOfEntryId: duplicate.id,
    });
    entryRepo.getExpectedBalanceAtDay.mockResolvedValue(53440);
    entryRepo.listEntries.mockResolvedValue([original, duplicate, reversal]);

    const result = await useCase.execute(
      { registerId: "register-1", fromDate: "2026-07-01", toDate: "2026-07-31" },
      ctx
    );

    expect(isErr(result)).toBe(false);
    if (!isErr(result)) {
      const report = result.value.report;
      expect(report.rows).toHaveLength(3);
      expect(report.rows.map((row) => row.balanceAfterCents)).toEqual([66100, 78760, 66100]);
      expect(report.rows[2]).toMatchObject({ direction: "IN", amountCents: -12660 });
      expect(report.totalIncomeCents).toBe(12660);
      expect(report.totalExpenseCents).toBe(0);
      expect(report.calculatedClosingBalanceCents).toBe(66100);
    }
  });
});
