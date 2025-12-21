import { z } from "zod";
import { CustomerDtoSchema } from "./customer.types";

export const ListCustomersInputSchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.number().int().positive().max(200).optional(),
  includeArchived: z.boolean().optional(),
});

export const ListCustomersOutputSchema = z.object({
  items: z.array(CustomerDtoSchema),
  nextCursor: z.string().nullable().optional(),
});

export type ListCustomersInput = z.infer<typeof ListCustomersInputSchema>;
export type ListCustomersOutput = z.infer<typeof ListCustomersOutputSchema>;
