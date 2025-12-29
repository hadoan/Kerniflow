import { z } from "zod";
import { InventoryDocumentTypeSchema } from "../inventory/inventory.types";
import { ProvenanceSchema } from "../crm/ai-proposals/party-proposal.types";

export const StockChangeHighlightSchema = z.object({
  documentId: z.string().optional(),
  documentType: InventoryDocumentTypeSchema.optional(),
  quantityDelta: z.number().optional(),
  description: z.string().optional(),
});

export const StockChangeExplanationCardSchema = z.object({
  ok: z.literal(true),
  summary: z.string(),
  highlights: z.array(StockChangeHighlightSchema).optional(),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  provenance: ProvenanceSchema,
});

export type StockChangeExplanationCard = z.infer<typeof StockChangeExplanationCardSchema>;
