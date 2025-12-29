import { Resend } from "resend";
import {
  type EmailSenderPort,
  type SendEmailRequest,
  type SendEmailResponse,
} from "../../ports/email-sender.port";

export class ResendEmailSenderAdapter implements EmailSenderPort {
  private resend!: Resend;
  private fromAddress!: string;
  private replyTo: string;

  constructor(apiKey?: string, fromAddress?: string, replyTo?: string) {
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is required");
    }
    this.resend = new Resend(apiKey);
    this.fromAddress = fromAddress ?? "Qansa Billing <billing@example.com>";
    this.replyTo = replyTo ?? "";
  }

  async sendEmail(request: SendEmailRequest): Promise<SendEmailResponse> {
    const emailOptions: any = {
      from: this.fromAddress,
      to: request.to,
      subject: request.subject,
      html: request.html,
      text: request.text,
    };

    if (request.cc && request.cc.length) {
      emailOptions.cc = request.cc;
    }
    if (request.bcc && request.bcc.length) {
      emailOptions.bcc = request.bcc;
    }
    if (this.replyTo || request.replyTo) {
      emailOptions.replyTo = request.replyTo ?? this.replyTo;
    }
    if (request.headers) {
      emailOptions.headers = request.headers;
    }
    if (request.attachments?.length) {
      emailOptions.attachments = request.attachments.map((att) => ({
        filename: att.filename,
        path: att.path,
        content: att.content,
        contentType: att.mimeType,
      }));
    }

    const sendOptions: { idempotencyKey: string } | undefined = request.idempotencyKey
      ? { idempotencyKey: request.idempotencyKey }
      : undefined;
    const { data, error } = await this.resend.emails.send(emailOptions, sendOptions);

    if (error) {
      throw new Error(`Resend API error: ${error.message}`);
    }
    if (!data?.id) {
      throw new Error("Resend API did not return an email ID");
    }

    return { provider: "resend", providerMessageId: data.id };
  }
}
