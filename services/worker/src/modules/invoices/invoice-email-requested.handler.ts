import { Injectable } from "@nestjs/common";
import { prisma } from "@kerniflow/data";
import { Resend } from "resend";
import { EventHandler, OutboxEvent } from "../outbox/event-handler.interface";

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

    // Calculate total
    const totalAmountCents = invoice.lines.reduce(
      (sum, line) => sum + line.qty * line.unitPriceCents,
      0
    );

    // 3. Build email subject and HTML
    const companyName = "Your Company"; // TODO: Get from tenant settings
    const subject = `Invoice ${invoice.number ?? "DRAFT"} from ${companyName}`;
    const html = this.buildEmailHtml({
      invoiceNumber: invoice.number ?? "DRAFT",
      customerName: "Customer", // TODO: Get from customer table
      totalAmountCents,
      currency: invoice.currency,
      companyName,
      customMessage: payload.message,
    });

    try {
      // 4. Send email via Resend
      const { data, error } = await this.resend.emails.send(
        {
          from: this.fromAddress,
          to: [payload.to],
          cc: payload.cc,
          bcc: payload.bcc,
          subject,
          html,
          reply_to: this.replyTo,
          headers: event.correlationId
            ? {
                "X-Correlation-ID": event.correlationId,
              }
            : undefined,
        },
        {
          idempotencyKey: payload.idempotencyKey,
        }
      );

      if (error) {
        throw new Error(`Resend API error: ${error.message}`);
      }

      if (!data?.id) {
        throw new Error("Resend API did not return an email ID");
      }

      // 5. Update delivery record to SENT
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

  private buildEmailHtml(context: {
    invoiceNumber: string;
    customerName: string;
    totalAmountCents: number;
    currency: string;
    companyName: string;
    customMessage?: string;
  }): string {
    const formattedAmount = this.formatCurrency(context.totalAmountCents, context.currency);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${context.invoiceNumber}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      margin-bottom: 30px;
    }
    .invoice-number {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 10px;
    }
    .details {
      background-color: #f9f9f9;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .detail-label {
      font-weight: 500;
      color: #666;
    }
    .detail-value {
      font-weight: 600;
    }
    .total {
      font-size: 20px;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 2px solid #ddd;
    }
    .message {
      margin: 20px 0;
      padding: 15px;
      background-color: #f0f7ff;
      border-left: 4px solid #0066cc;
      border-radius: 4px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 14px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="invoice-number">Invoice ${context.invoiceNumber}</div>
    <div>From ${context.companyName}</div>
  </div>

  ${context.customMessage ? `<div class="message">${this.escapeHtml(context.customMessage)}</div>` : ""}

  <div class="details">
    <div class="detail-row">
      <span class="detail-label">Customer:</span>
      <span class="detail-value">${this.escapeHtml(context.customerName)}</span>
    </div>
    <div class="detail-row total">
      <span class="detail-label">Total Amount:</span>
      <span class="detail-value">${formattedAmount}</span>
    </div>
  </div>

  <div class="footer">
    <p>Thank you for your business!</p>
  </div>
</body>
</html>
    `.trim();
  }

  private formatCurrency(amountCents: number, currency: string): string {
    const amount = amountCents / 100;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  }

  private escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
