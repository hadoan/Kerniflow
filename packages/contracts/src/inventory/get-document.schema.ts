import { z } from "zod";
import { InventoryDocumentDtoSchema } from "./inventory.types";

export const GetInventoryDocumentInputSchema = z.object({
  documentId: z.string(),
});

export const GetInventoryDocumentOutputSchema = z.object({
  document: InventoryDocumentDtoSchema,
});

export type GetInventoryDocumentInput = z.infer<typeof GetInventoryDocumentInputSchema>;
export type GetInventoryDocumentOutput = z.infer<typeof GetInventoryDocumentOutputSchema>;
