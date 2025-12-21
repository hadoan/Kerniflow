import { z } from "zod";
import { CustomerDtoSchema } from "./customer.types";

export const ArchiveCustomerInputSchema = z.object({
  id: z.string(),
});

export const ArchiveCustomerOutputSchema = z.object({
  customer: CustomerDtoSchema,
});

export type ArchiveCustomerInput = z.infer<typeof ArchiveCustomerInputSchema>;
export type ArchiveCustomerOutput = z.infer<typeof ArchiveCustomerOutputSchema>;
