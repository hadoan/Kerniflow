import { Inject, Injectable } from "@nestjs/common";
import type { PrismaService } from "@kerniflow/data";
import { EventHandler, OutboxEvent } from "../outbox/event-handler.interface";
import { renderEmail } from "@kerniflow/email-templates";
import { InvoiceEmail, buildInvoiceEmailSubject } from "@kerniflow/email-templates/invoices";
import { mapToInvoiceEmailProps } from "./invoice-email-props.mapper";
import { EMAIL_SENDER_PORT } from "../notifications/ports/email-sender.port";
import type { EmailSenderPort } from "../notifications/ports/email-sender.port";

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

  constructor(
    @Inject(EMAIL_SENDER_PORT) private readonly emailSender: EmailSenderPort,
    private readonly prisma: PrismaService
  ) {}

  async handle(event: OutboxEvent): Promise<void> {
    const payload: InvoiceEmailRequestedPayload = JSON.parse(event.payloadJson);

    // 1. Load delivery record
    const delivery = await this.prisma.invoiceEmailDelivery.findUnique({
      where: { id: payload.deliveryId },
    });

    if (!delivery) {
      throw new Error(`Delivery record not found: ${payload.deliveryId}`);
    }

    // 2. Load invoice context
    const invoice = await this.prisma.invoice.findFirst({
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

    const emailProps = mapToInvoiceEmailProps({
      invoice,
      companyName,
      customMessage: payload.message,
      locale: payload.locale,
      // viewInvoiceUrl: `https://app.example.com/invoices/${invoice.id}`, // TODO: Generate from config
    });

    const subject = buildInvoiceEmailSubject(emailProps);

    // 4. Render email template
    const { html, text } = await renderEmail(<InvoiceEmail {...emailProps} />);

    try {
      // 5. Send email via provider
      const emailRequest: any = {
        tenantId: event.tenantId,
        to: [payload.to],
        subject,
        html,
        text,
        idempotencyKey: payload.idempotencyKey,
      };

      if (event.correlationId) {
        emailRequest.headers = { "X-Correlation-ID": event.correlationId };
      }
      if (payload.cc) {
        emailRequest.cc = payload.cc;
      }
      if (payload.bcc) {
        emailRequest.bcc = payload.bcc;
      }

      const result = await this.emailSender.sendEmail(emailRequest);

      // 6. Update delivery record to SENT
      await this.prisma.invoiceEmailDelivery.update({
        where: { id: payload.deliveryId },
        data: {
          status: "SENT",
          provider: result.provider,
          providerMessageId: result.providerMessageId,
        },
      });
    } catch (error) {
      // Update delivery record to FAILED
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.prisma.invoiceEmailDelivery.update({
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
