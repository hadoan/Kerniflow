import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";
import { FileDtoSchema } from "./file.types";

export const DocumentTypeSchema = z.enum(["UPLOAD", "RECEIPT", "CONTRACT", "INVOICE_PDF", "OTHER"]);
export type DocumentType = z.infer<typeof DocumentTypeSchema>;

export const DocumentStatusSchema = z.enum(["PENDING", "READY", "FAILED", "QUARANTINED"]);
export type DocumentStatus = z.infer<typeof DocumentStatusSchema>;

export const DocumentLinkEntityTypeSchema = z.enum([
  "INVOICE",
  "EXPENSE",
  "AGENT_RUN",
  "MESSAGE",
  "OTHER",
]);
export type DocumentLinkEntityType = z.infer<typeof DocumentLinkEntityTypeSchema>;

export const DocumentDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  type: DocumentTypeSchema,
  status: DocumentStatusSchema,
  title: z.string().optional(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
  files: z.array(FileDtoSchema),
});
export type DocumentDTO = z.infer<typeof DocumentDtoSchema>;
