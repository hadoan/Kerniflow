import { z } from "zod";
import { ProvenanceSchema } from "../crm/ai-proposals/party-proposal.types";

export const ReorderPolicyProposalSchema = z.object({
  productId: z.string(),
  warehouseId: z.string(),
  minQty: z.number().nonnegative(),
  maxQty: z.number().nonnegative().optional(),
  reorderPoint: z.number().nonnegative().optional(),
  preferredSupplierPartyId: z.string().optional(),
  leadTimeDays: z.number().int().nonnegative().optional(),
  rationaleNotes: z.string().optional(),
});

export const ReorderPolicyProposalCardSchema = z.object({
  ok: z.literal(true),
  proposal: ReorderPolicyProposalSchema,
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  provenance: ProvenanceSchema,
});

export type ReorderPolicyProposalCard = z.infer<typeof ReorderPolicyProposalCardSchema>;
