import { describe, expect, it } from "vitest";
import { CashEntryTaxMode, CashEntryType, type CreateCashEntryInput } from "@corely/contracts";
import { resolveCashEntryTax } from "./cash-entry-tax";
import { InMemoryTaxCodeRepo } from "../../tax/testkit/fakes/in-memory-tax-code-repo";
import { InMemoryTaxRateRepo } from "../../tax/testkit/fakes/in-memory-tax-rate-repo";
import { InMemoryTaxProfileRepo } from "../../tax/testkit/fakes/in-memory-tax-profile-repo";

describe("resolveCashEntryTax", () => {
  it("uses the configured German standard VAT code for an assistant cash sale without a code ID", async () => {
    const profiles = new InMemoryTaxProfileRepo();
    const codes = new InMemoryTaxCodeRepo();
    const rates = new InMemoryTaxRateRepo();
    const occurredAt = new Date("2026-07-22T12:00:00.000Z");

    await profiles.upsert({
      tenantId: "workspace-1",
      country: "DE",
      regime: "STANDARD_VAT",
      vatEnabled: true,
      vatId: null,
      currency: "EUR",
      filingFrequency: "QUARTERLY",
      vatAccountingMethod: "ACTUAL",
      taxYearStartMonth: 1,
      localTaxOfficeName: null,
      vatExemptionParagraph: null,
      euB2BSales: false,
      hasEmployees: false,
      usesTaxAdvisor: false,
      effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
      effectiveTo: null,
    });
    const standard = await codes.create({
      tenantId: "workspace-1",
      code: "DE_STD_19",
      kind: "STANDARD",
      label: "USt 19%",
      isActive: true,
    });
    await rates.create({
      tenantId: "workspace-1",
      taxCodeId: standard.id,
      rateBps: 1900,
      effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
      effectiveTo: null,
    });

    const snapshot = await resolveCashEntryTax({
      tenantId: "workspace-1",
      occurredAt,
      entryType: CashEntryType.SALE_CASH,
      grossAmountCents: 12_960,
      input: {
        registerId: "register-1",
        type: CashEntryType.SALE_CASH,
        amountCents: 12_960,
        description: "Cash sale",
        occurredAt: occurredAt.toISOString(),
      } satisfies CreateCashEntryInput,
      taxProfileRepo: profiles,
      taxCodeRepo: codes,
      taxRateRepo: rates,
    });

    expect(snapshot).toMatchObject({
      grossAmountCents: 12_960,
      taxMode: CashEntryTaxMode.OUTPUT_VAT,
      taxCodeId: standard.id,
      taxCode: "DE_STD_19",
      taxRateBps: 1900,
    });
    expect(snapshot.netAmountCents + snapshot.taxAmountCents).toBe(12_960);
  });
});
