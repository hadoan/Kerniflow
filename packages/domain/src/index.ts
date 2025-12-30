import type { Receipt } from "@corely/contracts";

export function vatCents(receipt: Receipt): number {
  // net = total / (1 + rate), vat = total - net
  const net = Math.round(receipt.totalCents / (1 + receipt.vatRate));
  return receipt.totalCents - net;
}

export function formatEUR(cents: number, locale: "de-DE" | "en-US" = "de-DE"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(cents / 100);
}

export const DOMAIN_HELLO = "Corely domain loaded ✅";

export * from "./errors";
export * from "./customization/types";
export * from "./customization/ports";
export * from "./customization/validate-and-normalize";
export * from "./customization/build-indexes";
export * from "./customization/use-cases/create-custom-field-definition.usecase";
export * from "./customization/use-cases/update-custom-field-definition.usecase";
export * from "./customization/use-cases/list-custom-field-definitions.usecase";
export * from "./customization/use-cases/upsert-entity-layout.usecase";
