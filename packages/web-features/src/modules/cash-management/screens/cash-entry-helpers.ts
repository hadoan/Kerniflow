import type { CashEntryTaxMode, CashEntryType, TaxProfileDto, TaxRateDto } from "@corely/contracts";

export const entryTypes = [
  "SALE_CASH",
  "REFUND_CASH",
  "EXPENSE_CASH",
  "OWNER_DEPOSIT",
  "OWNER_WITHDRAWAL",
  "BANK_DEPOSIT",
  "BANK_WITHDRAWAL",
  "OPENING_FLOAT",
] as const;

export const entrySources = [
  "MANUAL",
  "SALES",
  "EXPENSE",
  "DIFFERENCE",
  "IMPORT",
  "INTEGRATION",
] as const;

export const deriveDirectionFromType = (type: CashEntryType): "IN" | "OUT" => {
  switch (type) {
    case "REFUND_CASH":
    case "EXPENSE_CASH":
    case "OWNER_WITHDRAWAL":
    case "BANK_DEPOSIT":
      return "OUT";
    default:
      return "IN";
  }
};

export const isTaxRelevantType = (type: CashEntryType): boolean => {
  return type === "SALE_CASH" || type === "REFUND_CASH" || type === "EXPENSE_CASH";
};

export const deriveTaxModeFromType = (type: CashEntryType): CashEntryTaxMode => {
  return type === "EXPENSE_CASH" ? "INPUT_VAT" : "OUTPUT_VAT";
};

export const requiresSupportingDocument = (type: CashEntryType): boolean => {
  return type !== "OPENING_FLOAT";
};

export const requiresTaxCodeForType = (
  type: CashEntryType,
  profile: TaxProfileDto | null | undefined
) => {
  return (type === "SALE_CASH" || type === "REFUND_CASH") && profile?.regime === "STANDARD_VAT";
};

export const requiresTaxProfileForType = (type: CashEntryType): boolean => {
  return type === "SALE_CASH" || type === "REFUND_CASH";
};

export const resolveEffectiveRate = (rates: TaxRateDto[] | undefined, at: Date): number | null => {
  if (!rates || rates.length === 0) {
    return null;
  }

  const match = rates.find((rate) => {
    const start = new Date(rate.effectiveFrom);
    const end = rate.effectiveTo ? new Date(rate.effectiveTo) : null;
    return start <= at && (!end || at <= end);
  });

  return match?.rateBps ?? rates[0]?.rateBps ?? null;
};

export const calculateGrossFirstBreakdown = (grossAmountCents: number, rateBps: number | null) => {
  if (!rateBps || rateBps <= 0) {
    return {
      grossAmountCents,
      netAmountCents: grossAmountCents,
      taxAmountCents: 0,
    };
  }

  const netAmountCents = Math.round((grossAmountCents * 10_000) / (10_000 + rateBps));
  return {
    grossAmountCents,
    netAmountCents,
    taxAmountCents: grossAmountCents - netAmountCents,
  };
};
