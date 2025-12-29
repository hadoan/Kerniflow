import { z } from "zod";
import { SalesOrderDtoSchema } from "./order.types";
import { localDateSchema } from "../shared/local-date.schema";

export const SalesOrderLineInputSchema = z.object({
  description: z.string(),
  quantity: z.number().positive(),
  unitPriceCents: z.number().int().nonnegative(),
  discountCents: z.number().int().nonnegative().optional(),
  taxCode: z.string().optional(),
  revenueCategory: z.string().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

export const CreateSalesOrderInputSchema = z.object({
  customerPartyId: z.string(),
  customerContactPartyId: z.string().optional(),
  orderDate: localDateSchema.optional(),
  deliveryDate: localDateSchema.optional(),
  currency: z.string(),
  notes: z.string().optional(),
  lineItems: z.array(SalesOrderLineInputSchema).min(1),
  sourceQuoteId: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export const CreateSalesOrderOutputSchema = z.object({
  order: SalesOrderDtoSchema,
});

export type SalesOrderLineInput = z.infer<typeof SalesOrderLineInputSchema>;
export type CreateSalesOrderInput = z.infer<typeof CreateSalesOrderInputSchema>;
export type CreateSalesOrderOutput = z.infer<typeof CreateSalesOrderOutputSchema>;
