import { z } from "zod";
import { localDateSchema, utcInstantSchema } from "../shared/local-date.schema";

export const SalesInvoiceStatusSchema = z.enum([
  "DRAFT",
  "ISSUED",
  "PARTIALLY_PAID",
  "PAID",
  "VOID",
]);
export type SalesInvoiceStatus = z.infer<typeof SalesInvoiceStatusSchema>;

export const PaymentMethodSchema = z.enum(["BANK_TRANSFER", "CASH", "CARD", "OTHER"]);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const SalesInvoiceLineItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  quantity: z.number().positive(),
  unitPriceCents: z.number().int().nonnegative(),
  discountCents: z.number().int().nonnegative().optional(),
  taxCode: z.string().optional(),
  revenueCategory: z.string().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});
export type SalesInvoiceLineItemDto = z.infer<typeof SalesInvoiceLineItemSchema>;

export const SalesInvoiceTotalsSchema = z.object({
  subtotalCents: z.number().int(),
  discountCents: z.number().int(),
  taxCents: z.number().int(),
  totalCents: z.number().int(),
  paidCents: z.number().int(),
  dueCents: z.number().int(),
});
export type SalesInvoiceTotalsDto = z.infer<typeof SalesInvoiceTotalsSchema>;

export const SalesPaymentSchema = z.object({
  id: z.string(),
  invoiceId: z.string(),
  amountCents: z.number().int().positive(),
  currency: z.string(),
  paymentDate: localDateSchema,
  method: PaymentMethodSchema,
  reference: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  recordedAt: utcInstantSchema,
  recordedByUserId: z.string().nullable().optional(),
  journalEntryId: z.string().nullable().optional(),
});
export type SalesPaymentDto = z.infer<typeof SalesPaymentSchema>;

export const SalesInvoiceDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  number: z.string().nullable(),
  status: SalesInvoiceStatusSchema,
  customerPartyId: z.string(),
  customerContactPartyId: z.string().nullable().optional(),
  issueDate: localDateSchema.nullable().optional(),
  dueDate: localDateSchema.nullable().optional(),
  currency: z.string(),
  paymentTerms: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  lineItems: z.array(SalesInvoiceLineItemSchema),
  totals: SalesInvoiceTotalsSchema,
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
  issuedAt: utcInstantSchema.nullable().optional(),
  voidedAt: utcInstantSchema.nullable().optional(),
  voidReason: z.string().nullable().optional(),
  sourceSalesOrderId: z.string().nullable().optional(),
  sourceQuoteId: z.string().nullable().optional(),
  issuedJournalEntryId: z.string().nullable().optional(),
  paymentJournalEntryIds: z.array(z.string()).optional(),
  payments: z.array(SalesPaymentSchema).optional(),
});
export type SalesInvoiceDto = z.infer<typeof SalesInvoiceDtoSchema>;
