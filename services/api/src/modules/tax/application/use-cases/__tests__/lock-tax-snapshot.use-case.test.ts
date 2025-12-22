import { beforeEach, describe, expect, it } from "vitest";
import { LockTaxSnapshotUseCase } from "../lock-tax-snapshot.use-case";
import { TaxEngineService } from "../../services/tax-engine.service";
import { DEPackV1 } from "../../services/jurisdictions/de-pack.v1";
import { InMemoryTaxSnapshotRepo } from "../../../testkit/fakes/in-memory-tax-snapshot-repo";
import { InMemoryTaxProfileRepo } from "../../../testkit/fakes/in-memory-tax-profile-repo";
import { InMemoryTaxCodeRepo } from "../../../testkit/fakes/in-memory-tax-code-repo";
import { InMemoryTaxRateRepo } from "../../../testkit/fakes/in-memory-tax-rate-repo";
import type { LockTaxSnapshotInput } from "@kerniflow/contracts";
import type { UseCaseContext } from "../use-case-context";

describe("LockTaxSnapshotUseCase", () => {
  let useCase: LockTaxSnapshotUseCase;
  let snapshotRepo: InMemoryTaxSnapshotRepo;
  let profileRepo: InMemoryTaxProfileRepo;
  let taxCodeRepo: InMemoryTaxCodeRepo;
  let taxRateRepo: InMemoryTaxRateRepo;
  let taxEngine: TaxEngineService;
  let dePack: DEPackV1;

  const tenantId = "tenant-1";
  const userId = "user-1";
  const documentDate = "2025-01-15T00:00:00Z";

  const ctx: UseCaseContext = {
    tenantId,
    userId,
    correlationId: "test-correlation-id",
    idempotencyKey: "test-idempotency-key",
  };

  beforeEach(async () => {
    snapshotRepo = new InMemoryTaxSnapshotRepo();
    profileRepo = new InMemoryTaxProfileRepo();
    taxCodeRepo = new InMemoryTaxCodeRepo();
    taxRateRepo = new InMemoryTaxRateRepo();

    dePack = new DEPackV1(taxCodeRepo, taxRateRepo);
    taxEngine = new TaxEngineService(profileRepo, dePack);

    useCase = new LockTaxSnapshotUseCase(snapshotRepo, profileRepo, taxEngine);

    // Setup tax profile
    await profileRepo.upsert({
      tenantId,
      country: "DE",
      regime: "STANDARD_VAT",
      vatId: null,
      currency: "EUR",
      filingFrequency: "QUARTERLY",
      effectiveFrom: new Date("2025-01-01T00:00:00Z"),
      effectiveTo: null,
    });

    // Setup tax code with rate
    const taxCode = await taxCodeRepo.create({
      tenantId,
      code: "STANDARD_19",
      kind: "STANDARD",
      label: "Standard VAT 19%",
      isActive: true,
    });

    await taxRateRepo.create({
      tenantId,
      taxCodeId: taxCode.id,
      rateBps: 1900,
      effectiveFrom: new Date("2025-01-01T00:00:00Z"),
      effectiveTo: null,
    });
  });

  describe("idempotency", () => {
    it("creates snapshot on first call", async () => {
      const input: LockTaxSnapshotInput = {
        sourceType: "INVOICE",
        sourceId: "invoice-1",
        jurisdiction: "DE",
        documentDate,
        currency: "EUR",
        customer: null,
        lines: [
          {
            id: "line-1",
            description: "Service",
            qty: 1,
            netAmountCents: 10000,
          },
        ],
      };

      const snapshot = await useCase.execute(input, ctx);

      expect(snapshot).toBeDefined();
      expect(snapshot.id).toBeDefined();
      expect(snapshot.sourceType).toBe("INVOICE");
      expect(snapshot.sourceId).toBe("invoice-1");
      expect(snapshot.tenantId).toBe(tenantId);
      expect(snapshot.taxTotalAmountCents).toBe(1900); // 19% of €100
    });

    it("returns existing snapshot on subsequent calls (idempotent)", async () => {
      const input: LockTaxSnapshotInput = {
        sourceType: "INVOICE",
        sourceId: "invoice-1",
        jurisdiction: "DE",
        documentDate,
        currency: "EUR",
        customer: null,
        lines: [{ id: "line-1", qty: 1, netAmountCents: 10000 }],
      };

      // First call
      const snapshot1 = await useCase.execute(input, ctx);

      // Second call with same source
      const snapshot2 = await useCase.execute(input, ctx);

      // Should return the exact same snapshot
      expect(snapshot2.id).toBe(snapshot1.id);
      expect(snapshot2.createdAt).toBe(snapshot1.createdAt);
      expect(snapshot2.version).toBe(snapshot1.version);
      expect(snapshot2.taxTotalAmountCents).toBe(snapshot1.taxTotalAmountCents);
    });

    it("idempotency is scoped by (tenantId, sourceType, sourceId)", async () => {
      const input1: LockTaxSnapshotInput = {
        sourceType: "INVOICE",
        sourceId: "invoice-1",
        jurisdiction: "DE",
        documentDate,
        currency: "EUR",
        customer: null,
        lines: [{ id: "line-1", qty: 1, netAmountCents: 10000 }],
      };

      const input2: LockTaxSnapshotInput = {
        ...input1,
        sourceId: "invoice-2", // Different source ID
      };

      const snapshot1 = await useCase.execute(input1, ctx);
      const snapshot2 = await useCase.execute(input2, ctx);

      // Should create two different snapshots
      expect(snapshot2.id).not.toBe(snapshot1.id);
      expect(snapshot2.sourceId).toBe("invoice-2");
    });

    it("different source types create separate snapshots", async () => {
      const inputInvoice: LockTaxSnapshotInput = {
        sourceType: "INVOICE",
        sourceId: "doc-1",
        jurisdiction: "DE",
        documentDate,
        currency: "EUR",
        customer: null,
        lines: [{ id: "line-1", qty: 1, netAmountCents: 10000 }],
      };

      const inputExpense: LockTaxSnapshotInput = {
        ...inputInvoice,
        sourceType: "EXPENSE", // Different source type, same ID
      };

      const snapshot1 = await useCase.execute(inputInvoice, ctx);
      const snapshot2 = await useCase.execute(inputExpense, ctx);

      // Should create two different snapshots
      expect(snapshot2.id).not.toBe(snapshot1.id);
      expect(snapshot2.sourceType).toBe("EXPENSE");
      expect(snapshot1.sourceType).toBe("INVOICE");
    });
  });

  describe("tax calculation", () => {
    it("stores complete tax breakdown as JSON", async () => {
      const input: LockTaxSnapshotInput = {
        sourceType: "INVOICE",
        sourceId: "invoice-1",
        jurisdiction: "DE",
        documentDate,
        currency: "EUR",
        customer: null,
        lines: [
          { id: "line-1", qty: 1, netAmountCents: 10000 },
          { id: "line-2", qty: 1, netAmountCents: 5000 },
        ],
      };

      const snapshot = await useCase.execute(input, ctx);

      // Should store breakdown as JSON
      expect(snapshot.breakdownJson).toBeDefined();
      const breakdown = JSON.parse(snapshot.breakdownJson);
      expect(breakdown.lines).toHaveLength(2);
      expect(breakdown.subtotalAmountCents).toBe(15000);
      expect(breakdown.taxTotalAmountCents).toBe(2850); // 19% of €150
    });

    it("denormalizes totals for performance", async () => {
      const input: LockTaxSnapshotInput = {
        sourceType: "INVOICE",
        sourceId: "invoice-1",
        jurisdiction: "DE",
        documentDate,
        currency: "EUR",
        customer: null,
        lines: [{ id: "line-1", qty: 1, netAmountCents: 10000 }],
      };

      const snapshot = await useCase.execute(input, ctx);

      // Totals should be denormalized at snapshot level
      expect(snapshot.subtotalAmountCents).toBe(10000);
      expect(snapshot.taxTotalAmountCents).toBe(1900);
      expect(snapshot.totalAmountCents).toBe(11900);
    });

    it("captures regime at time of calculation", async () => {
      const input: LockTaxSnapshotInput = {
        sourceType: "INVOICE",
        sourceId: "invoice-1",
        jurisdiction: "DE",
        documentDate,
        currency: "EUR",
        customer: null,
        lines: [{ id: "line-1", qty: 1, netAmountCents: 10000 }],
      };

      const snapshot = await useCase.execute(input, ctx);

      expect(snapshot.regime).toBe("STANDARD_VAT");
    });

    it("captures rounding mode", async () => {
      const input: LockTaxSnapshotInput = {
        sourceType: "INVOICE",
        sourceId: "invoice-1",
        jurisdiction: "DE",
        documentDate,
        currency: "EUR",
        customer: null,
        lines: [{ id: "line-1", qty: 1, netAmountCents: 10000 }],
      };

      const snapshot = await useCase.execute(input, ctx);

      expect(snapshot.roundingMode).toBe("PER_LINE");
    });
  });

  describe("error handling", () => {
    it("throws error if no active tax profile exists", async () => {
      // Clear profiles
      profileRepo.reset();

      const input: LockTaxSnapshotInput = {
        sourceType: "INVOICE",
        sourceId: "invoice-1",
        jurisdiction: "DE",
        documentDate,
        currency: "EUR",
        customer: null,
        lines: [{ id: "line-1", qty: 1, netAmountCents: 10000 }],
      };

      await expect(useCase.execute(input, ctx)).rejects.toThrow(/No active tax profile/i);
    });

    it("handles empty lines gracefully", async () => {
      // Note: This should normally be caught by schema validation (min 1 line)
      // But if it gets through, the use case should handle it
      const input: LockTaxSnapshotInput = {
        sourceType: "INVOICE",
        sourceId: "invoice-1",
        jurisdiction: "DE",
        documentDate,
        currency: "EUR",
        customer: null,
        lines: [], // Empty lines (should be rejected by schema in real API)
      };

      // Use case will process it (schema validation happens in controller)
      const snapshot = await useCase.execute(input, ctx);
      expect(snapshot.subtotalAmountCents).toBe(0);
      expect(snapshot.taxTotalAmountCents).toBe(0);
    });
  });

  describe("immutability", () => {
    it("snapshot cannot be modified after creation", async () => {
      const input: LockTaxSnapshotInput = {
        sourceType: "INVOICE",
        sourceId: "invoice-1",
        jurisdiction: "DE",
        documentDate,
        currency: "EUR",
        customer: null,
        lines: [{ id: "line-1", qty: 1, netAmountCents: 10000 }],
      };

      const snapshot = await useCase.execute(input, ctx);

      // Try to lock again with different amounts (should return original)
      const modifiedInput: LockTaxSnapshotInput = {
        ...input,
        lines: [{ id: "line-1", qty: 1, netAmountCents: 20000 }], // Different amount
      };

      const snapshot2 = await useCase.execute(modifiedInput, ctx);

      // Should return original snapshot, not create new one
      expect(snapshot2.id).toBe(snapshot.id);
      expect(snapshot2.subtotalAmountCents).toBe(10000); // Original amount
      expect(snapshot2.taxTotalAmountCents).toBe(1900); // Original tax
    });

    it("sets version to 1 for all snapshots", async () => {
      const input: LockTaxSnapshotInput = {
        sourceType: "INVOICE",
        sourceId: "invoice-1",
        jurisdiction: "DE",
        documentDate,
        currency: "EUR",
        customer: null,
        lines: [{ id: "line-1", qty: 1, netAmountCents: 10000 }],
      };

      const snapshot = await useCase.execute(input, ctx);

      expect(snapshot.version).toBe(1);
    });
  });
});
