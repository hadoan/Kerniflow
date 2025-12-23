// Formatting utilities for Bizflow

export function formatMoney(
  amountCents: number,
  locale: string = "de-DE",
  currency: string = "EUR"
): string {
  const amount = amountCents / 100;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatDate(isoDate: string, locale: string = "de-DE"): string {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatDateLong(isoDate: string, locale: string = "de-DE"): string {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatDateShort(isoDate: string, locale: string = "de-DE"): string {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat(locale, {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  }).format(date);
}

export function formatDateTime(isoDate: string, locale: string = "de-DE"): string {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatRelativeTime(isoDate: string, locale: string = "de-DE"): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return locale.startsWith("de") ? "Heute" : "Today";
  }
  if (diffDays === 1) {
    return locale.startsWith("de") ? "Gestern" : "Yesterday";
  }
  if (diffDays < 7) {
    return locale.startsWith("de") ? `vor ${diffDays} Tagen` : `${diffDays} days ago`;
  }

  return formatDate(isoDate, locale);
}

export function formatVatRate(rate: number): string {
  return `${rate}%`;
}

export function formatPercentage(value: number, locale: string = "de-DE"): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

export function generateInvoiceNumber(prefix: string, year: number, sequence: number): string {
  const paddedSequence = sequence.toString().padStart(4, "0");
  return `${prefix}-${year}-${paddedSequence}`;
}

export function calculateVat(netAmountCents: number, vatRate: number): number {
  return Math.round(netAmountCents * (vatRate / 100));
}

export function calculateNetFromGross(grossAmountCents: number, vatRate: number): number {
  return Math.round(grossAmountCents / (1 + vatRate / 100));
}

export function calculateGrossFromNet(netAmountCents: number, vatRate: number): number {
  return Math.round(netAmountCents * (1 + vatRate / 100));
}
