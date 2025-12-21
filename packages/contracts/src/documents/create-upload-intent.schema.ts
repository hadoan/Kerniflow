import { z } from "zod";
import { DocumentDtoSchema, DocumentTypeSchema } from "./document.types";
import { FileDtoSchema } from "./file.types";
import { utcInstantSchema } from "../shared/local-date.schema";

export const CreateUploadIntentInputSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative().optional(),
  sha256: z.string().optional(),
  documentType: DocumentTypeSchema.optional(),
  category: z.string().optional(),
  purpose: z.string().optional(),
  ttlSeconds: z.number().int().positive().optional(),
});

export const SignedUploadSchema = z.object({
  mode: z.literal("single_put"),
  url: z.string(),
  method: z.literal("PUT"),
  requiredHeaders: z.record(z.string()).optional(),
  expiresAt: utcInstantSchema,
});

export const CreateUploadIntentOutputSchema = z.object({
  document: DocumentDtoSchema,
  file: FileDtoSchema,
  upload: SignedUploadSchema,
});

export type CreateUploadIntentInput = z.infer<typeof CreateUploadIntentInputSchema>;
export type CreateUploadIntentOutput = z.infer<typeof CreateUploadIntentOutputSchema>;
