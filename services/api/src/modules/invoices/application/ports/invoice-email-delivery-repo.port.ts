export type DeliveryStatus = "QUEUED" | "SENT" | "DELIVERED" | "BOUNCED" | "FAILED" | "DELAYED";

export type InvoiceEmailDelivery = {
  id: string;
  tenantId: string;
  invoiceId: string;
  to: string;
  status: DeliveryStatus;
  provider: string;
  providerMessageId?: string;
  idempotencyKey: string;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
};

export interface InvoiceEmailDeliveryRepoPort {
  findByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string
  ): Promise<InvoiceEmailDelivery | null>;

  findById(tenantId: string, deliveryId: string): Promise<InvoiceEmailDelivery | null>;

  findByProviderMessageId(providerMessageId: string): Promise<InvoiceEmailDelivery | null>;

  create(
    delivery: Omit<InvoiceEmailDelivery, "createdAt" | "updatedAt">
  ): Promise<InvoiceEmailDelivery>;

  updateStatus(
    tenantId: string,
    deliveryId: string,
    status: DeliveryStatus,
    providerMessageId?: string,
    lastError?: string
  ): Promise<void>;

  updateStatusByProviderMessageId(
    providerMessageId: string,
    status: DeliveryStatus,
    lastError?: string
  ): Promise<void>;
}
