import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";

export const RequestInvoicePdfInputSchema = z.object({
  invoiceId: z.string(),
  forceRegenerate: z.boolean().optional(),
});

export const RequestInvoicePdfStatusSchema = z.enum(["PENDING", "READY"]);
export type RequestInvoicePdfStatus = z.infer<typeof RequestInvoicePdfStatusSchema>;

export const RequestInvoicePdfOutputSchema = z.object({
  documentId: z.string(),
  status: RequestInvoicePdfStatusSchema,
  fileId: z.string().optional(),
  downloadUrl: z.string().optional(),
  expiresAt: utcInstantSchema.optional(),
});

export type RequestInvoicePdfInput = z.infer<typeof RequestInvoicePdfInputSchema>;
export type RequestInvoicePdfOutput = z.infer<typeof RequestInvoicePdfOutputSchema>;
