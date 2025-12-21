import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";

export const FileKindSchema = z.enum(["ORIGINAL", "DERIVED", "GENERATED"]);
export type FileKind = z.infer<typeof FileKindSchema>;

export const StorageProviderSchema = z.enum(["gcs", "s3", "azure"]);
export type StorageProvider = z.infer<typeof StorageProviderSchema>;

export const FileDtoSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  kind: FileKindSchema,
  storageProvider: StorageProviderSchema,
  bucket: z.string(),
  objectKey: z.string(),
  contentType: z.string().optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  sha256: z.string().optional(),
  createdAt: utcInstantSchema,
});
export type FileDTO = z.infer<typeof FileDtoSchema>;
