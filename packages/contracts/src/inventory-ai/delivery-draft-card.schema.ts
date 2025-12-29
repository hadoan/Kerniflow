import { z } from "zod";
import { ProvenanceSchema } from "../crm/ai-proposals/party-proposal.types";

export const DeliveryDraftLineSchema = z.object({
  productId: z.string().optional(),
  sku: z.string().optional(),
  productName: z.string().optional(),
  quantity: z.number().positive(),
  fromLocationId: z.string().optional(),
  shortageQty: z.number().nonnegative().optional(),
});

export const DeliveryDraftProposalSchema = z.object({
  customerPartyId: z.string().optional(),
  customerName: z.string().optional(),
  warehouseId: z.string().optional(),
  scheduledDate: z.string().optional(),
  postingDate: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  lineItems: z.array(DeliveryDraftLineSchema),
  missingFields: z.array(z.string()).optional(),
  followUpQuestions: z.array(z.string()).optional(),
});

export const DeliveryDraftProposalCardSchema = z.object({
  ok: z.literal(true),
  proposal: DeliveryDraftProposalSchema,
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  provenance: ProvenanceSchema,
});

export type DeliveryDraftProposalCard = z.infer<typeof DeliveryDraftProposalCardSchema>;
