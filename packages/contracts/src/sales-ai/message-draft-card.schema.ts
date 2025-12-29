import { z } from "zod";
import { ProvenanceSchema } from "../crm/ai-proposals/party-proposal.types";

export const MessageDraftSchema = z.object({
  subject: z.string(),
  body: z.string(),
  tone: z.string().optional(),
  recommendedSendAt: z.string().optional(),
});

export const MessageDraftCardSchema = z.object({
  ok: z.literal(true),
  draft: MessageDraftSchema,
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  provenance: ProvenanceSchema,
});

export type MessageDraftCard = z.infer<typeof MessageDraftCardSchema>;
