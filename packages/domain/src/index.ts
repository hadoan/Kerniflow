import type { Receipt } from "@kerniflow/contracts";

export function vatCents(receipt: Receipt): number {
  // net = total / (1 + rate), vat = total - net
  const net = Math.round(receipt.totalCents / (1 + receipt.vatRate));
  return receipt.totalCents - net;
}

export function formatEUR(cents: number, locale: "de-DE" | "en-US" = "de-DE"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(cents / 100);
}

export const DOMAIN_HELLO = "Kerniflow domain loaded ✅";
