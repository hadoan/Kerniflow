export type EmailAttachment = {
  filename: string;
  path?: string;
  content?: Buffer;
  mimeType?: string;
};

export type SendEmailRequest = {
  tenantId: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
  headers?: Record<string, string>;
  idempotencyKey?: string;
};

export type SendEmailResponse = {
  provider: string;
  providerMessageId: string;
};

export interface EmailSenderPort {
  sendEmail(request: SendEmailRequest): Promise<SendEmailResponse>;
}

export const EMAIL_SENDER_PORT = Symbol("EMAIL_SENDER_PORT");
