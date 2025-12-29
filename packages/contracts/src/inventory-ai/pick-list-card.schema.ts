import { z } from "zod";
import { ProvenanceSchema } from "../crm/ai-proposals/party-proposal.types";

export const PickListItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().positive(),
  locationId: z.string().optional(),
  notes: z.string().optional(),
});

export const PickListCardSchema = z.object({
  ok: z.literal(true),
  deliveryDocumentId: z.string().optional(),
  warehouseId: z.string().optional(),
  items: z.array(PickListItemSchema),
  checklist: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  provenance: ProvenanceSchema,
});

export type PickListCard = z.infer<typeof PickListCardSchema>;
