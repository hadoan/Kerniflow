export type SendInvoiceEmailRequest = {
  tenantId: string;
  invoiceId: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  text: string;
  attachments?: Array<{ filename: string; path: string }>;
  correlationId?: string;
  idempotencyKey: string;
};

export type SendInvoiceEmailResponse = {
  provider: "resend";
  providerMessageId: string;
};

export interface InvoiceEmailSenderPort {
  sendInvoiceEmail(req: SendInvoiceEmailRequest): Promise<SendInvoiceEmailResponse>;
}
