import { ConfirmCashDayDraftUseCase } from "./confirm-cash-day-draft.usecase";
import {
  CashRegisterRepoPort,
  CashDayCloseRepoPort,
  CashEntryRepoPort,
  CashConfirmationRepoPort,
} from "../ports/cash-management.ports";
import { mock, mockDeep } from "vitest-mock-extended";
import {
  UseCaseContext,
  isErr,
  ok,
  UnitOfWorkPort,
  OutboxPort,
  AuditPort,
  NotFoundError,
} from "@corely/kernel";
import { CashRegister, CashDayCloseStatus } from "@corely/contracts";
import { BillingAccessPort } from "../../../billing";
import { TaxProfileRepoPort } from "../../../tax/domain/ports/tax-profile-repo.port";
import { TaxCodeRepoPort } from "../../../tax/domain/ports/tax-code-repo.port";
import { TaxRateRepoPort } from "../../../tax/domain/ports/tax-rate-repo.port";
import { IdempotencyStoragePort } from "@/shared/ports/idempotency-storage.port";

describe("ConfirmCashDayDraftUseCase", () => {
  const registerRepo = mock<CashRegisterRepoPort>();
  const entryRepo = mock<CashEntryRepoPort>();
  const dayCloseRepo = mock<CashDayCloseRepoPort>();
  const confirmationRepo = mock<CashConfirmationRepoPort>();
  const billingAccess = mock<BillingAccessPort>();
  const taxProfileRepo = mock<TaxProfileRepoPort>();
  const taxCodeRepo = mock<TaxCodeRepoPort>();
  const taxRateRepo = mock<TaxRateRepoPort>();
  const audit = mock<AuditPort>();
  const outbox = mock<OutboxPort>();
  const unitOfWork = mock<UnitOfWorkPort>();
  const idempotencyStore = mock<IdempotencyStoragePort>();

  let useCase: ConfirmCashDayDraftUseCase;

  const ctx: UseCaseContext = {
    tenantId: "tenant-1",
    workspaceId: "workspace-1",
    userId: "user-1",
    permissions: ["cash:read", "cash:write", "cash:close"],
  };

  beforeEach(() => {
    useCase = new ConfirmCashDayDraftUseCase(
      registerRepo,
      entryRepo,
      dayCloseRepo,
      confirmationRepo,
      billingAccess,
      taxProfileRepo,
      taxCodeRepo,
      taxRateRepo,
      audit,
      outbox,
      unitOfWork,
      idempotencyStore
    );

    // Default mock behaviors
    unitOfWork.withinTransaction.mockImplementation(async (cb) => cb({} as any));
    idempotencyStore.get.mockResolvedValue(null);
    idempotencyStore.set.mockResolvedValue();
    idempotencyStore.run.mockImplementation(async (key, fn) => {
      const cached = await idempotencyStore.get(key);
      if (cached) return JSON.parse(cached);
      const res = await fn();
      await idempotencyStore.set(key, JSON.stringify(res));
      return res;
    });

    billingAccess.getSubscription.mockResolvedValue({
      planCode: "pro",
      currentPeriodStart: new Date().toISOString(),
    } as any);
    billingAccess.getEntitlements.mockResolvedValue({
      featureValues: { "cash-management.dailyClosing": true },
    } as any);

    taxProfileRepo.findTaxProfileByTenant.mockResolvedValue({
      id: "tp-1",
      fallbackTaxCodeId: "tc-1",
    } as any);
    taxCodeRepo.findTaxCodeById.mockResolvedValue({
      id: "tc-1",
      code: "STD",
      taxMode: "GROSS",
      activeRates: [],
    } as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should rollback completely if upsertDayClose fails inside UoW", async () => {
    confirmationRepo.findConfirmationById.mockResolvedValue({
      id: "conf-1",
      status: "PENDING",
      registerId: "reg-1",
      expiresAt: new Date(Date.now() + 100000),
      candidatePayload: { businessDate: "2023-10-01", actualClosingCashCents: 5000, movements: [] },
    } as any);

    registerRepo.findRegisterById.mockResolvedValue({
      id: "reg-1",
      currentBalanceCents: 5000,
    } as any);

    dayCloseRepo.findDayCloseByRegisterAndDay.mockResolvedValue(null);
    entryRepo.getExpectedBalanceAtDay.mockResolvedValue(5000);

    // Mock an error during UoW
    const dbError = new Error("Database transaction aborted");
    dayCloseRepo.upsertDayClose.mockRejectedValue(dbError);

    // UseCase wraps all logic inside unitOfWork.withinTransaction.
    // If an error is thrown, it bubbles up and no catch block in the usecase swallows it.
    await expect(
      useCase.execute(
        { registerId: "reg-1", confirmationId: "conf-1", idempotencyKey: "idem-1" },
        ctx
      )
    ).rejects.toThrow("Database transaction aborted");
  });

  it("should return cached result instantly for identical idempotencyKey", async () => {
    idempotencyStore.get.mockResolvedValue({ body: { dayClose: { id: "close-99" } } } as any);

    const result = await useCase.execute(
      { registerId: "reg-1", confirmationId: "conf-1", idempotencyKey: "idem-2" },
      ctx
    );

    expect(isErr(result)).toBe(false);
    if (!isErr(result)) {
      expect(result.value.dayClose.id).toBe("close-99");
    }

    // Verify it NEVER hit the db
    expect(confirmationRepo.findConfirmationById).not.toHaveBeenCalled();
    expect(unitOfWork.withinTransaction).not.toHaveBeenCalled();
  });

  it("should reject expired confirmations", async () => {
    confirmationRepo.findConfirmationById.mockResolvedValue({
      id: "conf-1",
      status: "PENDING",
      registerId: "reg-1",
      expiresAt: new Date(Date.now() - 100000), // Expired!
      candidatePayload: {},
    } as any);

    const result = await useCase.execute(
      { registerId: "reg-1", confirmationId: "conf-1", idempotencyKey: "idem-3" },
      ctx
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error.code).toBe("CashManagement:ConfirmationExpired");
    }
    expect(confirmationRepo.markExpired).toHaveBeenCalledWith("tenant-1", "workspace-1", "conf-1");
    expect(unitOfWork.withinTransaction).not.toHaveBeenCalled();
  });
});
