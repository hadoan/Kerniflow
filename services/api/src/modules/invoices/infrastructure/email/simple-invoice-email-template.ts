import { type InvoiceEmailContext } from "../../application/ports/invoice-email-context-query.port";

export function buildInvoiceEmailSubject(context: InvoiceEmailContext): string {
  return `Invoice ${context.invoiceNumber} from ${context.companyName ?? "your company"}`;
}

export function buildInvoiceEmailHtml(
  context: InvoiceEmailContext,
  customMessage?: string
): string {
  const formattedAmount = formatCurrency(context.totalAmountCents, context.currency);

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
    .actions {
      margin: 30px 0;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #0066cc;
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
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
    <div>From ${context.companyName ?? "your company"}</div>
  </div>

  ${customMessage ? `<div class="message">${escapeHtml(customMessage)}</div>` : ""}

  <div class="details">
    <div class="detail-row">
      <span class="detail-label">Customer:</span>
      <span class="detail-value">${escapeHtml(context.customerName)}</span>
    </div>
    ${
      context.invoiceDate
        ? `
    <div class="detail-row">
      <span class="detail-label">Invoice Date:</span>
      <span class="detail-value">${context.invoiceDate}</span>
    </div>
    `
        : ""
    }
    ${
      context.dueDate
        ? `
    <div class="detail-row">
      <span class="detail-label">Due Date:</span>
      <span class="detail-value">${context.dueDate}</span>
    </div>
    `
        : ""
    }
    <div class="detail-row total">
      <span class="detail-label">Total Amount:</span>
      <span class="detail-value">${formattedAmount}</span>
    </div>
  </div>

  ${
    context.publicInvoiceUrl
      ? `
  <div class="actions">
    <a href="${context.publicInvoiceUrl}" class="button">View Invoice</a>
  </div>
  `
      : ""
  }

  <div class="footer">
    <p>Thank you for your business!</p>
    ${context.pdfUrl ? `<p><small>A PDF copy of this invoice is attached.</small></p>` : ""}
  </div>
</body>
</html>
  `.trim();
}

function formatCurrency(amountCents: number, currency: string): string {
  const amount = amountCents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
