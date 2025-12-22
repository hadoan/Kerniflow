import { beforeEach, describe, expect, it } from "vitest";
import { DEPackV1 } from "../de-pack.v1";
import { InMemoryTaxCodeRepo } from "../../../../testkit/fakes/in-memory-tax-code-repo";
import { InMemoryTaxRateRepo } from "../../../../testkit/fakes/in-memory-tax-rate-repo";
import type { ApplyRulesParams } from "../tax-jurisdiction-pack";

describe("DEPackV1", () => {
  let taxCodeRepo: InMemoryTaxCodeRepo;
  let taxRateRepo: InMemoryTaxRateRepo;
  let dePack: DEPackV1;
  const tenantId = "tenant-1";
  const documentDate = new Date("2025-01-15T00:00:00Z");

  beforeEach(() => {
    taxCodeRepo = new InMemoryTaxCodeRepo();
    taxRateRepo = new InMemoryTaxRateRepo();
    dePack = new DEPackV1(taxCodeRepo, taxRateRepo);
  });

  describe("code property", () => {
    it("returns DE as jurisdiction code", () => {
      expect(dePack.code).toBe("DE");
    });
  });

  describe("getRateBps", () => {
    it("returns 0 for EXEMPT kind", async () => {
      const rateBps = await dePack.getRateBps("EXEMPT", documentDate, tenantId);
      expect(rateBps).toBe(0);
    });

    it("returns 0 for ZERO kind", async () => {
      const rateBps = await dePack.getRateBps("ZERO", documentDate, tenantId);
      expect(rateBps).toBe(0);
    });

    it("returns 0 for REVERSE_CHARGE kind", async () => {
      const rateBps = await dePack.getRateBps("REVERSE_CHARGE", documentDate, tenantId);
      expect(rateBps).toBe(0);
    });

    it("returns default 19% for STANDARD when no tax code configured", async () => {
      const rateBps = await dePack.getRateBps("STANDARD", documentDate, tenantId);
      expect(rateBps).toBe(1900); // 19%
    });

    it("returns default 7% for REDUCED when no tax code configured", async () => {
      const rateBps = await dePack.getRateBps("REDUCED", documentDate, tenantId);
      expect(rateBps).toBe(700); // 7%
    });

    it("returns configured rate for STANDARD tax code", async () => {
      // Create tax code
      const taxCode = await taxCodeRepo.create({
        tenantId,
        code: "STANDARD_19",
        kind: "STANDARD",
        label: "Standard VAT 19%",
        isActive: true,
      });

      // Create rate
      await taxRateRepo.create({
        tenantId,
        taxCodeId: taxCode.id,
        rateBps: 1900,
        effectiveFrom: new Date("2025-01-01T00:00:00Z"),
        effectiveTo: null,
      });

      const rateBps = await dePack.getRateBps("STANDARD", documentDate, tenantId);
      expect(rateBps).toBe(1900);
    });

    it("returns effective rate based on document date", async () => {
      const taxCode = await taxCodeRepo.create({
        tenantId,
        code: "STANDARD_VAT",
        kind: "STANDARD",
        label: "Standard VAT",
        isActive: true,
      });

      // Old rate (expired)
      await taxRateRepo.create({
        tenantId,
        taxCodeId: taxCode.id,
        rateBps: 1600, // 16%
        effectiveFrom: new Date("2020-01-01T00:00:00Z"),
        effectiveTo: new Date("2024-12-31T23:59:59Z"),
      });

      // Current rate
      await taxRateRepo.create({
        tenantId,
        taxCodeId: taxCode.id,
        rateBps: 1900, // 19%
        effectiveFrom: new Date("2025-01-01T00:00:00Z"),
        effectiveTo: null,
      });

      const rateBps = await dePack.getRateBps("STANDARD", documentDate, tenantId);
      expect(rateBps).toBe(1900); // Should use current rate
    });

    it("looks up rate by tax code ID", async () => {
      const taxCode = await taxCodeRepo.create({
        tenantId,
        code: "CUSTOM_VAT",
        kind: "STANDARD",
        label: "Custom",
        isActive: true,
      });

      await taxRateRepo.create({
        tenantId,
        taxCodeId: taxCode.id,
        rateBps: 1500, // 15%
        effectiveFrom: new Date("2025-01-01T00:00:00Z"),
        effectiveTo: null,
      });

      const rateBps = await dePack.getRateBps(taxCode.id, documentDate, tenantId);
      expect(rateBps).toBe(1500);
    });
  });

  describe("applyRules - SMALL_BUSINESS regime", () => {
    it("charges no VAT for small business", async () => {
      const params: ApplyRulesParams = {
        regime: "SMALL_BUSINESS",
        documentDate,
        currency: "EUR",
        customer: null,
        lines: [
          {
            id: "line-1",
            description: "Service",
            qty: 1,
            netAmountCents: 10000, // €100
          },
        ],
        tenantId,
      };

      const breakdown = await dePack.applyRules(params);

      expect(breakdown.subtotalAmountCents).toBe(10000);
      expect(breakdown.taxTotalAmountCents).toBe(0);
      expect(breakdown.totalAmountCents).toBe(10000);
      expect(breakdown.flags.isSmallBusinessNoVatCharged).toBe(true);
      expect(breakdown.flags.needsReverseChargeNote).toBe(false);
    });

    it("marks all lines as EXEMPT for small business", async () => {
      const params: ApplyRulesParams = {
        regime: "SMALL_BUSINESS",
        documentDate,
        currency: "EUR",
        customer: null,
        lines: [
          { id: "line-1", qty: 1, netAmountCents: 5000 },
          { id: "line-2", qty: 1, netAmountCents: 3000 },
        ],
        tenantId,
      };

      const breakdown = await dePack.applyRules(params);

      expect(breakdown.lines).toHaveLength(2);
      expect(breakdown.lines[0].kind).toBe("EXEMPT");
      expect(breakdown.lines[0].rateBps).toBe(0);
      expect(breakdown.lines[1].kind).toBe("EXEMPT");
      expect(breakdown.lines[1].rateBps).toBe(0);
    });

    it("aggregates totals by kind correctly", async () => {
      const params: ApplyRulesParams = {
        regime: "SMALL_BUSINESS",
        documentDate,
        currency: "EUR",
        customer: null,
        lines: [{ id: "line-1", qty: 1, netAmountCents: 10000 }],
        tenantId,
      };

      const breakdown = await dePack.applyRules(params);

      expect(breakdown.totalsByKind.EXEMPT).toBeDefined();
      expect(breakdown.totalsByKind.EXEMPT.netAmountCents).toBe(10000);
      expect(breakdown.totalsByKind.EXEMPT.taxAmountCents).toBe(0);
      expect(breakdown.totalsByKind.EXEMPT.grossAmountCents).toBe(10000);
    });
  });

  describe("applyRules - STANDARD_VAT regime", () => {
    beforeEach(async () => {
      // Set up standard tax codes
      const standardCode = await taxCodeRepo.create({
        tenantId,
        code: "STANDARD_19",
        kind: "STANDARD",
        label: "Standard VAT 19%",
        isActive: true,
      });

      await taxRateRepo.create({
        tenantId,
        taxCodeId: standardCode.id,
        rateBps: 1900,
        effectiveFrom: new Date("2025-01-01T00:00:00Z"),
        effectiveTo: null,
      });

      const reducedCode = await taxCodeRepo.create({
        tenantId,
        code: "REDUCED_7",
        kind: "REDUCED",
        label: "Reduced VAT 7%",
        isActive: true,
      });

      await taxRateRepo.create({
        tenantId,
        taxCodeId: reducedCode.id,
        rateBps: 700,
        effectiveFrom: new Date("2025-01-01T00:00:00Z"),
        effectiveTo: null,
      });
    });

    it("applies 19% standard VAT by default", async () => {
      const params: ApplyRulesParams = {
        regime: "STANDARD_VAT",
        documentDate,
        currency: "EUR",
        customer: null,
        lines: [
          {
            id: "line-1",
            description: "Service",
            qty: 1,
            netAmountCents: 10000, // €100
          },
        ],
        tenantId,
      };

      const breakdown = await dePack.applyRules(params);

      expect(breakdown.subtotalAmountCents).toBe(10000);
      expect(breakdown.taxTotalAmountCents).toBe(1900); // 19%
      expect(breakdown.totalAmountCents).toBe(11900);
      expect(breakdown.lines[0].kind).toBe("STANDARD");
      expect(breakdown.lines[0].rateBps).toBe(1900);
    });

    it("applies tax code from line if specified", async () => {
      const reducedCode = await taxCodeRepo.findByCode("REDUCED_7", tenantId);

      const params: ApplyRulesParams = {
        regime: "STANDARD_VAT",
        documentDate,
        currency: "EUR",
        customer: null,
        lines: [
          {
            id: "line-1",
            qty: 1,
            netAmountCents: 10000,
            taxCodeId: reducedCode!.id,
          },
        ],
        tenantId,
      };

      const breakdown = await dePack.applyRules(params);

      expect(breakdown.taxTotalAmountCents).toBe(700); // 7%
      expect(breakdown.lines[0].kind).toBe("REDUCED");
      expect(breakdown.lines[0].rateBps).toBe(700);
    });

    it("handles reverse charge correctly", async () => {
      const reverseChargeCode = await taxCodeRepo.create({
        tenantId,
        code: "REVERSE_CHARGE",
        kind: "REVERSE_CHARGE",
        label: "Reverse Charge",
        isActive: true,
      });

      const params: ApplyRulesParams = {
        regime: "STANDARD_VAT",
        documentDate,
        currency: "EUR",
        customer: { country: "AT", isBusiness: true, vatId: "ATU12345678" },
        lines: [
          {
            id: "line-1",
            qty: 1,
            netAmountCents: 10000,
            taxCodeId: reverseChargeCode.id,
          },
        ],
        tenantId,
      };

      const breakdown = await dePack.applyRules(params);

      expect(breakdown.taxTotalAmountCents).toBe(0);
      expect(breakdown.lines[0].kind).toBe("REVERSE_CHARGE");
      expect(breakdown.flags.needsReverseChargeNote).toBe(true);
    });

    it("calculates mixed rates correctly", async () => {
      const standardCode = await taxCodeRepo.findByCode("STANDARD_19", tenantId);
      const reducedCode = await taxCodeRepo.findByCode("REDUCED_7", tenantId);

      const params: ApplyRulesParams = {
        regime: "STANDARD_VAT",
        documentDate,
        currency: "EUR",
        customer: null,
        lines: [
          {
            id: "line-1",
            qty: 1,
            netAmountCents: 10000, // €100
            taxCodeId: standardCode!.id,
          },
          {
            id: "line-2",
            qty: 1,
            netAmountCents: 5000, // €50
            taxCodeId: reducedCode!.id,
          },
        ],
        tenantId,
      };

      const breakdown = await dePack.applyRules(params);

      expect(breakdown.subtotalAmountCents).toBe(15000);
      expect(breakdown.taxTotalAmountCents).toBe(2250); // 1900 + 350
      expect(breakdown.totalAmountCents).toBe(17250);

      expect(breakdown.totalsByKind.STANDARD).toBeDefined();
      expect(breakdown.totalsByKind.STANDARD.netAmountCents).toBe(10000);
      expect(breakdown.totalsByKind.STANDARD.taxAmountCents).toBe(1900);

      expect(breakdown.totalsByKind.REDUCED).toBeDefined();
      expect(breakdown.totalsByKind.REDUCED.netAmountCents).toBe(5000);
      expect(breakdown.totalsByKind.REDUCED.taxAmountCents).toBe(350);
    });

    it("rounds tax per line correctly", async () => {
      const params: ApplyRulesParams = {
        regime: "STANDARD_VAT",
        documentDate,
        currency: "EUR",
        customer: null,
        lines: [
          {
            id: "line-1",
            qty: 1,
            netAmountCents: 1053, // €10.53 * 19% = €2.0007 -> €2.00
          },
        ],
        tenantId,
      };

      const breakdown = await dePack.applyRules(params);

      expect(breakdown.lines[0].taxAmountCents).toBe(200); // Rounded to €2.00
      expect(breakdown.taxTotalAmountCents).toBe(200);
    });

    it("uses PER_LINE rounding mode", async () => {
      const params: ApplyRulesParams = {
        regime: "STANDARD_VAT",
        documentDate,
        currency: "EUR",
        customer: null,
        lines: [{ id: "line-1", qty: 1, netAmountCents: 10000 }],
        tenantId,
      };

      const breakdown = await dePack.applyRules(params);

      expect(breakdown.roundingMode).toBe("PER_LINE");
    });
  });
});
