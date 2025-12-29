import { z } from "zod";
import { InventoryDocumentDtoSchema } from "./inventory.types";

export const ConfirmInventoryDocumentInputSchema = z.object({
  documentId: z.string(),
  idempotencyKey: z.string().optional(),
});

export const ConfirmInventoryDocumentOutputSchema = z.object({
  document: InventoryDocumentDtoSchema,
});

export type ConfirmInventoryDocumentInput = z.infer<typeof ConfirmInventoryDocumentInputSchema>;
export type ConfirmInventoryDocumentOutput = z.infer<typeof ConfirmInventoryDocumentOutputSchema>;
