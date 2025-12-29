import { z } from "zod";
import { localDateSchema, utcInstantSchema } from "../shared/local-date.schema";

export const QuoteStatusSchema = z.enum([
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "REJECTED",
  "CONVERTED",
  "EXPIRED",
]);
export type QuoteStatus = z.infer<typeof QuoteStatusSchema>;

export const QuoteLineItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  quantity: z.number().positive(),
  unitPriceCents: z.number().int().nonnegative(),
  discountCents: z.number().int().nonnegative().optional(),
  taxCode: z.string().optional(),
  revenueCategory: z.string().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});
export type QuoteLineItemDto = z.infer<typeof QuoteLineItemSchema>;

export const QuoteTotalsSchema = z.object({
  subtotalCents: z.number().int(),
  discountCents: z.number().int(),
  taxCents: z.number().int(),
  totalCents: z.number().int(),
});
export type QuoteTotalsDto = z.infer<typeof QuoteTotalsSchema>;

export const QuoteDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  number: z.string().nullable(),
  status: QuoteStatusSchema,
  customerPartyId: z.string(),
  customerContactPartyId: z.string().nullable().optional(),
  issueDate: localDateSchema.nullable().optional(),
  validUntilDate: localDateSchema.nullable().optional(),
  currency: z.string(),
  paymentTerms: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  lineItems: z.array(QuoteLineItemSchema),
  totals: QuoteTotalsSchema,
  sentAt: utcInstantSchema.nullable().optional(),
  acceptedAt: utcInstantSchema.nullable().optional(),
  rejectedAt: utcInstantSchema.nullable().optional(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
  convertedToSalesOrderId: z.string().nullable().optional(),
  convertedToInvoiceId: z.string().nullable().optional(),
});
export type QuoteDto = z.infer<typeof QuoteDtoSchema>;
