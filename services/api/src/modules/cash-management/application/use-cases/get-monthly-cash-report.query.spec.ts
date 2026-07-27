import { GetMonthlyCashReportQueryUseCase } from "./get-monthly-cash-report.query";
import {
  CashRegisterRepoPort,
  CashDayCloseRepoPort,
  CashEntryRepoPort,
} from "../ports/cash-management.ports";
import { mock } from "vitest-mock-extended";
import { UseCaseContext, NotFoundError, isErr } from "@corely/kernel";
import { CashRegister, CashDayCloseStatus } from "@corely/contracts";

describe("GetMonthlyCashReportQueryUseCase", () => {
  const registerRepo = mock<CashRegisterRepoPort>();
  const entryRepo = mock<CashEntryRepoPort>();
  const dayCloseRepo = mock<CashDayCloseRepoPort>();

  let useCase: GetMonthlyCashReportQueryUseCase;

  const ctx: UseCaseContext = {
    tenantId: "tenant-1",
    workspaceId: "workspace-1",
    userId: "user-1",
    permissions: ["cash:read", "cash:write"],
  };

  beforeEach(() => {
    useCase = new GetMonthlyCashReportQueryUseCase(registerRepo, entryRepo, dayCloseRepo);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("1. should return ACTIVE_PERIOD_UNKNOWN and null missing days if no records exist", async () => {
    registerRepo.findRegisterById.mockResolvedValue({ id: "reg-1" } as CashRegister);
    entryRepo.listEntries.mockResolvedValue([]);
    dayCloseRepo.listDayCloses.mockResolvedValue([]);

    const result = await useCase.execute({ registerId: "reg-1", year: 2023, month: 10 }, ctx);

    expect(isErr(result)).toBe(false);
    if (!isErr(result)) {
      const report = result.value.report;
      expect(report.isComplete).toBe(false);
      expect(report.coverage.status).toBe("ACTIVE_PERIOD_UNKNOWN");
      expect(report.coverage.missingDayCount).toBeNull();
      expect(report.closedDayCount).toBe(0);
      expect(report.warnings).toContainEqual(
        expect.objectContaining({
          code: "REGISTER_ACTIVE_PERIOD_UNKNOWN",
        })
      );
    }
  });

  it("2. should return KNOWN coverage and missing days if mid-month activation", async () => {
    registerRepo.findRegisterById.mockResolvedValue({ id: "reg-1" } as CashRegister);
    entryRepo.listEntries.mockResolvedValue([]);
    // Register activated on Oct 15th
    const today = new Date().toISOString().slice(0, 10);
    dayCloseRepo.listDayCloses.mockImplementation(async (t, w, filters) => {
      if (filters?.dayKeyTo?.startsWith("2023-10")) {
        return [
          {
            id: "close-1",
            registerId: "reg-1",
            dayKey: "2023-10-15",
            status: "SUBMITTED",
            countedBalanceCents: 10000,
          },
          {
            id: "close-2",
            registerId: "reg-1",
            dayKey: "2023-10-18",
            status: "SUBMITTED",
            countedBalanceCents: 10000,
          },
        ] as any;
      }
      return [];
    });

    const result = await useCase.execute({ registerId: "reg-1", year: 2023, month: 10 }, ctx);

    expect(isErr(result)).toBe(false);
    if (!isErr(result)) {
      const report = result.value.report;
      expect(report.coverage.status).toBe("KNOWN");
      expect(report.coverage.missingDayCount).toBe(2); // Missing 16th and 17th
      expect(report.coverage.expectedFrom).toBe("2023-10-15");
      expect(report.coverage.expectedTo).toBe("2023-10-18");
    }
  });

  it("3. should handle leap years and timezone boundaries", async () => {
    registerRepo.findRegisterById.mockResolvedValue({ id: "reg-1" } as CashRegister);
    entryRepo.listEntries.mockResolvedValue([]);
    dayCloseRepo.listDayCloses.mockImplementation(async (t, w, filters) => {
      if (filters?.dayKeyTo?.startsWith("2024-02")) {
        return [
          {
            id: "close-1",
            registerId: "reg-1",
            dayKey: "2024-02-28",
            status: "SUBMITTED",
            countedBalanceCents: 10000,
          },
          {
            id: "close-2",
            registerId: "reg-1",
            dayKey: "2024-02-29",
            status: "SUBMITTED",
            countedBalanceCents: 10000,
          },
        ] as any;
      }
      return [];
    });

    const result = await useCase.execute({ registerId: "reg-1", year: 2024, month: 2 }, ctx);

    expect(isErr(result)).toBe(false);
    if (!isErr(result)) {
      const report = result.value.report;
      expect(report.coverage.status).toBe("KNOWN");
      expect(report.days.find((d) => d.date === "2024-02-29")?.status).toBe("CLOSED");
      expect(report.periodEnd).toBe("2024-02-29");
    }
  });

  it("4. should reconcile monthly totals exactly with the sum of daily retrograde cash sales", async () => {
    registerRepo.findRegisterById.mockResolvedValue({ id: "reg-1" } as CashRegister);
    entryRepo.listEntries.mockResolvedValue([
      {
        id: "e-1",
        dayKey: "2023-10-15",
        type: "OPENING_BALANCE",
        amountCents: 10000,
        balanceAfterCents: 10000,
        direction: "IN",
        occurredAt: new Date("2023-10-15T08:00:00Z"),
        entryNo: 1,
      },
      {
        id: "e-2",
        dayKey: "2023-10-15",
        type: "SALE_CASH",
        amountCents: 8000,
        balanceAfterCents: 18000,
        direction: "IN",
        occurredAt: new Date("2023-10-15T12:00:00Z"),
        entryNo: 2,
      },
      {
        id: "e-3",
        dayKey: "2023-10-15",
        type: "EXPENSE_CASH",
        amountCents: 3000,
        balanceAfterCents: 15000,
        direction: "OUT",
        occurredAt: new Date("2023-10-15T15:00:00Z"),
        entryNo: 3,
      },
      {
        id: "e-4",
        dayKey: "2023-10-16",
        type: "OPENING_BALANCE",
        amountCents: 20000,
        balanceAfterCents: 20000,
        direction: "IN",
        occurredAt: new Date("2023-10-16T08:00:00Z"),
        entryNo: 4,
      },
      {
        id: "e-5",
        dayKey: "2023-10-16",
        type: "SALE_CASH",
        amountCents: 5000,
        balanceAfterCents: 25000,
        direction: "IN",
        occurredAt: new Date("2023-10-16T12:00:00Z"),
        entryNo: 5,
      },
    ] as any);

    dayCloseRepo.listDayCloses.mockImplementation(async (t, w, filters) => {
      if (filters?.dayKeyTo?.startsWith("2023-10")) {
        return [
          {
            id: "close-1",
            registerId: "reg-1",
            dayKey: "2023-10-15",
            status: "SUBMITTED",
            countedBalanceCents: 20000,
          }, // 100 + 80 - 30 = 150. Discrepancy +50.
          {
            id: "close-2",
            registerId: "reg-1",
            dayKey: "2023-10-16",
            status: "SUBMITTED",
            countedBalanceCents: 25000,
          },
        ] as any;
      }
      return [];
    });

    const result = await useCase.execute({ registerId: "reg-1", year: 2023, month: 10 }, ctx);

    expect(isErr(result)).toBe(false);
    if (!isErr(result)) {
      const report = result.value.report;

      const day1 = report.days.find((d) => d.date === "2023-10-15");
      const day2 = report.days.find((d) => d.date === "2023-10-16");

      expect(day1!.cashSalesCents).toBe(13000); // 200 + 30 - 100 = 130
      expect(day2!.cashSalesCents).toBe(5000); // 250 - 200 = 50

      expect(report.totals.cashSalesCents).toBe(18000); // 13000 + 5000
      expect(report.totals.cashSalesCents).toBe(day1!.cashSalesCents + day2!.cashSalesCents);
    }
  });

  it("5. should detect continuity mismatch across month boundaries", async () => {
    registerRepo.findRegisterById.mockResolvedValue({ id: "reg-1" } as CashRegister);
    entryRepo.listEntries.mockResolvedValue([
      {
        id: "e-1",
        dayKey: "2023-10-01",
        type: "OPENING_BALANCE",
        amountCents: 25000,
        balanceAfterCents: 25000,
        direction: "IN",
        occurredAt: new Date("2023-10-01T08:00:00Z"),
        entryNo: 1,
      },
    ] as any);

    dayCloseRepo.listDayCloses.mockImplementation(async (t, w, filters) => {
      if (filters?.dayKeyTo?.startsWith("2023-10")) {
        return [
          {
            id: "close-2",
            registerId: "reg-1",
            dayKey: "2023-10-01",
            status: "SUBMITTED",
            countedBalanceCents: 25000,
          },
        ] as any;
      }
      return [
        {
          id: "close-1",
          registerId: "reg-1",
          dayKey: "2023-09-30",
          status: "SUBMITTED",
          countedBalanceCents: 20000,
        },
      ] as any;
    });

    const result = await useCase.execute({ registerId: "reg-1", year: 2023, month: 10 }, ctx);

    expect(isErr(result)).toBe(false);
    if (!isErr(result)) {
      const report = result.value.report;
      expect(report.warnings).toContainEqual(
        expect.objectContaining({
          code: "BALANCE_CONTINUITY_MISMATCH",
          severity: "error",
          date: "2023-10-01",
          previousDate: "2023-09-30",
          expectedOpeningCashCents: 20000,
          actualOpeningCashCents: 0,
        })
      );
    }
  });

  it("6. should enforce tenant isolation", async () => {
    // Because tenantId is strictly passed from ctx, the useCase uses it for all repo calls.
    // We mock a failure if tenant mismatch, or simply assert it calls the repo with the correct tenantId.
    registerRepo.findRegisterById.mockResolvedValue({ id: "reg-1" } as CashRegister);
    entryRepo.listEntries.mockResolvedValue([]);
    dayCloseRepo.listDayCloses.mockResolvedValue([]);

    await useCase.execute({ registerId: "reg-1", year: 2023, month: 10 }, ctx);

    expect(registerRepo.findRegisterById).toHaveBeenCalledWith("tenant-1", "workspace-1", "reg-1");
    expect(entryRepo.listEntries).toHaveBeenCalledWith(
      "tenant-1",
      "workspace-1",
      expect.any(Object)
    );
    expect(dayCloseRepo.listDayCloses).toHaveBeenCalledWith(
      "tenant-1",
      "workspace-1",
      expect.any(Object)
    );
  });
});
