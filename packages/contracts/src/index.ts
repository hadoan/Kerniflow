export type Currency = "EUR";
export type Locale = "de-DE" | "en-US";

export type ExpenseCategory = "Office" | "Meals" | "Travel" | "Software" | "Other";

export interface Receipt {
  id: string;
  merchant: string;
  issuedAtISO: string; // ISO string for easy transport
  totalCents: number;
  vatRate: number; // e.g. 0.19
  currency: Currency;
  category?: ExpenseCategory;
}

export const mockReceipts: Receipt[] = [
  {
    id: "rcpt_001",
    merchant: "REWE",
    issuedAtISO: "2025-12-01T12:34:00.000Z",
    totalCents: 1899,
    vatRate: 0.07,
    currency: "EUR",
    category: "Meals"
  },
  {
    id: "rcpt_002",
    merchant: "Deutsche Bahn",
    issuedAtISO: "2025-12-03T08:10:00.000Z",
    totalCents: 4990,
    vatRate: 0.19,
    currency: "EUR",
    category: "Travel"
  }
];

export const CONTRACTS_HELLO = "Kerniflow contracts loaded ✅";

// New schemas for architecture patterns
import { z } from 'zod';

export const ExpenseCreateInputSchema = z.object({
  tenantId: z.string(),
  amount: z.number().positive(),
  description: z.string().min(1),
});

export type ExpenseCreateInput = z.infer<typeof ExpenseCreateInputSchema>;

export const ExpenseCreateOutputSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  amount: z.number(),
  description: z.string(),
  createdAt: z.string(),
});

export type ExpenseCreateOutput = z.infer<typeof ExpenseCreateOutputSchema>;

export const OutboxEventPayloadSchema = z.object({
  eventType: z.string(),
  tenantId: z.string(),
  payload: z.record(z.any()),
});

export type OutboxEventPayload = z.infer<typeof OutboxEventPayloadSchema>;

export const EVENT_NAMES = {
  EXPENSE_CREATED: 'expense.created',
  INVOICE_ISSUED: 'invoice.issued',
} as const;
