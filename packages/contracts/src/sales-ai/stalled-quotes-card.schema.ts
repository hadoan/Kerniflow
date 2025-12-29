import { z } from "zod";
import { ProvenanceSchema } from "../crm/ai-proposals/party-proposal.types";

export const StalledQuoteAlertSchema = z.object({
  quoteId: z.string(),
  quoteNumber: z.string().optional(),
  customerPartyId: z.string().optional(),
  daysSinceSent: z.number().int().nonnegative(),
  suggestedNudge: z.string().optional(),
});

export const StalledQuotesCardSchema = z.object({
  ok: z.literal(true),
  alerts: z.array(StalledQuoteAlertSchema),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  provenance: ProvenanceSchema,
});

export type StalledQuotesCard = z.infer<typeof StalledQuotesCardSchema>;
