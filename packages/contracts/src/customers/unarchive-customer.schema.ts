import { z } from "zod";
import { CustomerDtoSchema } from "./customer.types";

export const UnarchiveCustomerInputSchema = z.object({
  id: z.string(),
});

export const UnarchiveCustomerOutputSchema = z.object({
  customer: CustomerDtoSchema,
});

export type UnarchiveCustomerInput = z.infer<typeof UnarchiveCustomerInputSchema>;
export type UnarchiveCustomerOutput = z.infer<typeof UnarchiveCustomerOutputSchema>;
