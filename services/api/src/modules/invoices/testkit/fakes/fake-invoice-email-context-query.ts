import {
  type InvoiceEmailContextQueryPort,
  type InvoiceEmailContext,
} from "../../application/ports/invoice-email-context-query.port";

export class FakeInvoiceEmailContextQuery implements InvoiceEmailContextQueryPort {
  private contexts = new Map<string, InvoiceEmailContext>();

  async getInvoiceEmailContext(
    tenantId: string,
    invoiceId: string
  ): Promise<InvoiceEmailContext | null> {
    const key = `${tenantId}:${invoiceId}`;
    return this.contexts.get(key) ?? null;
  }

  // Test helper
  setContext(tenantId: string, invoiceId: string, context: InvoiceEmailContext): void {
    const key = `${tenantId}:${invoiceId}`;
    this.contexts.set(key, context);
  }

  // Test helper
  clear(): void {
    this.contexts.clear();
  }
}
