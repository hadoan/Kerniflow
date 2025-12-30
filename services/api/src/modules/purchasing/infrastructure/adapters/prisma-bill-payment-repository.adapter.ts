import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { BillPaymentRepositoryPort } from "../../application/ports/bill-payment-repository.port";
import type { BillPayment } from "../../domain/purchasing.types";
import type { LocalDate } from "@corely/kernel";

const toPrismaDate = (localDate: LocalDate): Date => new Date(`${localDate}T00:00:00.000Z`);
const fromPrismaDate = (value: Date): LocalDate => value.toISOString().slice(0, 10) as LocalDate;

@Injectable()
export class PrismaBillPaymentRepository implements BillPaymentRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, paymentId: string): Promise<BillPayment | null> {
    const data = await this.prisma.billPayment.findFirst({ where: { id: paymentId, tenantId } });
    if (!data) {
      return null;
    }
    return {
      id: data.id,
      vendorBillId: data.vendorBillId,
      amountCents: data.amountCents,
      currency: data.currency,
      paymentDate: fromPrismaDate(data.paymentDate),
      method: data.method as any,
      reference: data.reference ?? null,
      notes: data.notes ?? null,
      recordedAt: data.recordedAt,
      recordedByUserId: data.recordedByUserId ?? null,
      journalEntryId: data.journalEntryId ?? null,
    };
  }

  async listByBill(tenantId: string, vendorBillId: string): Promise<BillPayment[]> {
    const data = await this.prisma.billPayment.findMany({
      where: { tenantId, vendorBillId },
      orderBy: { recordedAt: "desc" },
    });
    return data.map((payment) => ({
      id: payment.id,
      vendorBillId: payment.vendorBillId,
      amountCents: payment.amountCents,
      currency: payment.currency,
      paymentDate: fromPrismaDate(payment.paymentDate),
      method: payment.method as any,
      reference: payment.reference ?? null,
      notes: payment.notes ?? null,
      recordedAt: payment.recordedAt,
      recordedByUserId: payment.recordedByUserId ?? null,
      journalEntryId: payment.journalEntryId ?? null,
    }));
  }

  async create(tenantId: string, payment: BillPayment): Promise<void> {
    await this.prisma.billPayment.create({
      data: {
        id: payment.id,
        tenantId,
        vendorBillId: payment.vendorBillId,
        amountCents: payment.amountCents,
        currency: payment.currency,
        paymentDate: toPrismaDate(payment.paymentDate),
        method: payment.method as any,
        reference: payment.reference ?? undefined,
        notes: payment.notes ?? undefined,
        recordedAt: payment.recordedAt,
        recordedByUserId: payment.recordedByUserId ?? undefined,
        journalEntryId: payment.journalEntryId ?? undefined,
      },
    });
  }
}
