import type { TaxCodeRepoPort, TaxRateRepoPort } from "../../domain/ports";

type EnsureDeStandardVatCodesInput = {
  tenantId: string;
  effectiveFrom: Date;
  taxCodeRepo: TaxCodeRepoPort;
  taxRateRepo: TaxRateRepoPort;
};

/**
 * Provision the standard German VAT codes required by cash sales.
 *
 * These are system defaults for a tenant that explicitly selected the German
 * Standard VAT regime. They are still normal tenant-owned codes and can be
 * managed through Tax settings afterwards.
 */
export const ensureDeStandardVatCodes = async ({
  tenantId,
  effectiveFrom,
  taxCodeRepo,
  taxRateRepo,
}: EnsureDeStandardVatCodesInput): Promise<void> => {
  const defaults = [
    { code: "DE_STD_19", kind: "STANDARD" as const, label: "USt 19%", rateBps: 1900 },
    { code: "DE_RED_7", kind: "REDUCED" as const, label: "USt 7%", rateBps: 700 },
    { code: "DE_EXEMPT", kind: "EXEMPT" as const, label: "Steuerfrei", rateBps: null },
  ];

  for (const definition of defaults) {
    let code = await taxCodeRepo.findByCode(definition.code, tenantId);
    if (!code) {
      code = await taxCodeRepo.create({
        tenantId,
        code: definition.code,
        kind: definition.kind,
        label: definition.label,
        isActive: true,
      });
    }

    if (definition.rateBps === null) {
      continue;
    }

    const existingRate = await taxRateRepo.findEffectiveRate(code.id, tenantId, effectiveFrom);
    if (!existingRate) {
      await taxRateRepo.create({
        tenantId,
        taxCodeId: code.id,
        rateBps: definition.rateBps,
        effectiveFrom,
        effectiveTo: null,
      });
    }
  }
};
