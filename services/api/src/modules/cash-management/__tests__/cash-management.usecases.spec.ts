import { describe, expect, it, vi } from "vitest";
import {
  type BillingEntitlements,
  type BillingSubscription,
  CashManagementBillingFeatureKeys,
  CashManagementProductKey,
  CashDayCloseStatus,
  CashEntryDirection,
  CashEntrySource,
  CashEntryType,
  CashPaymentMethod,
} from "@corely/contracts";
import type {
  AuditPort,
  OutboxPort,
  TransactionContext,
  UnitOfWorkPort,
  UseCaseContext,
} from "@corely/kernel";
import type { IdempotencyStoragePort } from "@/shared/ports/idempotency-storage.port";
import type { TaxCodeRepoPort } from "../../tax/domain/ports/tax-code-repo.port";
import type { TaxProfileRepoPort } from "../../tax/domain/ports/tax-profile-repo.port";
import type { TaxRateRepoPort } from "../../tax/domain/ports/tax-rate-repo.port";
import { CreateCashEntryUseCase } from "../application/use-cases/create-cash-entry.usecase";
import { ReverseCashEntryUseCase } from "../application/use-cases/reverse-cash-entry.usecase";
import { GetCashDashboardQueryUseCase } from "../application/use-cases/get-cash-dashboard.query";
import { SaveCashDayCountUseCase } from "../application/use-cases/save-cash-day-count.usecase";
import { SubmitCashDayCloseUseCase } from "../application/use-cases/submit-cash-day-close.usecase";
import type { BillingAccessPort } from "../../billing";
import type {
  CashAttachmentRepoPort,
  CashDayCloseRepoPort,
  CashEntryRepoPort,
  CashExportRepoPort,
  CashRegisterRepoPort,
} from "../application/ports/cash-management.ports";
import type { CashDayCloseEntity, CashEntryEntity, CashRegisterEntity } from "../domain/entities";

const createCtx = (): UseCaseContext => ({
  tenantId: "tenant-1",
  workspaceId: "ws-1",
  userId: "user-1",
  metadata: { permissions: ["*"] },
});

const makeUnitOfWork = (): UnitOfWorkPort => ({
  withinTransaction: async <T>(fn: (tx: TransactionContext) => Promise<T>): Promise<T> =>
    fn({} as TransactionContext),
});

const makeAudit = (): AuditPort => ({
  log: vi.fn(async () => {}),
});

const makeOutbox = (): OutboxPort => ({
  enqueue: vi.fn(async () => {}),
});

const makeTaxProfileRepo = (
  regime: "SMALL_BUSINESS" | "STANDARD_VAT" | "VAT_EXEMPT" | null = "SMALL_BUSINESS"
): TaxProfileRepoPort => ({
  getActive: async () =>
    regime
      ? {
          id: "tax-profile-1",
          tenantId: "tenant-1",
          country: "DE",
          regime,
          vatEnabled: true,
          vatId: "DE123456789",
          currency: "EUR",
          filingFrequency: "MONTHLY",
          vatAccountingMethod: "IST",
          taxYearStartMonth: 1,
          localTaxOfficeName: null,
          vatExemptionParagraph: null,
          euB2BSales: false,
          hasEmployees: false,
          usesTaxAdvisor: false,
          effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
          effectiveTo: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        }
      : null,
  create: async () => {
    throw new Error("not used");
  },
  findById: async () => null,
});

const makeTaxCodeRepo = (): TaxCodeRepoPort => ({
  create: async () => {
    throw new Error("not used");
  },
  findById: async (id) => ({
    id,
    tenantId: "tenant-1",
    code: "DE_STD_19",
    kind: "STANDARD",
    label: "USt 19%",
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  }),
  findByCode: async () => null,
  findByKind: async () => [],
  findAll: async () => [],
  update: async () => {
    throw new Error("not used");
  },
  delete: async () => {},
});

const makeTaxRateRepo = (): TaxRateRepoPort => ({
  create: async () => {
    throw new Error("not used");
  },
  findEffectiveRate: async () => ({
    id: "tax-rate-1",
    tenantId: "tenant-1",
    taxCodeId: "tax-code-1",
    rateBps: 1900,
    effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
    effectiveTo: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  }),
  findByTaxCode: async () => [],
  update: async () => {
    throw new Error("not used");
  },
});

