import { z } from "zod";
import { SalesOrderDtoSchema } from "./order.types";

export const FulfillSalesOrderInputSchema = z.object({
  orderId: z.string(),
  idempotencyKey: z.string().optional(),
});

export const FulfillSalesOrderOutputSchema = z.object({
  order: SalesOrderDtoSchema,
});

export type FulfillSalesOrderInput = z.infer<typeof FulfillSalesOrderInputSchema>;
export type FulfillSalesOrderOutput = z.infer<typeof FulfillSalesOrderOutputSchema>;
