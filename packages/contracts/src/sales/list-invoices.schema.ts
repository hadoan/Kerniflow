import { z } from "zod";
import { SalesInvoiceDtoSchema, SalesInvoiceStatusSchema } from "./invoice.types";
import { localDateSchema } from "../shared/local-date.schema";

export const ListSalesInvoicesInputSchema = z.object({
  status: SalesInvoiceStatusSchema.optional(),
  customerPartyId: z.string().optional(),
  fromDate: localDateSchema.optional(),
  toDate: localDateSchema.optional(),
  cursor: z.string().optional(),
  pageSize: z.number().int().positive().max(100).optional(),
});

export const ListSalesInvoicesOutputSchema = z.object({
  items: z.array(SalesInvoiceDtoSchema),
  nextCursor: z.string().nullable().optional(),
});

export type ListSalesInvoicesInput = z.infer<typeof ListSalesInvoicesInputSchema>;
export type ListSalesInvoicesOutput = z.infer<typeof ListSalesInvoicesOutputSchema>;
