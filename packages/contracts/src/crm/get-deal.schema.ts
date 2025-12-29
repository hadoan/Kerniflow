import { z } from "zod";
import { DealDtoSchema } from "./deal.types";

export const GetDealInputSchema = z.object({
  dealId: z.string(),
});

export const GetDealOutputSchema = z.object({
  deal: DealDtoSchema,
});

export type GetDealInput = z.infer<typeof GetDealInputSchema>;
export type GetDealOutput = z.infer<typeof GetDealOutputSchema>;
