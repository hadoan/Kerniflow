import { Injectable } from "@nestjs/common";
import { prisma } from "@kerniflow/data";
import { Resend } from "resend";
import { EventHandler, OutboxEvent } from "../outbox/event-handler.interface";
import { renderEmail } from "@kerniflow/email-templates";
import { InvoiceEmail, buildInvoiceEmailSubject } from "@kerniflow/email-templates/invoices";
import { mapToInvoiceEmailProps } from "./invoice-email-props.mapper";

type InvoiceEmailRequestedPayload = {
  deliveryId: string;
  invoiceId: string;
  to: string;
  cc?: string[];
  bcc?: string[];
  message?: string;
  attachPdf?: boolean;
  locale?: string;
  idempotencyKey: string;
};

@Injectable()
export class InvoiceEmailRequestedHandler implements EventHandler {
  readonly eventType = "invoice.email.requested";
  private resend: Resend;
  private fromAddress: string;
  private replyTo?: string | undefined;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is required");
    }

    this.resend = new Resend(apiKey);
    this.fromAddress = process.env.RESEND_FROM ?? "Qansa Billing <billing@example.com>";
    this.replyTo = process.env.RESEND_REPLY_TO;
  }

  async handle(event: OutboxEvent): Promise<void> {
    const payload: InvoiceEmailRequestedPayload = JSON.parse(event.payloadJson);

    // 1. Load delivery record
    const delivery = await prisma.invoiceEmailDelivery.findUnique({
      where: { id: payload.deliveryId },
    });

    if (!delivery) {
      throw new Error(`Delivery record not found: ${payload.deliveryId}`);
    }

    // 2. Load invoice context
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: payload.invoiceId,
        tenantId: event.tenantId,
      },
      include: {
        lines: true,
      },
    });

    if (!invoice) {
      throw new Error(`Invoice not found: ${payload.invoiceId}`);
    }

    // 3. Prepare email template props
    const companyName = "Your Company"; // TODO: Get from tenant settings
    const customerName = "Customer"; // TODO: Get from customer table

    const emailProps = mapToInvoiceEmailProps({
      invoice,
      companyName,
      customerName,
      customMessage: payload.message,
      locale: payload.locale,
      // viewInvoiceUrl: `https://app.example.com/invoices/${invoice.id}`, // TODO: Generate from config
    });

    const subject = buildInvoiceEmailSubject(emailProps);

    // 4. Render email template
    const { html, text } = await renderEmail(<InvoiceEmail {...emailProps} />);

    try {
      // 5. Send email via Resend
      const emailOptions: any = {
        from: this.fromAddress,
        to: [payload.to],
        subject,
        html,
        text,
      };

      if (payload.cc) {
        emailOptions.cc = payload.cc;
      }

      if (payload.bcc) {
        emailOptions.bcc = payload.bcc;
      }

      if (this.replyTo) {
        emailOptions.replyTo = this.replyTo;
      }

      if (event.correlationId) {
        emailOptions.headers = {
          "X-Correlation-ID": event.correlationId,
        };
      }

      const { data, error } = await this.resend.emails.send(emailOptions, {
        idempotencyKey: payload.idempotencyKey,
      });

      if (error) {
        throw new Error(`Resend API error: ${error.message}`);
      }

      if (!data?.id) {
        throw new Error("Resend API did not return an email ID");
      }

      // 6. Update delivery record to SENT
      await prisma.invoiceEmailDelivery.update({
        where: { id: payload.deliveryId },
        data: {
          status: "SENT",
          providerMessageId: data.id,
        },
      });
    } catch (error) {
      // Update delivery record to FAILED
      const errorMessage = error instanceof Error ? error.message : String(error);
      await prisma.invoiceEmailDelivery.update({
        where: { id: payload.deliveryId },
        data: {
          status: "FAILED",
          lastError: errorMessage,
        },
      });

      throw error; // Re-throw to mark outbox event as failed
    }
  }
}