const baseSubscription: BillingSubscription = {
  accountId: "billing-account-1",
  productKey: CashManagementProductKey,
  planCode: "starter-monthly",
  entitlementSource: "paid_subscription",
  provider: "stripe",
  status: "active",
  customerRef: "cus_123",
  currentPeriodStart: "2026-02-01T00:00:00.000Z",
  currentPeriodEnd: "2026-03-01T00:00:00.000Z",
  cancelAtPeriodEnd: false,
  canceledAt: null,
  trialEndsAt: null,
  lastSyncedAt: "2026-02-01T00:00:00.000Z",
};

const baseEntitlements: BillingEntitlements = {
  productKey: CashManagementProductKey,
  planCode: "starter-monthly",
  featureValues: {
    [CashManagementBillingFeatureKeys.maxLocations]: 1,
    [CashManagementBillingFeatureKeys.maxEntriesPerMonth]: null,
    [CashManagementBillingFeatureKeys.maxReceiptsPerMonth]: null,
    [CashManagementBillingFeatureKeys.canExport]: true,
    [CashManagementBillingFeatureKeys.dailyClosing]: true,
    [CashManagementBillingFeatureKeys.aiAssistant]: false,
    [CashManagementBillingFeatureKeys.multilingualAiHelp]: false,
    [CashManagementBillingFeatureKeys.issueDetection]: false,
    [CashManagementBillingFeatureKeys.closingGuidance]: false,
    [CashManagementBillingFeatureKeys.teamAccess]: false,
    [CashManagementBillingFeatureKeys.consolidatedOverview]: false,
  },
};

const makeBillingAccess = (overrides?: Partial<BillingEntitlements>): BillingAccessPort => {
  const entitlements = {
    ...baseEntitlements,
    ...overrides,
    featureValues: {
      ...baseEntitlements.featureValues,
      ...overrides?.featureValues,
    },
  };

  return {
    getSubscription: async () => ({
      ...baseSubscription,
      planCode: entitlements.planCode,
    }),
    getEntitlements: async () => entitlements,
    getPlanFeatureValues: async () => ({}),
    getAllPlanFeatureValues: async () => ({}),
    getTrial: async () => ({
      productKey: CashManagementProductKey,
      status: "not_started",
      startedAt: null,
      endsAt: null,
      expiredAt: null,
      supersededAt: null,
      activatedByUserId: null,
      source: null,
      daysRemaining: 0,
      isExpiringSoon: false,
    }),
    getUpgradeContext: async () => ({
      productKey: CashManagementProductKey,
      effectivePlanCode: entitlements.planCode,
      entitlementSource: "paid_subscription",
      recommendedPlanCode: null,
      requiresUpgrade: false,
      isOverEntitlement: false,
      overEntitlementReasons: [],
      trial: {
        productKey: CashManagementProductKey,
        status: "not_started",
        startedAt: null,
        endsAt: null,
        expiredAt: null,
        supersededAt: null,
        activatedByUserId: null,
        source: null,
        daysRemaining: 0,
        isExpiringSoon: false,
      },
    }),
    getUsage: async () => [],
    startTrial: async () => {
      throw new Error("not used");
    },
    createCheckoutSession: async () => {
      throw new Error("not used");
    },
    createPortalSession: async () => {
      throw new Error("not used");
    },
    syncSubscription: async () => ({
      ...baseSubscription,
      planCode: entitlements.planCode,
    }),
    recordUsage: async () => {},
    setPlanForTenant: async (tenantId, productKey, planCode) => ({
      ...baseSubscription,
      accountId: tenantId,
      productKey,
      planCode,
    }),
    processVerifiedWebhookEvent: async () => {},
    expireDueTrials: async () => 0,
  };
};

class InMemoryIdempotencyStore implements IdempotencyStoragePort {
  private storeMap = new Map<string, { body: unknown; statusCode?: number }>();

  async get(actionKey: string, tenantId: string | null, key: string) {
    return this.storeMap.get(`${actionKey}:${tenantId ?? "null"}:${key}`) ?? null;
  }

  async store(
    actionKey: string,
    tenantId: string | null,
    key: string,
    response: { statusCode?: number; body: unknown }
  ) {
    this.storeMap.set(`${actionKey}:${tenantId ?? "null"}:${key}`, response);
  }
}

