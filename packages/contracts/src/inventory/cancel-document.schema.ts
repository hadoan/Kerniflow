import { z } from "zod";
import { InventoryDocumentDtoSchema } from "./inventory.types";

export const CancelInventoryDocumentInputSchema = z.object({
  documentId: z.string(),
  idempotencyKey: z.string().optional(),
});

export const CancelInventoryDocumentOutputSchema = z.object({
  document: InventoryDocumentDtoSchema,
});

export type CancelInventoryDocumentInput = z.infer<typeof CancelInventoryDocumentInputSchema>;
export type CancelInventoryDocumentOutput = z.infer<typeof CancelInventoryDocumentOutputSchema>;
