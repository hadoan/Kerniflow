import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";

export const GetDownloadUrlInputSchema = z.object({
  documentId: z.string(),
  fileId: z.string().optional(),
});

export const GetDownloadUrlOutputSchema = z.object({
  url: z.string(),
  expiresAt: utcInstantSchema,
});

export type GetDownloadUrlInput = z.infer<typeof GetDownloadUrlInputSchema>;
export type GetDownloadUrlOutput = z.infer<typeof GetDownloadUrlOutputSchema>;
