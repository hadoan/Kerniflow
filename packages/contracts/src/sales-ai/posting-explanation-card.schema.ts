import { z } from "zod";
import { ProvenanceSchema } from "../crm/ai-proposals/party-proposal.types";

export const PostingExplanationCardSchema = z.object({
  ok: z.literal(true),
  explanation: z.string(),
  journalEntryId: z.string().optional(),
  highlightLines: z
    .array(
      z.object({
        lineIndex: z.number().int().nonnegative(),
        snippet: z.string(),
      })
    )
    .optional(),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  provenance: ProvenanceSchema,
});

export type PostingExplanationCard = z.infer<typeof PostingExplanationCardSchema>;
