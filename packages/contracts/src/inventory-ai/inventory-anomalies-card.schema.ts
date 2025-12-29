import { z } from "zod";
import { ProvenanceSchema } from "../crm/ai-proposals/party-proposal.types";

export const InventoryAnomalySchema = z.object({
  title: z.string(),
  description: z.string(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  documentId: z.string().optional(),
  productId: z.string().optional(),
  warehouseId: z.string().optional(),
  detectedAt: z.string().optional(),
  suggestedAction: z.string().optional(),
});

export const InventoryAnomaliesCardSchema = z.object({
  ok: z.literal(true),
  anomalies: z.array(InventoryAnomalySchema),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  provenance: ProvenanceSchema,
});

export type InventoryAnomaliesCard = z.infer<typeof InventoryAnomaliesCardSchema>;
