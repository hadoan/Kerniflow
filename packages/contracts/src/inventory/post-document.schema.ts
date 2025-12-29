import { z } from "zod";
import { InventoryDocumentDtoSchema } from "./inventory.types";
import { localDateSchema } from "../shared/local-date.schema";

export const PostInventoryDocumentInputSchema = z.object({
  documentId: z.string(),
  postingDate: localDateSchema.optional(),
  idempotencyKey: z.string().optional(),
});

export const PostInventoryDocumentOutputSchema = z.object({
  document: InventoryDocumentDtoSchema,
});

export type PostInventoryDocumentInput = z.infer<typeof PostInventoryDocumentInputSchema>;
export type PostInventoryDocumentOutput = z.infer<typeof PostInventoryDocumentOutputSchema>;
