import { z } from "zod";
import { ProvenanceSchema } from "../crm/ai-proposals/party-proposal.types";

export const SalesSummarySchema = z.object({
  summary: z.string(),
  risks: z.array(z.string()).optional(),
  nextSteps: z.array(z.string()).optional(),
});

export const SalesSummaryCardSchema = z.object({
  ok: z.literal(true),
  summary: SalesSummarySchema,
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  provenance: ProvenanceSchema,
});

export type SalesSummaryCard = z.infer<typeof SalesSummaryCardSchema>;
