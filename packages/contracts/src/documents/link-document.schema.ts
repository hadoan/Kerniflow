import { z } from "zod";
import { DocumentLinkEntityTypeSchema } from "./document.types";

export const LinkDocumentInputSchema = z.object({
  documentId: z.string(),
  entityType: DocumentLinkEntityTypeSchema,
  entityId: z.string(),
});

export const LinkDocumentOutputSchema = z.object({
  documentId: z.string(),
  entityType: DocumentLinkEntityTypeSchema,
  entityId: z.string(),
});

export type LinkDocumentInput = z.infer<typeof LinkDocumentInputSchema>;
export type LinkDocumentOutput = z.infer<typeof LinkDocumentOutputSchema>;
