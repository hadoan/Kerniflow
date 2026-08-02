import { GetCashReportPreviewQueryUseCase } from "./get-cash-report-preview.query";
import {
  CashEntryRepoPort,
  CashRegisterRepoPort,
  CashDayCloseRepoPort,
  CashAttachmentRepoPort,
} from "../ports/cash-management.ports";
import { mock } from "vitest-mock-extended";
import { UseCaseContext, NotFoundError, isErr } from "@corely/kernel";
import { CashRegister, CashEntryType, CashEntryDirection } from "@corely/contracts";

describe("GetCashReportPreviewQueryUseCase", () => {
  const registerRepo = mock<CashRegisterRepoPort>();
  const entryRepo = mock<CashEntryRepoPort>();
  const dayCloseRepo = mock<CashDayCloseRepoPort>();
  const attachmentRepo = mock<CashAttachmentRepoPort>();

  let useCase: GetCashReportPreviewQueryUseCase;

  const ctx: UseCaseContext = {
    tenantId: "tenant-1",
    workspaceId: "workspace-1",
    userId: "user-1",
    permissions: ["cash:read", "cash:write"],
  };

  beforeEach(() => {
    useCase = new GetCashReportPreviewQueryUseCase(
      registerRepo,
      entryRepo,
      dayCloseRepo,
      attachmentRepo
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should throw NotFoundError if register is not found", async () => {
    registerRepo.findRegisterById.mockResolvedValue(null);

    const result = await useCase.execute({ registerId: "reg-1", businessDate: "2023-10-10" }, ctx);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(NotFoundError);
      expect(result.error.code).toBe("CashManagement:RegisterNotFound");
    }
  });

  it("should calculate cash sales correctly", async () => {
    registerRepo.findRegisterById.mockResolvedValue({
      id: "reg-1",
      name: "Main Register",
      currentBalanceCents: 10000, // 100 EUR
    } as CashRegister);

    // Give it a submitted previous day close
    dayCloseRepo.listDayCloses.mockResolvedValue([
      { dayKey: "2023-10-09", status: "SUBMITTED", countedBalanceCents: 12000 } as any,
    ]);
    dayCloseRepo.findDayCloseByRegisterAndDay.mockResolvedValue({
      status: "OPEN",
      countedBalanceCents: 20000,
    } as any);
    attachmentRepo.listAttachmentsForMonth.mockResolvedValue([]);

    entryRepo.listEntries.mockResolvedValue([
      {
        id: "e1",
        amountCents: 5000,
        type: CashEntryType.EXPENSE_CASH,
        direction: CashEntryDirection.OUT,
        occurredAt: new Date("2023-10-10T10:00:00Z"),
        entryNo: 1,
        balanceAfterCents: 7000,
      } as any,
    ]);

    const result = await useCase.execute({ registerId: "reg-1", businessDate: "2023-10-10" }, ctx);

    expect(isErr(result)).toBe(false);
    if (!isErr(result)) {
      const { preview } = result.value;
      expect(preview.previousClosingCashCents).toBe(12000); // from first entry's before-balance: 7000 - (-5000) = 12000
      expect(preview.countedClosingCashCents).toBe(20000);
      expect(preview.effectiveClosingCashCents).toBe(20000);
      expect(preview.businessExpensesCents).toBe(5000);
      // calculatedCashSalesCents = 20000 + 5000 - 12000 = 13000
      expect(preview.calculatedCashSalesCents).toBe(13000);
      expect(preview.status).toBe("VERIFIED"); // counted cash present, missing receipts are a warning only
    }
  });

  it("uses the ledger balance as opening balance before the first submitted close", async () => {
    registerRepo.findRegisterById.mockResolvedValue({
      id: "reg-1",
      name: "Main Register",
      currentBalanceCents: 5440,
    } as CashRegister);
    dayCloseRepo.listDayCloses.mockResolvedValue([]);
    dayCloseRepo.findDayCloseByRegisterAndDay.mockResolvedValue(null);
    entryRepo.getExpectedBalanceAtDay.mockResolvedValue(5440);
    entryRepo.listEntries.mockResolvedValue([]);
    attachmentRepo.listAttachmentsForMonth.mockResolvedValue([]);

    const result = await useCase.execute({ registerId: "reg-1", businessDate: "2026-07-30" }, ctx);

    expect(isErr(result)).toBe(false);
    if (!isErr(result)) {
      expect(result.value.preview.previousClosingCashCents).toBe(5440);
      expect(result.value.preview.expectedClosingCashCents).toBe(5440);
    }
  });

  it("uses the latest closed-day revision for cash receipt calculations", async () => {
    registerRepo.findRegisterById.mockResolvedValue({
      id: "reg-1",
      name: "Main Register",
      currentBalanceCents: 66100,
    } as CashRegister);
    dayCloseRepo.listDayCloses.mockResolvedValue([
      { dayKey: "2026-07-27", status: "SUBMITTED", countedBalanceCents: 53440 } as any,
    ]);
    dayCloseRepo.findDayCloseByRegisterAndDay.mockResolvedValue({
      status: "SUBMITTED",
      countedBalanceCents: 78760,
    } as any);
    dayCloseRepo.listRevisions.mockResolvedValue([
      {
        revisionNo: 1,
        correctedSnapshot: { expectedBalanceCents: 66100 },
      } as any,
    ]);
    entryRepo.getExpectedBalanceAtDay.mockResolvedValue(53440);
    entryRepo.listEntries.mockResolvedValue([
      {
        id: "sale-1",
        amountCents: 12660,
        type: CashEntryType.SALE_CASH,
        direction: CashEntryDirection.IN,
        occurredAt: new Date("2026-07-28T10:00:00Z"),
        entryNo: 1,
        balanceAfterCents: 66100,
      } as any,
    ]);
    attachmentRepo.listAttachmentsForMonth.mockResolvedValue([]);

    const result = await useCase.execute({ registerId: "reg-1", businessDate: "2026-07-28" }, ctx);

    expect(isErr(result)).toBe(false);
    if (!isErr(result)) {
      const { preview } = result.value;
      expect(preview.countedClosingCashCents).toBe(78760);
      expect(preview.effectiveClosingCashCents).toBe(66100);
      expect(preview.calculatedCashSalesCents).toBe(12660);
    }
  });

  it("carries a prior corrected close into the next closed-day revision", async () => {
    registerRepo.findRegisterById.mockResolvedValue({
      id: "reg-1",
      name: "Main Register",
      currentBalanceCents: 34500,
    } as CashRegister);
    dayCloseRepo.listDayCloses.mockResolvedValue([
      { dayKey: "2026-07-28", status: "SUBMITTED", countedBalanceCents: 78760 } as any,
    ]);
    dayCloseRepo.findDayCloseByRegisterAndDay.mockResolvedValue({
      status: "SUBMITTED",
      countedBalanceCents: 15560,
    } as any);
    dayCloseRepo.listRevisions.mockImplementation(async (_tenant, _workspace, _register, dayKey) =>
      dayKey === "2026-07-28"
        ? ([{ revisionNo: 1, correctedSnapshot: { expectedBalanceCents: 66100 } }] as any)
        : []
    );
    entryRepo.getExpectedBalanceAtDay.mockResolvedValue(66100);
    entryRepo.listEntries.mockResolvedValue([
      {
        id: "sale-1",
        amountCents: 8400,
        type: CashEntryType.SALE_CASH,
        direction: CashEntryDirection.IN,
        occurredAt: new Date("2026-07-29T10:00:00Z"),
        entryNo: 1,
        balanceAfterCents: 74500,
      } as any,
      {
        id: "bank-deposit-1",
        amountCents: 40000,
        type: CashEntryType.BANK_DEPOSIT,
        direction: CashEntryDirection.OUT,
        occurredAt: new Date("2026-07-29T11:00:00Z"),
        entryNo: 2,
        balanceAfterCents: 34500,
      } as any,
    ]);
    attachmentRepo.listAttachmentsForMonth.mockResolvedValue([]);

    const result = await useCase.execute({ registerId: "reg-1", businessDate: "2026-07-29" }, ctx);

    expect(isErr(result)).toBe(false);
    if (!isErr(result)) {
      const { preview } = result.value;
      expect(preview.previousClosingCashCents).toBe(66100);
      expect(preview.effectiveClosingCashCents).toBe(34500);
      expect(preview.calculatedCashSalesCents).toBe(8400);
    }
  });
});
