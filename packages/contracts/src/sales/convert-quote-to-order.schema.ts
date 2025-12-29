import { z } from "zod";
import { SalesOrderDtoSchema } from "./order.types";

export const ConvertQuoteToOrderInputSchema = z.object({
  quoteId: z.string(),
  idempotencyKey: z.string().optional(),
});

export const ConvertQuoteToOrderOutputSchema = z.object({
  order: SalesOrderDtoSchema,
});

export type ConvertQuoteToOrderInput = z.infer<typeof ConvertQuoteToOrderInputSchema>;
export type ConvertQuoteToOrderOutput = z.infer<typeof ConvertQuoteToOrderOutputSchema>;
