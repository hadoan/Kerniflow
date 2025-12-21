import { z } from "zod";

export const SendInvoiceInputSchema = z.object({
  invoiceId: z.string(),
  to: z.string().email(),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  message: z.string().optional(),
  attachPdf: z.boolean().default(false),
  idempotencyKey: z.string().optional(),
  locale: z.string().optional(),
});

export const SendInvoiceOutputSchema = z.object({
  deliveryId: z.string(),
  status: z.enum(["QUEUED", "SENT", "DELIVERED", "BOUNCED", "FAILED", "DELAYED"]),
});

export type SendInvoiceInput = z.infer<typeof SendInvoiceInputSchema>;
export type SendInvoiceOutput = z.infer<typeof SendInvoiceOutputSchema>;
