import { z } from "zod";
import { ProvenanceSchema } from "../crm/ai-proposals/party-proposal.types";

export const QuoteDraftLineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().positive(),
  unitPriceCents: z.number().int().nonnegative(),
  discountCents: z.number().int().nonnegative().optional(),
  revenueCategory: z.string().optional(),
});

export const QuoteDraftProposalSchema = z.object({
  customerPartyId: z.string().optional(),
  customerName: z.string().optional(),
  customerContactPartyId: z.string().optional(),
  paymentTerms: z.string().optional(),
  validUntilDate: z.string().optional(),
  notes: z.string().optional(),
  lineItems: z.array(QuoteDraftLineItemSchema),
  missingFields: z.array(z.string()).optional(),
});

export const QuoteDraftProposalCardSchema = z.object({
  ok: z.literal(true),
  proposal: QuoteDraftProposalSchema,
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  provenance: ProvenanceSchema,
});

export type QuoteDraftProposalCard = z.infer<typeof QuoteDraftProposalCardSchema>;
