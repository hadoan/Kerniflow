import { z } from "zod";
import { localDateSchema, utcInstantSchema } from "../shared/local-date.schema";

export const SalesOrderStatusSchema = z.enum([
  "DRAFT",
  "CONFIRMED",
  "FULFILLED",
  "INVOICED",
  "CANCELED",
]);
export type SalesOrderStatus = z.infer<typeof SalesOrderStatusSchema>;

export const SalesOrderLineItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  quantity: z.number().positive(),
  unitPriceCents: z.number().int().nonnegative(),
  discountCents: z.number().int().nonnegative().optional(),
  taxCode: z.string().optional(),
  revenueCategory: z.string().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});
export type SalesOrderLineItemDto = z.infer<typeof SalesOrderLineItemSchema>;

export const SalesOrderTotalsSchema = z.object({
  subtotalCents: z.number().int(),
  discountCents: z.number().int(),
  taxCents: z.number().int(),
  totalCents: z.number().int(),
});
export type SalesOrderTotalsDto = z.infer<typeof SalesOrderTotalsSchema>;

export const SalesOrderDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  number: z.string().nullable(),
  status: SalesOrderStatusSchema,
  customerPartyId: z.string(),
  customerContactPartyId: z.string().nullable().optional(),
  orderDate: localDateSchema.nullable().optional(),
  deliveryDate: localDateSchema.nullable().optional(),
  currency: z.string(),
  notes: z.string().nullable().optional(),
  lineItems: z.array(SalesOrderLineItemSchema),
  totals: SalesOrderTotalsSchema,
  confirmedAt: utcInstantSchema.nullable().optional(),
  fulfilledAt: utcInstantSchema.nullable().optional(),
  canceledAt: utcInstantSchema.nullable().optional(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
  sourceQuoteId: z.string().nullable().optional(),
  sourceInvoiceId: z.string().nullable().optional(),
});
export type SalesOrderDto = z.infer<typeof SalesOrderDtoSchema>;
