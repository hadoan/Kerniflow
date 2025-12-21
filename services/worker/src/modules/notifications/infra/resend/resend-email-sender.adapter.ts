import { Resend } from "resend";
import {
  EmailSenderPort,
  SendEmailRequest,
  SendEmailResponse,
} from "../../ports/email-sender.port";

export class ResendEmailSenderAdapter implements EmailSenderPort {
  private resend: Resend;
  private fromAddress: string;
  private replyTo?: string;

  constructor(apiKey?: string, fromAddress?: string, replyTo?: string) {
    const key = apiKey ?? process.env.RESEND_API_KEY;
    if (!key) {
      throw new Error("RESEND_API_KEY environment variable is required");
    }
    this.resend = new Resend(key);
    this.fromAddress =
      fromAddress ?? process.env.RESEND_FROM ?? "Qansa Billing <billing@example.com>";
    this.replyTo = replyTo ?? process.env.RESEND_REPLY_TO;
  }

  async sendEmail(request: SendEmailRequest): Promise<SendEmailResponse> {
    const emailOptions: any = {
      from: this.fromAddress,
      to: request.to,
      subject: request.subject,
      html: request.html,
      text: request.text,
    };

    if (request.cc?.length) emailOptions.cc = request.cc;
    if (request.bcc?.length) emailOptions.bcc = request.bcc;
    if (this.replyTo || request.replyTo) emailOptions.replyTo = request.replyTo ?? this.replyTo;
    if (request.headers) emailOptions.headers = request.headers;
    if (request.attachments?.length) {
      emailOptions.attachments = request.attachments.map((att) => ({
        filename: att.filename,
        path: att.path,
        content: att.content,
        contentType: att.mimeType,
      }));
    }

    const { data, error } = await this.resend.emails.send(emailOptions, {
      idempotencyKey: request.idempotencyKey,
    });

    if (error) {
      throw new Error(`Resend API error: ${error.message}`);
    }
    if (!data?.id) {
      throw new Error("Resend API did not return an email ID");
    }

    return { provider: "resend", providerMessageId: data.id };
  }
}
