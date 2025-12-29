import { z } from "zod";
import { ProvenanceSchema } from "../crm/ai-proposals/party-proposal.types";

export const ReceiptDraftLineSchema = z.object({
  productId: z.string().optional(),
  sku: z.string().optional(),
  productName: z.string().optional(),
  quantity: z.number().positive(),
  unitCostCents: z.number().int().nonnegative().optional(),
  toLocationId: z.string().optional(),
});

export const ReceiptDraftProposalSchema = z.object({
  supplierPartyId: z.string().optional(),
  supplierName: z.string().optional(),
  warehouseId: z.string().optional(),
  scheduledDate: z.string().optional(),
  postingDate: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  lineItems: z.array(ReceiptDraftLineSchema),
  missingFields: z.array(z.string()).optional(),
  followUpQuestions: z.array(z.string()).optional(),
});

export const ReceiptDraftProposalCardSchema = z.object({
  ok: z.literal(true),
  proposal: ReceiptDraftProposalSchema,
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  provenance: ProvenanceSchema,
});

export type ReceiptDraftProposalCard = z.infer<typeof ReceiptDraftProposalCardSchema>;
