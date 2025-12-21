import { Injectable } from "@nestjs/common";
import { Resend } from "resend";
import {
  InvoiceEmailSenderPort,
  SendInvoiceEmailRequest,
  SendInvoiceEmailResponse,
} from "../../application/ports/invoice-email-sender.port";

@Injectable()
export class ResendInvoiceEmailSenderAdapter implements InvoiceEmailSenderPort {
  private resend: Resend;
  private fromAddress: string;
  private replyTo?: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is required");
    }

    this.resend = new Resend(apiKey);
    this.fromAddress = process.env.RESEND_FROM ?? "Qansa Billing <billing@example.com>";
    this.replyTo = process.env.RESEND_REPLY_TO;
  }

  async sendInvoiceEmail(req: SendInvoiceEmailRequest): Promise<SendInvoiceEmailResponse> {
    const { data, error } = await this.resend.emails.send(
      {
        from: this.fromAddress,
        to: req.to,
        cc: req.cc,
        bcc: req.bcc,
        subject: req.subject,
        html: req.html,
        attachments: req.attachments?.map((att) => ({
          filename: att.filename,
          path: att.path,
        })),
        reply_to: this.replyTo,
        headers: req.correlationId
          ? {
              "X-Correlation-ID": req.correlationId,
            }
          : undefined,
      },
      {
        idempotencyKey: req.idempotencyKey,
      }
    );

    if (error) {
      throw new Error(`Resend API error: ${error.message}`);
    }

    if (!data?.id) {
      throw new Error("Resend API did not return an email ID");
    }

    return {
      provider: "resend",
      providerMessageId: data.id,
    };
  }
}
