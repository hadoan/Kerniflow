import { z } from "zod";
import { ProvenanceSchema } from "../crm/ai-proposals/party-proposal.types";

export const PricingSuggestionSchema = z.object({
  label: z.string(),
  totalCents: z.number().int().positive(),
  notes: z.string().optional(),
  marginPercent: z.number().int().min(0).max(100).optional(),
});

export const PricingSuggestionCardSchema = z.object({
  ok: z.literal(true),
  suggestions: z.array(PricingSuggestionSchema),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  provenance: ProvenanceSchema,
});

export type PricingSuggestionCard = z.infer<typeof PricingSuggestionCardSchema>;
