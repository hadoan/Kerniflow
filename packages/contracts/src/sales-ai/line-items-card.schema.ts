import { z } from "zod";
import { ProvenanceSchema } from "../crm/ai-proposals/party-proposal.types";

export const LineItemSuggestionSchema = z.object({
  description: z.string(),
  quantity: z.number().positive(),
  unitPriceCents: z.number().int().nonnegative(),
  discountCents: z.number().int().nonnegative().optional(),
  revenueCategory: z.string().optional(),
});

export const LineItemsProposalSchema = z.object({
  lineItems: z.array(LineItemSuggestionSchema),
  alternatives: z
    .array(
      z.object({
        label: z.string(),
        lineItems: z.array(LineItemSuggestionSchema),
        totalCents: z.number().int().optional(),
      })
    )
    .optional(),
});

export const LineItemsProposalCardSchema = z.object({
  ok: z.literal(true),
  proposal: LineItemsProposalSchema,
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  provenance: ProvenanceSchema,
});

export type LineItemsProposalCard = z.infer<typeof LineItemsProposalCardSchema>;
