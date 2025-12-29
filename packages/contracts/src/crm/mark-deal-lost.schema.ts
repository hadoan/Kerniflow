import { z } from "zod";
import { DealDtoSchema } from "./deal.types";

export const MarkDealLostInputSchema = z.object({
  dealId: z.string(),
  reason: z.string().optional(),
});

export const MarkDealLostOutputSchema = z.object({
  deal: DealDtoSchema,
});

export type MarkDealLostInput = z.infer<typeof MarkDealLostInputSchema>;
export type MarkDealLostOutput = z.infer<typeof MarkDealLostOutputSchema>;
