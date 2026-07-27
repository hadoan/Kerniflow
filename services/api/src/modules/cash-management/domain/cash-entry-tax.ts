import { CashEntryTaxMode, CashEntryType, type CreateCashEntryInput } from "@corely/contracts";
import { TaxCode } from "../../tax/domain/entities/tax-code.entity";
import { TaxProfile } from "../../tax/domain/entities/tax-profile.entity";
import type { TaxCodeRepoPort } from "../../tax/domain/ports/tax-code-repo.port";
import type { TaxProfileRepoPort } from "../../tax/domain/ports/tax-profile-repo.port";
import type { TaxRateRepoPort } from "../../tax/domain/ports/tax-rate-repo.port";

export type CashEntryTaxSnapshot = {
  grossAmountCents: number;
  netAmountCents: number;
  taxAmountCents: number;
  taxMode: (typeof CashEntryTaxMode)[keyof typeof CashEntryTaxMode] | null;
  taxCodeId: string | null;
  taxCode: string | null;
  taxRateBps: number | null;
  taxLabel: string | null;
};

type ResolveCashEntryTaxInput = {
  tenantId: string;
  occurredAt: Date;
  entryType: string;
  grossAmountCents: number;
  input: CreateCashEntryInput;
  taxProfileRepo: TaxProfileRepoPort;
  taxCodeRepo: TaxCodeRepoPort;
  taxRateRepo: TaxRateRepoPort;
};

const NON_TAXABLE_ENTRY_TYPES = new Set<string>([
  CashEntryType.OWNER_DEPOSIT,
  CashEntryType.OWNER_WITHDRAWAL,
  CashEntryType.BANK_DEPOSIT,
  CashEntryType.BANK_WITHDRAWAL,
  CashEntryType.OPENING_FLOAT,
  CashEntryType.CLOSING_ADJUSTMENT,
  CashEntryType.CORRECTION,
  CashEntryType.IN,
  CashEntryType.OUT,
]);

const defaultNoneTaxSnapshot = (grossAmountCents: number): CashEntryTaxSnapshot => ({
  grossAmountCents,
  netAmountCents: grossAmountCents,
  taxAmountCents: 0,
  taxMode: CashEntryTaxMode.NONE,
  taxCodeId: null,
  taxCode: null,
  taxRateBps: null,
  taxLabel: null,
});

const requiresOutputVat = (entryType: string): boolean => {
  return entryType === CashEntryType.SALE_CASH || entryType === CashEntryType.REFUND_CASH;
};

const allowsInputVat = (entryType: string): boolean => {
  return entryType === CashEntryType.EXPENSE_CASH;
};

const calculateGrossFirstBreakdown = (
  grossAmountCents: number,
  rateBps: number
): Pick<CashEntryTaxSnapshot, "netAmountCents" | "taxAmountCents"> => {
  if (rateBps <= 0) {
    return {
      netAmountCents: grossAmountCents,
      taxAmountCents: 0,
    };
  }

  const divisor = 10_000 + rateBps;
  const netAmountCents = Math.round((grossAmountCents * 10_000) / divisor);
  return {
    netAmountCents,
    taxAmountCents: grossAmountCents - netAmountCents,
  };
};

export const resolveCashEntryTax = async (
  params: ResolveCashEntryTaxInput
): Promise<CashEntryTaxSnapshot> => {
  const {
    tenantId,
    occurredAt,
    entryType,
    grossAmountCents,
    input,
    taxProfileRepo,
    taxCodeRepo,
    taxRateRepo,
  } = params;

  let requestedMode = input.tax?.mode ?? CashEntryTaxMode.NONE;
  let taxCodeId = input.tax?.taxCodeId ?? null;

  if (NON_TAXABLE_ENTRY_TYPES.has(entryType)) {
    if (requestedMode !== CashEntryTaxMode.NONE || taxCodeId) {
      throw new Error("CashManagement:VatForbiddenForEntryType");
    }
    return defaultNoneTaxSnapshot(grossAmountCents);
  }

  if (allowsInputVat(entryType) && requestedMode === CashEntryTaxMode.OUTPUT_VAT) {
    throw new Error("CashManagement:InvalidTaxModeForExpense");
  }

  if (requiresOutputVat(entryType) && requestedMode === CashEntryTaxMode.INPUT_VAT) {
    throw new Error("CashManagement:InvalidTaxModeForSale");
  }

  const profile = await taxProfileRepo.getActive(tenantId, occurredAt);
  const vatExpected = profile ? TaxProfile.requiresVatCalculation(profile) : false;

  if (requiresOutputVat(entryType) && !profile) {
    throw new Error("CashManagement:TaxProfileRequired");
  }

  // A tenant that selected the German Standard VAT regime has explicitly
  // configured the standard 19% VAT treatment. Assistant cash-day drafts do
  // not carry a tax-code ID, so resolve that configured default here. A user
  // can still send an explicit reduced/exempt code through the normal entry UI.
  if (
    requiresOutputVat(entryType) &&
    vatExpected &&
    !taxCodeId &&
    requestedMode === CashEntryTaxMode.NONE &&
    profile?.country === "DE" &&
    profile.regime === "STANDARD_VAT"
  ) {
    const standardCode = await taxCodeRepo.findByCode("DE_STD_19", tenantId);
    if (standardCode?.isActive) {
      requestedMode = CashEntryTaxMode.OUTPUT_VAT;
      taxCodeId = standardCode.id;
    }
  }

  if (!taxCodeId || requestedMode === CashEntryTaxMode.NONE) {
    if (requiresOutputVat(entryType) && vatExpected) {
      throw new Error("CashManagement:TaxCodeRequired");
    }
    return defaultNoneTaxSnapshot(grossAmountCents);
  }

  const code = await taxCodeRepo.findById(taxCodeId, tenantId);
  if (!code || !code.isActive) {
    throw new Error("CashManagement:TaxCodeNotFound");
  }

  if (code.kind === "REVERSE_CHARGE") {
    throw new Error("CashManagement:ReverseChargeNotAllowed");
  }

  const rate = TaxCode.requiresRate(code.kind)
    ? await taxRateRepo.findEffectiveRate(code.id, tenantId, occurredAt)
    : null;

  if (TaxCode.requiresRate(code.kind) && !rate) {
    throw new Error("CashManagement:TaxRateNotFound");
  }

  const rateBps = rate?.rateBps ?? 0;
  const money = calculateGrossFirstBreakdown(grossAmountCents, rateBps);

  return {
    grossAmountCents,
    netAmountCents: money.netAmountCents,
    taxAmountCents: money.taxAmountCents,
    taxMode: requestedMode,
    taxCodeId: code.id,
    taxCode: code.code,
    taxRateBps: rateBps,
    taxLabel: code.label,
  };
};
