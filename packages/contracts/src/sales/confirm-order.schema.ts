import { z } from "zod";
import { SalesOrderDtoSchema } from "./order.types";

export const ConfirmSalesOrderInputSchema = z.object({
  orderId: z.string(),
  idempotencyKey: z.string().optional(),
});

export const ConfirmSalesOrderOutputSchema = z.object({
  order: SalesOrderDtoSchema,
});

export type ConfirmSalesOrderInput = z.infer<typeof ConfirmSalesOrderInputSchema>;
export type ConfirmSalesOrderOutput = z.infer<typeof ConfirmSalesOrderOutputSchema>;
