import { z } from "zod";
import { DocumentDtoSchema } from "./document.types";
import { FileDtoSchema } from "./file.types";

export const CompleteUploadInputSchema = z.object({
  documentId: z.string(),
  fileId: z.string(),
  sizeBytes: z.number().int().nonnegative().optional(),
  sha256: z.string().optional(),
});

export const CompleteUploadOutputSchema = z.object({
  document: DocumentDtoSchema,
  file: FileDtoSchema,
});

export type CompleteUploadInput = z.infer<typeof CompleteUploadInputSchema>;
export type CompleteUploadOutput = z.infer<typeof CompleteUploadOutputSchema>;
