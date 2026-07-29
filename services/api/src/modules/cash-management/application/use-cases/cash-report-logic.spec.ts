import { describe, it, expect, vi, beforeEach } from "vitest";
import { GetCashReportPreviewQueryUseCase } from "./get-cash-report-preview.query";
import { SubmitCashDayCloseUseCase } from "./submit-cash-day-close.usecase";

import {
  CashEntryRepoPort,
  CashRegisterRepoPort,
  CashDayCloseRepoPort,
  CashAttachmentRepoPort,
} from "../ports/cash-management.ports";
import { mock } from "vitest-mock-extended";
import { UseCaseContext, isErr } from "@corely/kernel";
import { CashRegister } from "@corely/contracts";

describe("Cash Report Logic", () => {
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
    registerRepo.findRegisterById.mockResolvedValue({
      id: "reg-1",
      currentBalanceCents: 10000,
    } as CashRegister);
    attachmentRepo.listAttachmentsForMonth.mockResolvedValue([]);
    entryRepo.listEntries.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("Unit test: skipped count", async () => {
    // Expected closing 254.00, no outflows/inflows
    dayCloseRepo.listDayCloses.mockResolvedValue([
      { dayKey: "2026-07-27", status: "SUBMITTED", countedBalanceCents: 25400 } as any,
    ]);
    dayCloseRepo.findDayCloseByRegisterAndDay.mockResolvedValue({
      status: "OPEN",
      expectedBalanceCents: 25400,
      countedBalanceCents: null, // missing closing count
    } as any);

    const result = await useCase.execute({ registerId: "reg-1", businessDate: "2026-07-28" }, ctx);

    expect(isErr(result)).toBe(false);
    if (!isErr(result)) {
      const { preview } = result.value;
      // Missing count must not be treated as 0.00
      expect(preview.countedClosingCashCents).toBeNull();
      expect(preview.effectiveClosingCashCents).toBe(25400);
      expect(preview.calculatedCashSalesCents).toBe(0);
      expect(preview.previousClosingCashCents).toBe(25400);
    }
  });

  it("Unit test: counted and matched", async () => {
    dayCloseRepo.listDayCloses.mockResolvedValue([
      { dayKey: "2026-07-27", status: "SUBMITTED", countedBalanceCents: 25400 } as any,
    ]);
    dayCloseRepo.findDayCloseByRegisterAndDay.mockResolvedValue({
      status: "OPEN",
      countedBalanceCents: 25400, // Matched expected balance
    } as any);

    const result = await useCase.execute({ registerId: "reg-1", businessDate: "2026-07-28" }, ctx);

    expect(isErr(result)).toBe(false);
    if (!isErr(result)) {
      const { preview } = result.value;
      expect(preview.countedClosingCashCents).toBe(25400);
      expect(preview.effectiveClosingCashCents).toBe(25400);
      expect(preview.calculatedCashSalesCents).toBe(0);
    }
  });
});
