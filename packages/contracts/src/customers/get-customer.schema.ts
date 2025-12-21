import { z } from "zod";
import { CustomerDtoSchema } from "./customer.types";

export const GetCustomerInputSchema = z.object({
  id: z.string(),
});

export const GetCustomerOutputSchema = z.object({
  customer: CustomerDtoSchema,
});

export type GetCustomerInput = z.infer<typeof GetCustomerInputSchema>;
export type GetCustomerOutput = z.infer<typeof GetCustomerOutputSchema>;
