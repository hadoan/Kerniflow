import type { SalesPayment } from "../../domain/sales.types";

export interface SalesPaymentRepositoryPort {
  findById(tenantId: string, paymentId: string): Promise<SalesPayment | null>;
  listByInvoice(tenantId: string, invoiceId: string): Promise<SalesPayment[]>;
  create(tenantId: string, payment: SalesPayment): Promise<void>;
  delete(tenantId: string, paymentId: string): Promise<void>;
}

export const SALES_PAYMENT_REPOSITORY_PORT = Symbol("SALES_PAYMENT_REPOSITORY_PORT");
