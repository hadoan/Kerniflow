import { z } from "zod";
import { SalesOrderDtoSchema, SalesOrderStatusSchema } from "./order.types";
import { localDateSchema } from "../shared/local-date.schema";

export const ListSalesOrdersInputSchema = z.object({
  status: SalesOrderStatusSchema.optional(),
  customerPartyId: z.string().optional(),
  fromDate: localDateSchema.optional(),
  toDate: localDateSchema.optional(),
  cursor: z.string().optional(),
  pageSize: z.number().int().positive().max(100).optional(),
});

export const ListSalesOrdersOutputSchema = z.object({
  items: z.array(SalesOrderDtoSchema),
  nextCursor: z.string().nullable().optional(),
});

export type ListSalesOrdersInput = z.infer<typeof ListSalesOrdersInputSchema>;
export type ListSalesOrdersOutput = z.infer<typeof ListSalesOrdersOutputSchema>;
