import { z } from "zod";
import { SalesOrderDtoSchema } from "./order.types";
import { SalesOrderLineInputSchema } from "./create-order.schema";
import { localDateSchema } from "../shared/local-date.schema";

export const SalesOrderHeaderPatchSchema = z.object({
  customerPartyId: z.string().optional(),
  customerContactPartyId: z.string().optional(),
  orderDate: localDateSchema.optional(),
  deliveryDate: localDateSchema.optional(),
  currency: z.string().optional(),
  notes: z.string().optional(),
});

export const SalesOrderLinePatchSchema = SalesOrderLineInputSchema.extend({
  id: z.string().optional(),
});

export const UpdateSalesOrderInputSchema = z.object({
  orderId: z.string(),
  headerPatch: SalesOrderHeaderPatchSchema.optional(),
  lineItems: z.array(SalesOrderLinePatchSchema).optional(),
  idempotencyKey: z.string().optional(),
});

export const UpdateSalesOrderOutputSchema = z.object({
  order: SalesOrderDtoSchema,
});

export type UpdateSalesOrderInput = z.infer<typeof UpdateSalesOrderInputSchema>;
export type UpdateSalesOrderOutput = z.infer<typeof UpdateSalesOrderOutputSchema>;
