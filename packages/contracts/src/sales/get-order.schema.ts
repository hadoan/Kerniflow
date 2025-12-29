import { z } from "zod";
import { SalesOrderDtoSchema } from "./order.types";

export const GetSalesOrderInputSchema = z.object({
  orderId: z.string(),
});

export const GetSalesOrderOutputSchema = z.object({
  order: SalesOrderDtoSchema,
});

export type GetSalesOrderInput = z.infer<typeof GetSalesOrderInputSchema>;
export type GetSalesOrderOutput = z.infer<typeof GetSalesOrderOutputSchema>;
