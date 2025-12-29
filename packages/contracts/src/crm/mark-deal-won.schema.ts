import { z } from "zod";
import { DealDtoSchema } from "./deal.types";

export const MarkDealWonInputSchema = z.object({
  dealId: z.string(),
});

export const MarkDealWonOutputSchema = z.object({
  deal: DealDtoSchema,
});

export type MarkDealWonInput = z.infer<typeof MarkDealWonInputSchema>;
export type MarkDealWonOutput = z.infer<typeof MarkDealWonOutputSchema>;