const baseRegister: CashRegisterEntity = {
  id: "reg-1",
  tenantId: "tenant-1",
  workspaceId: "ws-1",
  name: "Main",
  location: null,
  currency: "EUR",
  currentBalanceCents: 10000,
  disallowNegativeBalance: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const baseEntry: CashEntryEntity = {
  id: "entry-1",
  tenantId: "tenant-1",
  workspaceId: "ws-1",
  registerId: "reg-1",
  entryNo: 1,
  occurredAt: new Date("2026-02-27T09:00:00.000Z"),
  dayKey: "2026-02-27",
  description: "Sale",
  type: CashEntryType.SALE_CASH,
  direction: CashEntryDirection.IN,
  source: CashEntrySource.MANUAL,
  paymentMethod: CashPaymentMethod.CASH,
  amountCents: 2500,
  grossAmountCents: 2500,
  netAmountCents: 2500,
  taxAmountCents: 0,
  taxMode: "NONE",
  taxCodeId: null,
  taxCode: null,
  taxRateBps: null,
  taxLabel: null,
  currency: "EUR",
  balanceAfterCents: 10000,
  sourceDocumentId: null,
  sourceDocumentRef: null,
  sourceDocumentKind: null,
  referenceId: null,
  reversalOfEntryId: null,
  reversedByEntryId: null,
  lockedByDayCloseId: null,
  createdAt: new Date("2026-02-27T09:00:00.000Z"),
  createdByUserId: "user-1",
};

describe("cash-management use cases", () => {
  it("reversal creates a new entry and marks original as reversed", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-31T10:00:00.000Z"));
    const entries: CashEntryEntity[] = [{ ...baseEntry }];
    let registerBalance = 10000;

    const registerRepo: CashRegisterRepoPort = {
      createRegister: async () => baseRegister,
      countDistinctLocationsForTenant: async () => 1,
      listRegisters: async () => [baseRegister],
      findRegisterById: async () => ({ ...baseRegister, currentBalanceCents: registerBalance }),
      updateRegister: async () => baseRegister,
      setCurrentBalance: async (_tenantId, _workspaceId, _registerId, value) => {
        registerBalance = value;
      },
    };

    const entryRepo: CashEntryRepoPort = {
      nextEntryNo: async () => 2,
      createEntry: async (data) => {
        const created: CashEntryEntity = {
          ...baseEntry,
          ...data,
          id: "entry-reversal-1",
          createdAt: new Date(),
        };
        entries.push(created);
        return created;
      },
      countEntriesForPeriod: async () => entries.length,
      listEntries: async () => entries,
      findEntryById: async (_tenantId, _workspaceId, entryId) =>
        entries.find((entry) => entry.id === entryId) ?? null,
      setReversedByEntryId: async (_tenantId, _workspaceId, entryId, reversedByEntryId) => {
        const target = entries.find((entry) => entry.id === entryId);
        if (target) {
          target.reversedByEntryId = reversedByEntryId;
        }
      },
      listEntriesForMonth: async () => entries,
      getExpectedBalanceAtDay: async () => 10000,
      lockEntriesForDay: async () => {},
    };

    const dayCloseRepo: CashDayCloseRepoPort = {
      findDayCloseByRegisterAndDay: async () => null,
      upsertDayClose: async () => {
        throw new Error("not used");
      },
      replaceCountLines: async () => {},
      listDayCloses: async () => [],
      listDayClosesForMonth: async () => [],
    };

    const useCase = new ReverseCashEntryUseCase(
      registerRepo,
      entryRepo,
      dayCloseRepo,
      makeAudit(),
      makeOutbox(),
      makeUnitOfWork(),
      new InMemoryIdempotencyStore()
    );

    const result = await useCase.execute(
      {
        entryId: "entry-1",
        reason: "Wrong amount",
        idempotencyKey: "reverse-1",
      },
      createCtx()
    );

    expect(result.ok).toBe(true);
    expect(entries).toHaveLength(2);
    expect(entries[0].reversedByEntryId).toBe("entry-reversal-1");
    expect(entries[1].direction).toBe(CashEntryDirection.OUT);
    expect(entries[1].reversalOfEntryId).toBe("entry-1");
    expect(entries[1].dayKey).toBe("2026-07-31");
    expect(entries[1].occurredAt).toEqual(new Date("2026-07-31T10:00:00.000Z"));
    expect(entries[1].lockedByDayCloseId).toBeNull();
    expect(registerBalance).toBe(7500);
    vi.useRealTimers();
  });

  it("day close with difference creates closing adjustment entry", async () => {
    const createdEntries: CashEntryEntity[] = [];
    let registerBalance = 10000;
    let persistedClose: CashDayCloseEntity | null = null;
    let persistedCounts: Array<{
      denominationCents: number;
      count: number;
      subtotalCents: number;
    }> = [];

    const registerRepo: CashRegisterRepoPort = {
      createRegister: async () => baseRegister,
      countDistinctLocationsForTenant: async () => 1,
      listRegisters: async () => [baseRegister],
      findRegisterById: async () => ({ ...baseRegister, currentBalanceCents: registerBalance }),
      updateRegister: async () => baseRegister,
      setCurrentBalance: async (_tenantId, _workspaceId, _registerId, value) => {
        registerBalance = value;
      },
    };

    const entryRepo: CashEntryRepoPort = {
      nextEntryNo: async () => 2,
      createEntry: async (data) => {
        const created: CashEntryEntity = {
          ...baseEntry,
          ...data,
          id: `entry-${createdEntries.length + 2}`,
          createdAt: new Date(),
        };
        createdEntries.push(created);
        return created;
      },
      countEntriesForPeriod: async () => createdEntries.length,
      listEntries: async () => createdEntries,
      findEntryById: async () => null,
      setReversedByEntryId: async () => {},
      listEntriesForMonth: async () => createdEntries,
      getExpectedBalanceAtDay: async () => 10000,
      lockEntriesForDay: async () => {},
    };

    const dayCloseRepo: CashDayCloseRepoPort = {
      findDayCloseByRegisterAndDay: async () => persistedClose,
      upsertDayClose: async (data) => {
        persistedClose = {
          id: data.id ?? "close-1",
          tenantId: data.tenantId,
          workspaceId: data.workspaceId,
          registerId: data.registerId,
          dayKey: data.dayKey,
          expectedBalanceCents: data.expectedBalanceCents,
          countedBalanceCents: data.countedBalanceCents,
          differenceCents: data.differenceCents,
          status: data.status,
          note: data.note,
          submittedAt: data.submittedAt,
          submittedByUserId: data.submittedByUserId,
          lockedAt: data.lockedAt,
          lockedByUserId: data.lockedByUserId,
          counts: persistedCounts.map((line) => ({
            denominationCents: line.denominationCents,
            count: line.count,
            subtotalCents: line.subtotalCents,
          })),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return persistedClose;
      },
      replaceCountLines: async (_tenantId, _workspaceId, _dayCloseId, lines) => {
        persistedCounts = lines;
      },
      listDayCloses: async () => (persistedClose ? [persistedClose] : []),
      listDayClosesForMonth: async () => (persistedClose ? [persistedClose] : []),
    };

    const useCase = new SubmitCashDayCloseUseCase(
      registerRepo,
      entryRepo,
      dayCloseRepo,
      makeBillingAccess(),
      makeAudit(),
      makeOutbox(),
      makeUnitOfWork(),
      new InMemoryIdempotencyStore()
    );

    const result = await useCase.execute(
      {
        registerId: "reg-1",
        dayKey: "2026-02-27",
        countedBalanceCents: 9500,
        denominationCounts: [{ denomination: 500, count: 19, subtotal: 9500 }],
        note: "Difference noted",
        idempotencyKey: "close-1",
      },
      createCtx()
    );

    expect(result.ok).toBe(true);
    expect(createdEntries).toHaveLength(1);
    expect(createdEntries[0].type).toBe(CashEntryType.CLOSING_ADJUSTMENT);
    expect(createdEntries[0].direction).toBe(CashEntryDirection.OUT);
    expect(createdEntries[0].amountCents).toBe(500);
    expect(registerBalance).toBe(9500);
    expect(persistedCounts).toEqual([{ denominationCents: 500, count: 19, subtotalCents: 9500 }]);
  });

  it("saves counted cash as a draft without locking the day", async () => {
    let persistedClose: CashDayCloseEntity | null = null;
    let persistedCounts: Array<{
      denominationCents: number;
      count: number;
      subtotalCents: number;
    }> = [];

    const registerRepo: CashRegisterRepoPort = {
      createRegister: async () => baseRegister,
      countDistinctLocationsForTenant: async () => 1,
      listRegisters: async () => [baseRegister],
      findRegisterById: async () => baseRegister,
      updateRegister: async () => baseRegister,
      setCurrentBalance: async () => {},
    };

    const entryRepo: CashEntryRepoPort = {
      nextEntryNo: async () => 2,
      createEntry: async () => baseEntry,
      countEntriesForPeriod: async () => 1,
      listEntries: async () => [baseEntry],
      findEntryById: async () => baseEntry,
      setReversedByEntryId: async () => {},
      listEntriesForMonth: async () => [baseEntry],
      getExpectedBalanceAtDay: async () => 10000,
      lockEntriesForDay: async () => {},
    };

    const dayCloseRepo: CashDayCloseRepoPort = {
      findDayCloseByRegisterAndDay: async () => persistedClose,
      upsertDayClose: async (data) => {
        persistedClose = {
          id: data.id ?? "draft-close-1",
          tenantId: data.tenantId,
          workspaceId: data.workspaceId,
          registerId: data.registerId,
          dayKey: data.dayKey,
          expectedBalanceCents: data.expectedBalanceCents,
          countedBalanceCents: data.countedBalanceCents,
          differenceCents: data.differenceCents,
          status: data.status,
          note: data.note,
          submittedAt: data.submittedAt,
          submittedByUserId: data.submittedByUserId,
          lockedAt: data.lockedAt,
          lockedByUserId: data.lockedByUserId,
          counts: persistedCounts.map((line) => ({
            denominationCents: line.denominationCents,
            count: line.count,
            subtotalCents: line.subtotalCents,
          })),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return persistedClose;
      },
      replaceCountLines: async (_tenantId, _workspaceId, _dayCloseId, lines) => {
        persistedCounts = lines;
      },
      listDayCloses: async () => (persistedClose ? [persistedClose] : []),
      listDayClosesForMonth: async () => (persistedClose ? [persistedClose] : []),
    };

    const useCase = new SaveCashDayCountUseCase(
      registerRepo,
      entryRepo,
      dayCloseRepo,
      makeAudit(),
      makeUnitOfWork()
    );

    const result = await useCase.execute(
      {
        registerId: "reg-1",
        dayKey: "2026-02-27",
        countedBalanceCents: 9950,
        note: "Drawer short before recount",
        denominationCounts: [{ denomination: 5000, count: 1, subtotal: 5000 }],
      },
      createCtx()
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.dayClose.status).toBe(CashDayCloseStatus.DRAFT);
    expect(result.value.dayClose.countedBalance).toBe(9950);
    expect(result.value.dayClose.difference).toBe(-50);
    expect(result.value.dayClose.lockedAt).toBeNull();
    expect(persistedCounts).toEqual([{ denominationCents: 5000, count: 1, subtotalCents: 5000 }]);
  });

  it("blocks normal entry posting when day is already closed", async () => {
    const registerRepo: CashRegisterRepoPort = {
      createRegister: async () => baseRegister,
      countDistinctLocationsForTenant: async () => 1,
      listRegisters: async () => [baseRegister],
      findRegisterById: async () => baseRegister,
      updateRegister: async () => baseRegister,
      setCurrentBalance: async () => {},
    };

    const entryRepo: CashEntryRepoPort = {
      nextEntryNo: async () => 2,
      createEntry: async () => {
        throw new Error("should not be called");
      },
      countEntriesForPeriod: async () => 0,
      listEntries: async () => [],
      findEntryById: async () => null,
      setReversedByEntryId: async () => {},
      listEntriesForMonth: async () => [],
      getExpectedBalanceAtDay: async () => 10000,
      lockEntriesForDay: async () => {},
    };

    const dayCloseRepo: CashDayCloseRepoPort = {
      findDayCloseByRegisterAndDay: async () => ({
        id: "close-1",
        tenantId: "tenant-1",
        workspaceId: "ws-1",
        registerId: "reg-1",
        dayKey: "2026-02-27",
        expectedBalanceCents: 10000,
        countedBalanceCents: 10000,
        differenceCents: 0,
        status: CashDayCloseStatus.SUBMITTED,
        note: null,
        submittedAt: new Date(),
        submittedByUserId: "user-1",
        lockedAt: new Date(),
        lockedByUserId: "user-1",
        counts: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      upsertDayClose: async () => {
        throw new Error("not used");
      },
      replaceCountLines: async () => {},
      listDayCloses: async () => [],
      listDayClosesForMonth: async () => [],
    };

    const useCase = new CreateCashEntryUseCase(
      registerRepo,
      entryRepo,
      dayCloseRepo,
      makeBillingAccess(),
      makeTaxProfileRepo(),
      makeTaxCodeRepo(),
      makeTaxRateRepo(),
      makeAudit(),
      makeOutbox(),
      makeUnitOfWork(),
      new InMemoryIdempotencyStore()
    );

    const result = await useCase.execute(
      {
        registerId: "reg-1",
        type: CashEntryType.SALE_CASH,
        direction: CashEntryDirection.IN,
        amountCents: 1000,
        description: "Late sale",
        paymentMethod: CashPaymentMethod.CASH,
        source: CashEntrySource.MANUAL,
        dayKey: "2026-02-27",
        idempotencyKey: "entry-closed",
      },
      createCtx()
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("CashManagement:DayAlreadyClosed");
    }
  });

  it("blocks new cash entries when the monthly plan limit is reached", async () => {
    const registerRepo: CashRegisterRepoPort = {
      createRegister: async () => baseRegister,
      countDistinctLocationsForTenant: async () => 1,
      listRegisters: async () => [baseRegister],
      findRegisterById: async () => baseRegister,
      updateRegister: async () => baseRegister,
      setCurrentBalance: async () => {},
    };

    const entryRepo: CashEntryRepoPort = {
      nextEntryNo: async () => 31,
      createEntry: async () => {
        throw new Error("should not be called");
      },
      countEntriesForPeriod: async () => 30,
      listEntries: async () => [],
      findEntryById: async () => null,
      setReversedByEntryId: async () => {},
      listEntriesForMonth: async () => [],
      getExpectedBalanceAtDay: async () => 10000,
      lockEntriesForDay: async () => {},
    };

    const dayCloseRepo: CashDayCloseRepoPort = {
      findDayCloseByRegisterAndDay: async () => null,
      upsertDayClose: async () => {
        throw new Error("not used");
      },
      replaceCountLines: async () => {},
      listDayCloses: async () => [],
      listDayClosesForMonth: async () => [],
    };

    const useCase = new CreateCashEntryUseCase(
      registerRepo,
      entryRepo,
      dayCloseRepo,
      makeBillingAccess({
        planCode: "free",
        featureValues: {
          [CashManagementBillingFeatureKeys.maxEntriesPerMonth]: 30,
          [CashManagementBillingFeatureKeys.canExport]: false,
          [CashManagementBillingFeatureKeys.dailyClosing]: false,
        },
      }),
      makeTaxProfileRepo(),
      makeTaxCodeRepo(),
      makeTaxRateRepo(),
      makeAudit(),
      makeOutbox(),
      makeUnitOfWork(),
      new InMemoryIdempotencyStore()
    );

    const result = await useCase.execute(
      {
        registerId: "reg-1",
        type: CashEntryType.SALE_CASH,
        direction: CashEntryDirection.IN,
        amountCents: 900,
        description: "Walk-in sale",
        paymentMethod: CashPaymentMethod.CASH,
        source: CashEntrySource.MANUAL,
        dayKey: "2026-02-27",
        idempotencyKey: "entry-limit",
      },
      createCtx()
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("CashManagement:EntryLimitReached");
    }
  });

  it("rejects cash sales when no tax profile is configured", async () => {
    const registerRepo: CashRegisterRepoPort = {
      createRegister: async () => baseRegister,
      countDistinctLocationsForTenant: async () => 1,
      listRegisters: async () => [baseRegister],
      findRegisterById: async () => baseRegister,
      updateRegister: async () => baseRegister,
      setCurrentBalance: async () => {},
    };

    const entryRepo: CashEntryRepoPort = {
      nextEntryNo: async () => 1,
      createEntry: async () => {
        throw new Error("should not be called");
      },
      countEntriesForPeriod: async () => 0,
      listEntries: async () => [],
      findEntryById: async () => null,
      setReversedByEntryId: async () => {},
      listEntriesForMonth: async () => [],
      getExpectedBalanceAtDay: async () => 0,
      lockEntriesForDay: async () => {},
    };

    const dayCloseRepo: CashDayCloseRepoPort = {
      findDayCloseByRegisterAndDay: async () => null,
      upsertDayClose: async () => {
        throw new Error("not used");
      },
      replaceCountLines: async () => {},
      listDayCloses: async () => [],
      listDayClosesForMonth: async () => [],
    };

    const useCase = new CreateCashEntryUseCase(
      registerRepo,
      entryRepo,
      dayCloseRepo,
      makeBillingAccess(),
      makeTaxProfileRepo(null),
      makeTaxCodeRepo(),
      makeTaxRateRepo(),
      makeAudit(),
      makeOutbox(),
      makeUnitOfWork(),
      new InMemoryIdempotencyStore()
    );

    const result = await useCase.execute(
      {
        registerId: "reg-1",
        type: CashEntryType.SALE_CASH,
        direction: CashEntryDirection.IN,
        amountCents: 1000,
        description: "Walk-in sale",
        paymentMethod: CashPaymentMethod.CASH,
        source: CashEntrySource.MANUAL,
        dayKey: "2026-02-27",
        sourceDocument: {
          reference: "EV-1",
          kind: "REFERENCE",
        },
        idempotencyKey: "entry-tax-profile-required",
      },
      createCtx()
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("CashManagement:InvalidTaxInput");
      expect(result.error.details).toEqual(
        expect.objectContaining({ reason: "CashManagement:TaxProfileRequired" })
      );
    }
  });

  it("blocks day close when daily closing is not enabled on the plan", async () => {
    const registerRepo: CashRegisterRepoPort = {
      createRegister: async () => baseRegister,
      countDistinctLocationsForTenant: async () => 1,
      listRegisters: async () => [baseRegister],
      findRegisterById: async () => baseRegister,
      updateRegister: async () => baseRegister,
      setCurrentBalance: async () => {},
    };

    const entryRepo: CashEntryRepoPort = {
      nextEntryNo: async () => 2,
      createEntry: async () => baseEntry,
      countEntriesForPeriod: async () => 1,
      listEntries: async () => [baseEntry],
      findEntryById: async () => baseEntry,
      setReversedByEntryId: async () => {},
      listEntriesForMonth: async () => [baseEntry],
      getExpectedBalanceAtDay: async () => 10000,
      lockEntriesForDay: async () => {},
    };

    const dayCloseRepo: CashDayCloseRepoPort = {
      findDayCloseByRegisterAndDay: async () => null,
      upsertDayClose: async () => {
        throw new Error("should not be called");
      },
      replaceCountLines: async () => {},
      listDayCloses: async () => [],
      listDayClosesForMonth: async () => [],
    };

    const useCase = new SubmitCashDayCloseUseCase(
      registerRepo,
      entryRepo,
      dayCloseRepo,
      makeBillingAccess({
        planCode: "free",
        featureValues: {
          [CashManagementBillingFeatureKeys.maxEntriesPerMonth]: 30,
          [CashManagementBillingFeatureKeys.maxReceiptsPerMonth]: 10,
          [CashManagementBillingFeatureKeys.canExport]: false,
          [CashManagementBillingFeatureKeys.dailyClosing]: false,
        },
      }),
      makeAudit(),
      makeOutbox(),
      makeUnitOfWork(),
      new InMemoryIdempotencyStore()
    );

    const result = await useCase.execute(
      {
        registerId: "reg-1",
        dayKey: "2026-02-27",
        countedBalanceCents: 10000,
        denominationCounts: [{ denomination: 500, count: 20, subtotal: 10000 }],
        idempotencyKey: "close-plan-lock",
      },
      createCtx()
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("CashManagement:DailyClosingUnavailable");
    }
  });

  it("builds a live dashboard summary from register activity", async () => {
    const registerRepo: CashRegisterRepoPort = {
      createRegister: async () => baseRegister,
      countDistinctLocationsForTenant: async () => 1,
      listRegisters: async () => [baseRegister],
      findRegisterById: async () => baseRegister,
      updateRegister: async () => baseRegister,
      setCurrentBalance: async () => {},
    };

    const todayIncome: CashEntryEntity = {
      ...baseEntry,
      id: "entry-income",
      description: "Cash sale",
      amountCents: 3000,
      balanceAfterCents: 13000,
    };

    const todayExpense: CashEntryEntity = {
      ...baseEntry,
      id: "entry-expense",
      entryNo: 2,
      description: "Acetone refill",
      type: CashEntryType.EXPENSE_CASH,
      direction: CashEntryDirection.OUT,
      amountCents: 800,
      balanceAfterCents: 12200,
    };

    const previousMonthEntry: CashEntryEntity = {
      ...baseEntry,
      id: "entry-prev-month",
      dayKey: "2026-01-31",
      occurredAt: new Date("2026-01-31T12:00:00.000Z"),
    };

    const entryRepo: CashEntryRepoPort = {
      nextEntryNo: async () => 3,
      createEntry: async () => baseEntry,
      countEntriesForPeriod: async () => 2,
      listEntries: async (_tenantId, _workspaceId, filters) => {
        if (filters.dayKeyFrom === "2026-02-27" && filters.dayKeyTo === "2026-02-27") {
          return [todayIncome, todayExpense];
        }
        return [];
      },
      findEntryById: async () => null,
      setReversedByEntryId: async () => {},
      listEntriesForMonth: async (_tenantId, _workspaceId, _registerId, month) => {
        if (month === "2026-02") {
          return [todayIncome, todayExpense];
        }
        return [previousMonthEntry];
      },
      getExpectedBalanceAtDay: async () => 12200,
      lockEntriesForDay: async () => {},
    };

    const dayCloseRepo: CashDayCloseRepoPort = {
      findDayCloseByRegisterAndDay: async () => ({
        id: "close-1",
        tenantId: "tenant-1",
        workspaceId: "ws-1",
        registerId: "reg-1",
        dayKey: "2026-02-27",
        expectedBalanceCents: 12200,
        countedBalanceCents: 12200,
        differenceCents: 0,
        status: CashDayCloseStatus.DRAFT,
        note: null,
        submittedAt: null,
        submittedByUserId: null,
        lockedAt: null,
        lockedByUserId: null,
        counts: [],
        createdAt: new Date("2026-02-27T18:00:00.000Z"),
        updatedAt: new Date("2026-02-27T18:00:00.000Z"),
      }),
      upsertDayClose: async () => {
        throw new Error("not used");
      },
      replaceCountLines: async () => {},
      listDayCloses: async () => [
        {
          id: "close-prev",
          tenantId: "tenant-1",
          workspaceId: "ws-1",
          registerId: "reg-1",
          dayKey: "2026-02-26",
          expectedBalanceCents: 10000,
          countedBalanceCents: 10000,
          differenceCents: 0,
          status: CashDayCloseStatus.SUBMITTED,
          note: null,
          submittedAt: new Date("2026-02-26T19:00:00.000Z"),
          submittedByUserId: "user-9",
          lockedAt: new Date("2026-02-26T19:00:00.000Z"),
          lockedByUserId: "user-9",
          counts: [],
          createdAt: new Date("2026-02-26T19:00:00.000Z"),
          updatedAt: new Date("2026-02-26T19:00:00.000Z"),
        },
      ],
      listDayClosesForMonth: async () => [],
    };

    const attachmentRepo: CashAttachmentRepoPort = {
      createAttachment: async () => {
        throw new Error("not used");
      },
      findAttachmentByEntryAndDocument: async () => null,
      listAttachments: async () => [],
      countAttachmentsForPeriod: async () => 1,
      listAttachmentsForMonth: async () => [
        {
          id: "attachment-1",
          tenantId: "tenant-1",
          workspaceId: "ws-1",
          entryId: "entry-expense",
          documentId: "doc-1",
          uploadedByUserId: "user-1",
          createdAt: new Date("2026-02-27T12:00:00.000Z"),
        },
      ],
    };

    const exportRepo: CashExportRepoPort = {
      createArtifact: async () => {
        throw new Error("not used");
      },
      findArtifactById: async () => null,
      findLatestArtifact: async () => null,
      listAuditRowsForMonth: async () => [],
    };

    const useCase = new GetCashDashboardQueryUseCase(
      registerRepo,
      entryRepo,
      dayCloseRepo,
      attachmentRepo,
      exportRepo,
      makeBillingAccess()
    );

    const result = await useCase.execute(
      {
        registerId: "reg-1",
        dayKey: "2026-02-27",
      },
      createCtx()
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.dashboard.status.dayStatus).toBe("ready-to-close");
    expect(result.value.dashboard.status.missingReceiptsToday).toBe(0);
    expect(result.value.dashboard.summary.expectedClosingCents).toBe(12200);
    expect(result.value.dashboard.recentEntries).toHaveLength(2);
  });
});
