import { z } from "zod";
import { SalesOrderDtoSchema } from "./order.types";

export const CancelSalesOrderInputSchema = z.object({
  orderId: z.string(),
  reason: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

export const CancelSalesOrderOutputSchema = z.object({
  order: SalesOrderDtoSchema,
});

export type CancelSalesOrderInput = z.infer<typeof CancelSalesOrderInputSchema>;
export type CancelSalesOrderOutput = z.infer<typeof CancelSalesOrderOutputSchema>;
