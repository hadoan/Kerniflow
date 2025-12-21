import {
  InvoiceEmailDeliveryRepoPort,
  InvoiceEmailDelivery,
  DeliveryStatus,
} from "../../application/ports/invoice-email-delivery-repo.port";

export class FakeInvoiceEmailDeliveryRepository implements InvoiceEmailDeliveryRepoPort {
  deliveries: InvoiceEmailDelivery[] = [];

  async findByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string
  ): Promise<InvoiceEmailDelivery | null> {
    return (
      this.deliveries.find((d) => d.tenantId === tenantId && d.idempotencyKey === idempotencyKey) ??
      null
    );
  }

  async findById(tenantId: string, deliveryId: string): Promise<InvoiceEmailDelivery | null> {
    return this.deliveries.find((d) => d.id === deliveryId && d.tenantId === tenantId) ?? null;
  }

  async findByProviderMessageId(providerMessageId: string): Promise<InvoiceEmailDelivery | null> {
    return this.deliveries.find((d) => d.providerMessageId === providerMessageId) ?? null;
  }

  async create(
    delivery: Omit<InvoiceEmailDelivery, "createdAt" | "updatedAt">
  ): Promise<InvoiceEmailDelivery> {
    const newDelivery: InvoiceEmailDelivery = {
      ...delivery,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.deliveries.push(newDelivery);
    return newDelivery;
  }

  async updateStatus(
    tenantId: string,
    deliveryId: string,
    status: DeliveryStatus,
    providerMessageId?: string,
    lastError?: string
  ): Promise<void> {
    const delivery = this.deliveries.find((d) => d.id === deliveryId && d.tenantId === tenantId);
    if (delivery) {
      delivery.status = status;
      if (providerMessageId !== undefined) {
        delivery.providerMessageId = providerMessageId;
      }
      if (lastError !== undefined) {
        delivery.lastError = lastError;
      }
      delivery.updatedAt = new Date();
    }
  }

  async updateStatusByProviderMessageId(
    providerMessageId: string,
    status: DeliveryStatus,
    lastError?: string
  ): Promise<void> {
    const delivery = this.deliveries.find((d) => d.providerMessageId === providerMessageId);
    if (delivery) {
      delivery.status = status;
      if (lastError !== undefined) {
        delivery.lastError = lastError;
      }
      delivery.updatedAt = new Date();
    }
  }
}
