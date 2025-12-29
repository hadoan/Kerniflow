import { z } from "zod";
import { InventoryDocumentDtoSchema } from "./inventory.types";
import { localDateSchema } from "../shared/local-date.schema";
import { InventoryDocumentLineInputSchema } from "./create-document.schema";

export const UpdateInventoryDocumentHeaderPatchSchema = z.object({
  partyId: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  scheduledDate: localDateSchema.optional().nullable(),
  postingDate: localDateSchema.optional().nullable(),
  notes: z.string().optional().nullable(),
  sourceType: z.string().optional().nullable(),
  sourceId: z.string().optional().nullable(),
});

export const UpdateInventoryDocumentInputSchema = z.object({
  documentId: z.string(),
  headerPatch: UpdateInventoryDocumentHeaderPatchSchema.optional(),
  lineItems: z.array(InventoryDocumentLineInputSchema).optional(),
});

export const UpdateInventoryDocumentOutputSchema = z.object({
  document: InventoryDocumentDtoSchema,
});

export type UpdateInventoryDocumentHeaderPatch = z.infer<
  typeof UpdateInventoryDocumentHeaderPatchSchema
>;
export type UpdateInventoryDocumentInput = z.infer<typeof UpdateInventoryDocumentInputSchema>;
export type UpdateInventoryDocumentOutput = z.infer<typeof UpdateInventoryDocumentOutputSchema>;
