import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import {
  InvoiceEmailDeliveryRepoPort,
  InvoiceEmailDelivery,
  DeliveryStatus,
} from "../../application/ports/invoice-email-delivery-repository.port";

@Injectable()
export class PrismaInvoiceEmailDeliveryRepoAdapter implements InvoiceEmailDeliveryRepoPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByIdempotencyKey(
    tenantId: string,
    idempotencyKey: string
  ): Promise<InvoiceEmailDelivery | null> {
    const record = await this.prisma.invoiceEmailDelivery.findUnique({
      where: {
        tenantId_idempotencyKey: {
          tenantId,
          idempotencyKey,
        },
      },
    });

    return record
      ? {
          id: record.id,
          tenantId: record.tenantId,
          invoiceId: record.invoiceId,
          to: record.to,
          status: record.status as DeliveryStatus,
          provider: record.provider,
          providerMessageId: record.providerMessageId ?? undefined,
          idempotencyKey: record.idempotencyKey,
          lastError: record.lastError ?? undefined,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        }
      : null;
  }

  async findById(tenantId: string, deliveryId: string): Promise<InvoiceEmailDelivery | null> {
    const record = await this.prisma.invoiceEmailDelivery.findFirst({
      where: {
        id: deliveryId,
        tenantId,
      },
    });

    return record
      ? {
          id: record.id,
          tenantId: record.tenantId,
          invoiceId: record.invoiceId,
          to: record.to,
          status: record.status as DeliveryStatus,
          provider: record.provider,
          providerMessageId: record.providerMessageId ?? undefined,
          idempotencyKey: record.idempotencyKey,
          lastError: record.lastError ?? undefined,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        }
      : null;
  }

  async findByProviderMessageId(providerMessageId: string): Promise<InvoiceEmailDelivery | null> {
    const record = await this.prisma.invoiceEmailDelivery.findFirst({
      where: { providerMessageId },
    });

    return record
      ? {
          id: record.id,
          tenantId: record.tenantId,
          invoiceId: record.invoiceId,
          to: record.to,
          status: record.status as DeliveryStatus,
          provider: record.provider,
          providerMessageId: record.providerMessageId ?? undefined,
          idempotencyKey: record.idempotencyKey,
          lastError: record.lastError ?? undefined,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        }
      : null;
  }

  async create(
    delivery: Omit<InvoiceEmailDelivery, "createdAt" | "updatedAt">
  ): Promise<InvoiceEmailDelivery> {
    const record = await this.prisma.invoiceEmailDelivery.create({
      data: {
        id: delivery.id,
        tenantId: delivery.tenantId,
        invoiceId: delivery.invoiceId,
        to: delivery.to,
        status: delivery.status,
        provider: delivery.provider,
        providerMessageId: delivery.providerMessageId ?? null,
        idempotencyKey: delivery.idempotencyKey,
        lastError: delivery.lastError ?? null,
      },
    });

    return {
      id: record.id,
      tenantId: record.tenantId,
      invoiceId: record.invoiceId,
      to: record.to,
      status: record.status as DeliveryStatus,
      provider: record.provider,
      providerMessageId: record.providerMessageId ?? undefined,
      idempotencyKey: record.idempotencyKey,
      lastError: record.lastError ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async updateStatus(
    tenantId: string,
    deliveryId: string,
    status: DeliveryStatus,
    providerMessageId?: string,
    lastError?: string
  ): Promise<void> {
    await this.prisma.invoiceEmailDelivery.updateMany({
      where: {
        id: deliveryId,
        tenantId,
      },
      data: {
        status,
        providerMessageId: providerMessageId ?? undefined,
        lastError: lastError ?? undefined,
      },
    });
  }

  async updateStatusByProviderMessageId(
    providerMessageId: string,
    status: DeliveryStatus,
    lastError?: string
  ): Promise<void> {
    await this.prisma.invoiceEmailDelivery.updateMany({
      where: { providerMessageId },
      data: {
        status,
        lastError: lastError ?? undefined,
      },
    });
  }
}
