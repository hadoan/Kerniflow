import { z } from "zod";
import { DealDtoSchema } from "./deal.types";

export const MoveDealStageInputSchema = z.object({
  dealId: z.string(),
  newStageId: z.string(),
});

export const MoveDealStageOutputSchema = z.object({
  deal: DealDtoSchema,
});

export type MoveDealStageInput = z.infer<typeof MoveDealStageInputSchema>;
export type MoveDealStageOutput = z.infer<typeof MoveDealStageOutputSchema>;
