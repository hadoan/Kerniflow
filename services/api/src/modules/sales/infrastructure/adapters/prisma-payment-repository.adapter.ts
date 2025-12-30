import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { SalesPaymentRepositoryPort } from "../../application/ports/payment-repository.port";
import type { SalesPayment } from "../../domain/sales.types";
import { toPrismaDate, fromPrismaDate } from "./date-mappers";

@Injectable()
export class PrismaSalesPaymentRepositoryAdapter implements SalesPaymentRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, paymentId: string): Promise<SalesPayment | null> {
    const data = await this.prisma.salesPayment.findFirst({
      where: { id: paymentId, tenantId },
    });
    if (!data) {
      return null;
    }
    return {
      id: data.id,
      invoiceId: data.invoiceId,
      amountCents: data.amountCents,
      currency: data.currency,
      paymentDate: fromPrismaDate(data.paymentDate)!,
      method: data.method as any,
      reference: data.reference ?? null,
      notes: data.notes ?? null,
      recordedAt: data.recordedAt,
      recordedByUserId: data.recordedByUserId ?? null,
      journalEntryId: data.journalEntryId ?? null,
    };
  }

  async listByInvoice(tenantId: string, invoiceId: string): Promise<SalesPayment[]> {
    const data = await this.prisma.salesPayment.findMany({
      where: { tenantId, invoiceId },
      orderBy: { recordedAt: "desc" },
    });
    return data.map((payment) => ({
      id: payment.id,
      invoiceId: payment.invoiceId,
      amountCents: payment.amountCents,
      currency: payment.currency,
      paymentDate: fromPrismaDate(payment.paymentDate)!,
      method: payment.method as any,
      reference: payment.reference ?? null,
      notes: payment.notes ?? null,
      recordedAt: payment.recordedAt,
      recordedByUserId: payment.recordedByUserId ?? null,
      journalEntryId: payment.journalEntryId ?? null,
    }));
  }

  async create(tenantId: string, payment: SalesPayment): Promise<void> {
    await this.prisma.salesPayment.create({
      data: {
        id: payment.id,
        tenantId,
        invoiceId: payment.invoiceId,
        amountCents: payment.amountCents,
        currency: payment.currency,
        paymentDate: toPrismaDate(payment.paymentDate),
        method: payment.method as any,
        reference: payment.reference,
        notes: payment.notes,
        recordedAt: payment.recordedAt,
        recordedByUserId: payment.recordedByUserId,
        journalEntryId: payment.journalEntryId,
      },
    });
  }

  async delete(tenantId: string, paymentId: string): Promise<void> {
    await this.prisma.salesPayment.deleteMany({
      where: { tenantId, id: paymentId },
    });
  }
}
