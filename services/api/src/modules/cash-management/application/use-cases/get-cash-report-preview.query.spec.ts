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

  it("should calculate cash sales correctly with finalized previous day close", async () => {
    registerRepo.findRegisterById.mockResolvedValue({
      id: "reg-1",
      name: "Main Register",
      currentBalanceCents: 10000, // 100 EUR
    } as CashRegister);

    dayCloseRepo.getLatestFinalizedCloseBefore.mockResolvedValue({
      dayKey: "2023-10-09",
      status: "SUBMITTED",
      countedBalanceCents: 12000,
    } as any);
    dayCloseRepo.findDayCloseByRegisterAndDay.mockResolvedValue({
      status: "OPEN",
      countedBalanceCents: 20000,
    } as any);
    entryRepo.listUnclosedDayKeysBefore.mockResolvedValue([]);
    entryRepo.sumCashEntryDelta.mockResolvedValue(0);
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
      expect(preview.previousClosingCashCents).toBe(12000);
      expect(preview.countedClosingCashCents).toBe(20000);
      expect(preview.effectiveClosingCashCents).toBe(20000);
      expect(preview.businessExpensesCents).toBe(5000);
      expect(preview.calculatedCashSalesCents).toBe(13000);
      expect(preview.status).toBe("VERIFIED");
      expect(preview.openingBalanceResolution?.isProvisional).toBe(false);
      expect(preview.openingBalanceResolution?.source).toBe("PREVIOUS_FINALIZED_CLOSE");
    }
  });

  it("should calculate provisional opening balance for unclosed prior days", async () => {
    registerRepo.findRegisterById.mockResolvedValue({
      id: "reg-1",
      name: "Main Register",
    } as CashRegister);

    // 22.07 finalized @ 12960
    dayCloseRepo.getLatestFinalizedCloseBefore.mockResolvedValue({
      dayKey: "2026-07-22",
      status: "SUBMITTED",
      countedBalanceCents: 12960,
    } as any);
    dayCloseRepo.findDayCloseByRegisterAndDay.mockResolvedValue(null);

    // 23.07 unclosed with +12440 delta
    entryRepo.listUnclosedDayKeysBefore.mockResolvedValue(["2026-07-23"]);
    entryRepo.sumCashEntryDelta.mockResolvedValue(12440);
    attachmentRepo.listAttachmentsForMonth.mockResolvedValue([]);

    // 24.07 sale +7760
    entryRepo.listEntries.mockResolvedValue([
      {
        id: "e2",
        amountCents: 7760,
        type: CashEntryType.SALE_CASH,
        direction: CashEntryDirection.IN,
        occurredAt: new Date("2026-07-24T10:00:00Z"),
        entryNo: 2,
      } as any,
    ]);

    const result = await useCase.execute({ registerId: "reg-1", businessDate: "2026-07-24" }, ctx);

    expect(isErr(result)).toBe(false);
    if (!isErr(result)) {
      const { preview } = result.value;
      // Opening balance: 12960 + 12440 = 25400 (254.00 €)
      expect(preview.previousClosingCashCents).toBe(25400);
      // Expected closing: 25400 + 7760 = 33160 (331.60 €)
      expect(preview.expectedClosingCashCents).toBe(33160);
      expect(preview.openingBalanceResolution?.isProvisional).toBe(true);
      expect(preview.openingBalanceResolution?.source).toBe("PROJECTED_FROM_LEDGER");
      expect(preview.openingBalanceResolution?.unclosedPriorDayKeys).toEqual(["2026-07-23"]);
      expect(preview.warnings.some((w) => w.code === "PREVIOUS_DAY_MISMATCH")).toBe(true);
    }
  });
});
