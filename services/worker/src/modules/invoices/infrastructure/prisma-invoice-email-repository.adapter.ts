import { Injectable } from "@nestjs/common";
import type { PrismaService } from "@corely/data";

@Injectable()
export class PrismaInvoiceEmailRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findDelivery(deliveryId: string) {
    return this.prisma.invoiceEmailDelivery.findUnique({ where: { id: deliveryId } });
  }

  async findInvoiceWithLines(tenantId: string, invoiceId: string) {
    return this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        tenantId,
      },
      include: {
        lines: true,
      },
    });
  }

  async markDeliverySent(params: {
    deliveryId: string;
    provider: string;
    providerMessageId?: string | null;
  }) {
    return this.prisma.invoiceEmailDelivery.update({
      where: { id: params.deliveryId },
      data: {
        status: "SENT",
        provider: params.provider,
        providerMessageId: params.providerMessageId ?? null,
      },
    });
  }

  async markDeliveryFailed(params: { deliveryId: string; error: string }) {
    return this.prisma.invoiceEmailDelivery.update({
      where: { id: params.deliveryId },
      data: {
        status: "FAILED",
        lastError: params.error,
      },
    });
  }
}
