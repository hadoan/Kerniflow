import { type NotificationPort } from "../../application/ports/notification.port";

export class NoopNotification implements NotificationPort {
  sent: { tenantId: string; invoiceId: string; to?: string }[] = [];

  async sendInvoiceEmail(
    tenantId: string,
    payload: { invoiceId: string; to?: string }
  ): Promise<void> {
    this.sent.push({ tenantId, invoiceId: payload.invoiceId, to: payload.to });
  }
}
