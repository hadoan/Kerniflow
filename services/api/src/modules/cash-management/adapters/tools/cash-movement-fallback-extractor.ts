import { type CashMovementExtraction } from "@corely/contracts";
import { type ModelMessage } from "ai";

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const parseAmountCents = (value: string): number | undefined => {
  const normalized = value.replace(/\s/g, "");
  const commaIndex = normalized.lastIndexOf(",");
  const dotIndex = normalized.lastIndexOf(".");
  const decimalIndex = Math.max(commaIndex, dotIndex);
  const hasDecimal = decimalIndex >= 0 && normalized.length - decimalIndex <= 3;
  const canonical = hasDecimal
    ? `${normalized.slice(0, decimalIndex).replace(/[.,]/g, "")}.${normalized.slice(decimalIndex + 1)}`
    : normalized.replace(/[.,]/g, "");
  const amount = Number(canonical);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount * 100) : undefined;
};

const latestUserText = (messages: ModelMessage[] | undefined): string | undefined => {
  if (!messages) {
    return undefined;
  }

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "user") {
      continue;
    }
    if (typeof message.content === "string") {
      return message.content;
    }
    if (Array.isArray(message.content)) {
      const text = message.content
        .filter(
          (part): part is { type: "text"; text: string } =>
            typeof part === "object" && part !== null && part.type === "text" && "text" in part
        )
        .map((part) => part.text)
        .join(" ");
      return text || undefined;
    }
  }
  return undefined;
};

/**
 * Safely recovers explicit, low-ambiguity facts when a model calls the analysis
 * tool without filling its schema. It never infers a missing source or payment
 * method, leaving the deterministic resolver to ask the appropriate question.
 */
export const enrichCashMovementExtraction = (
  extraction: CashMovementExtraction,
  messages: ModelMessage[] | undefined,
  explicitLatestUserMessage?: string
): CashMovementExtraction => {
  const text = explicitLatestUserMessage ?? latestUserText(messages);
  if (!text) {
    return extraction;
  }

  const normalized = normalize(text);
  const amountMatch = normalized.match(/(\d[\d.,\s]*)\s*(?:€|eur)(?:\s|$)/);
  const fullDateMatch = normalized.match(/\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b/);
  const shortDateMatch = normalized.match(/\b(\d{1,2})[./](\d{1,2})(?![./]\d)\b/);
  const mentionedAsSales = /\b(doanh thu|doan thu|revenue|umsatz|sales)\b/.test(normalized);
  const explicitCash = /\b(tien mat|cash|bar)\b/.test(normalized);
  const businessBankDestination =
    /\b(bankkonto\s+geschaft|geschaftskonto|business\s+bank\s+account|tai\s+khoan\s+(?:ngan\s+hang\s+)?doanh\s+nghiep)\b/.test(
      normalized
    );
  const parsedBusinessDate = fullDateMatch
    ? `${fullDateMatch[3]}-${fullDateMatch[2].padStart(2, "0")}-${fullDateMatch[1].padStart(2, "0")}`
    : shortDateMatch
      ? `${new Date().getUTCFullYear()}-${shortDateMatch[2].padStart(2, "0")}-${shortDateMatch[1].padStart(2, "0")}`
      : undefined;

  return {
    ...extraction,
    amountCents:
      extraction.amountCents ?? (amountMatch ? parseAmountCents(amountMatch[1]) : undefined),
    businessDate: extraction.businessDate ?? parsedBusinessDate,
    destination:
      extraction.destination ?? (businessBankDestination ? "BUSINESS_BANK_ACCOUNT" : undefined),
    // A literal sales phrase is an explicit user fact and therefore takes precedence
    // over an empty-model default of `false`.
    mentionedAsSales: mentionedAsSales ? true : (extraction.mentionedAsSales ?? false),
    customerPaymentMethod:
      extraction.customerPaymentMethod ?? (mentionedAsSales && explicitCash ? "CASH" : undefined),
  };
};
