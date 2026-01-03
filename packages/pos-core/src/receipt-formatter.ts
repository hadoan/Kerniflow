import type { PosSale } from "@corely/contracts";
import { format } from "date-fns";

/**
 * Receipt data for display or printing
 */
export interface ReceiptData {
  receiptNumber: string;
  saleDate: string;
  cashierName: string;
  customerName: string | null;
  lineItems: Array<{
    description: string;
    qty: number;
    unitPrice: string;
    lineTotal: string;
  }>;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  payments: Array<{
    method: string;
    amount: string;
    reference: string | null;
  }>;
  change?: string;
}

/**
 * Receipt Formatter - Formats POS sale data for display/printing
 * Platform-agnostic formatting logic
 */
export class ReceiptFormatter {
  /**
   * Format money from cents to locale string
   */
  private formatMoney(cents: number, locale: string, currency: string): string {
    const amount = cents / 100;
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(amount);
  }

  /**
   * Format date with locale
   */
  private formatDate(date: Date, _locale: string): string {
    // Simple date format that works across locales
    return format(date, "PPpp");
  }

  /**
   * Format payment method for display
   */
  private formatPaymentMethod(method: string): string {
    const methodMap: Record<string, string> = {
      CASH: "Cash",
      CARD: "Card",
      BANK_TRANSFER: "Bank Transfer",
      OTHER: "Other",
    };
    return methodMap[method] || method;
  }

  /**
   * Format POS sale for receipt display
   */
  formatForDisplay(
    sale: PosSale,
    options: {
      locale?: string;
      currency?: string;
      cashierName?: string;
      customerName?: string | null;
    } = {}
  ): ReceiptData {
    const locale = options.locale || "en-US";
    const currency = options.currency || "EUR";
    const cashierName = options.cashierName || "Cashier";

    // Format line items
    const lineItems = sale.lineItems.map((line: PosSale["lineItems"][number]) => ({
      description: line.productName,
      qty: line.quantity,
      unitPrice: this.formatMoney(line.unitPriceCents, locale, currency),
      lineTotal: this.formatMoney(line.lineTotalCents, locale, currency),
    }));

    // Format payments
    const payments = sale.payments.map((payment: PosSale["payments"][number]) => ({
      method: this.formatPaymentMethod(payment.method),
      amount: this.formatMoney(payment.amountCents, locale, currency),
      reference: payment.reference,
    }));

    // Calculate change if cash payment with overpayment
    let change: string | undefined;
    const cashPayment = sale.payments.find((p: PosSale["payments"][number]) => p.method === "CASH");
    if (cashPayment && cashPayment.amountCents > sale.totalCents) {
      const changeCents = cashPayment.amountCents - sale.totalCents;
      change = this.formatMoney(changeCents, locale, currency);
    }

    const receipt: ReceiptData = {
      receiptNumber: sale.receiptNumber,
      saleDate: this.formatDate(sale.saleDate, locale),
      cashierName,
      customerName: options.customerName || null,
      lineItems,
      subtotal: this.formatMoney(sale.subtotalCents, locale, currency),
      discount: this.formatMoney(sale.cartDiscountCents, locale, currency),
      tax: this.formatMoney(sale.taxCents, locale, currency),
      total: this.formatMoney(sale.totalCents, locale, currency),
      payments,
    };

    if (change) {
      receipt.change = change;
    }

    return receipt;
  }

  /**
   * Format receipt as plain text (for printing or display)
   */
  formatAsText(receiptData: ReceiptData, options: { width?: number } = {}): string {
    const width = options.width || 40;
    const lines: string[] = [];

    // Header
    lines.push(this.centerText("RECEIPT", width));
    lines.push(this.repeat("-", width));
    lines.push(`Receipt: ${receiptData.receiptNumber}`);
    lines.push(`Date: ${receiptData.saleDate}`);
    lines.push(`Cashier: ${receiptData.cashierName}`);
    if (receiptData.customerName) {
      lines.push(`Customer: ${receiptData.customerName}`);
    }
    lines.push(this.repeat("-", width));

    // Line items
    for (const line of receiptData.lineItems) {
      lines.push(`${line.description}`);
      lines.push(`  ${line.qty} x ${line.unitPrice}${this.rightAlign(line.lineTotal, width - 2)}`);
    }
    lines.push(this.repeat("-", width));

    // Totals
    lines.push(this.rightAlign(`Subtotal: ${receiptData.subtotal}`, width));
    if (receiptData.discount !== "$0.00" && receiptData.discount !== "€0.00") {
      lines.push(this.rightAlign(`Discount: -${receiptData.discount}`, width));
    }
    if (receiptData.tax !== "$0.00" && receiptData.tax !== "€0.00") {
      lines.push(this.rightAlign(`Tax: ${receiptData.tax}`, width));
    }
    lines.push(this.repeat("=", width));
    lines.push(this.rightAlign(`TOTAL: ${receiptData.total}`, width));
    lines.push(this.repeat("=", width));

    // Payments
    for (const payment of receiptData.payments) {
      let paymentLine = `${payment.method}: ${payment.amount}`;
      if (payment.reference) {
        paymentLine += ` (${payment.reference})`;
      }
      lines.push(paymentLine);
    }

    // Change
    if (receiptData.change) {
      lines.push(this.rightAlign(`Change: ${receiptData.change}`, width));
    }

    lines.push(this.repeat("-", width));
    lines.push(this.centerText("Thank You!", width));

    return lines.join("\n");
  }

  /**
   * Helper: Center text
   */
  private centerText(text: string, width: number): string {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return " ".repeat(padding) + text;
  }

  /**
   * Helper: Right-align text
   */
  private rightAlign(text: string, width: number): string {
    const padding = Math.max(0, width - text.length);
    return " ".repeat(padding) + text;
  }

  /**
   * Helper: Repeat character
   */
  private repeat(char: string, times: number): string {
    return char.repeat(times);
  }
}
