import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type {
  VendorBillRepositoryPort,
  ListVendorBillsResult,
  ListVendorBillsFilters,
} from "../../application/ports/vendor-bill-repository.port";
import { VendorBillAggregate } from "../../domain/vendor-bill.aggregate";
import type { VendorBillLineItem, BillPayment } from "../../domain/purchasing.types";
import type { LocalDate } from "@corely/kernel";

const toPrismaDate = (localDate: LocalDate | null): Date | null =>
  localDate ? new Date(`${localDate}T00:00:00.000Z`) : null;

const fromPrismaDate = (value: Date | null | undefined): LocalDate | null =>
  value ? (value.toISOString().slice(0, 10) as LocalDate) : null;

@Injectable()
export class PrismaVendorBillRepository implements VendorBillRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, vendorBill: VendorBillAggregate): Promise<void> {
    await this.save(tenantId, vendorBill);
  }

  async save(tenantId: string, vendorBill: VendorBillAggregate): Promise<void> {
    if (tenantId !== vendorBill.tenantId) {
      throw new Error("Tenant mismatch when saving vendor bill");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.vendorBill.upsert({
        where: { id: vendorBill.id },
        update: {
          billNumber: vendorBill.billNumber,
          internalBillRef: vendorBill.internalBillRef,
          status: vendorBill.status as any,
          supplierPartyId: vendorBill.supplierPartyId,
          supplierContactPartyId: vendorBill.supplierContactPartyId,
          billDate: toPrismaDate(vendorBill.billDate),
          dueDate: toPrismaDate(vendorBill.dueDate),
          currency: vendorBill.currency,
          paymentTerms: vendorBill.paymentTerms,
          notes: vendorBill.notes,
          subtotalCents: vendorBill.totals.subtotalCents,
          taxCents: vendorBill.totals.taxCents,
          totalCents: vendorBill.totals.totalCents,
          paidCents: vendorBill.totals.paidCents,
          dueCents: vendorBill.totals.dueCents,
          approvedAt: vendorBill.approvedAt,
          postedAt: vendorBill.postedAt,
          voidedAt: vendorBill.voidedAt,
          purchaseOrderId: vendorBill.purchaseOrderId,
          postedJournalEntryId: vendorBill.postedJournalEntryId,
          possibleDuplicateOfBillId: vendorBill.possibleDuplicateOfBillId,
          duplicateScore: vendorBill.duplicateScore,
          updatedAt: vendorBill.updatedAt,
        },
        create: {
          id: vendorBill.id,
          tenantId: vendorBill.tenantId,
          billNumber: vendorBill.billNumber,
          internalBillRef: vendorBill.internalBillRef,
          status: vendorBill.status as any,
          supplierPartyId: vendorBill.supplierPartyId,
          supplierContactPartyId: vendorBill.supplierContactPartyId,
          billDate: toPrismaDate(vendorBill.billDate)!,
          dueDate: toPrismaDate(vendorBill.dueDate)!,
          currency: vendorBill.currency,
          paymentTerms: vendorBill.paymentTerms,
          notes: vendorBill.notes,
          subtotalCents: vendorBill.totals.subtotalCents,
          taxCents: vendorBill.totals.taxCents,
          totalCents: vendorBill.totals.totalCents,
          paidCents: vendorBill.totals.paidCents,
          dueCents: vendorBill.totals.dueCents,
          approvedAt: vendorBill.approvedAt,
          postedAt: vendorBill.postedAt,
          voidedAt: vendorBill.voidedAt,
          purchaseOrderId: vendorBill.purchaseOrderId,
          postedJournalEntryId: vendorBill.postedJournalEntryId,
          possibleDuplicateOfBillId: vendorBill.possibleDuplicateOfBillId,
          duplicateScore: vendorBill.duplicateScore,
          createdAt: vendorBill.createdAt,
          updatedAt: vendorBill.updatedAt,
        },
      });

      await tx.vendorBillLine.deleteMany({ where: { vendorBillId: vendorBill.id } });
      if (vendorBill.lineItems.length) {
        await tx.vendorBillLine.createMany({
          data: vendorBill.lineItems.map((line) => ({
            id: line.id,
            vendorBillId: vendorBill.id,
            description: line.description,
            quantity: line.quantity,
            unitCostCents: line.unitCostCents,
            category: line.category,
            glAccountId: line.glAccountId,
            taxCode: line.taxCode,
            sortOrder: line.sortOrder,
          })),
        });
      }
    });
  }

  async findById(tenantId: string, vendorBillId: string): Promise<VendorBillAggregate | null> {
    const data = await this.prisma.vendorBill.findFirst({
      where: { id: vendorBillId, tenantId },
      include: { lines: true, payments: true },
    });
    if (!data) {
      return null;
    }

    const lineItems: VendorBillLineItem[] = data.lines.map((line) => ({
      id: line.id,
      description: line.description,
      quantity: line.quantity,
      unitCostCents: line.unitCostCents,
      category: line.category ?? undefined,
      glAccountId: line.glAccountId ?? undefined,
      taxCode: line.taxCode ?? undefined,
      sortOrder: line.sortOrder ?? undefined,
    }));

    const payments: BillPayment[] = data.payments.map((payment) => ({
      id: payment.id,
      vendorBillId: payment.vendorBillId,
      amountCents: payment.amountCents,
      currency: payment.currency,
      paymentDate: fromPrismaDate(payment.paymentDate) as LocalDate,
      method: payment.method as any,
      reference: payment.reference ?? null,
      notes: payment.notes ?? null,
      recordedAt: payment.recordedAt,
      recordedByUserId: payment.recordedByUserId ?? null,
      journalEntryId: payment.journalEntryId ?? null,
    }));

    return new VendorBillAggregate({
      id: data.id,
      tenantId: data.tenantId,
      billNumber: data.billNumber ?? null,
      internalBillRef: data.internalBillRef ?? null,
      status: data.status as any,
      supplierPartyId: data.supplierPartyId,
      supplierContactPartyId: data.supplierContactPartyId ?? null,
      billDate: fromPrismaDate(data.billDate) as LocalDate,
      dueDate: fromPrismaDate(data.dueDate) as LocalDate,
      currency: data.currency,
      paymentTerms: data.paymentTerms ?? null,
      notes: data.notes ?? null,
      lineItems,
      totals: {
        subtotalCents: data.subtotalCents,
        taxCents: data.taxCents,
        totalCents: data.totalCents,
        paidCents: data.paidCents,
        dueCents: data.dueCents,
      },
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      approvedAt: data.approvedAt ?? null,
      postedAt: data.postedAt ?? null,
      voidedAt: data.voidedAt ?? null,
      purchaseOrderId: data.purchaseOrderId ?? null,
      postedJournalEntryId: data.postedJournalEntryId ?? null,
      possibleDuplicateOfBillId: data.possibleDuplicateOfBillId ?? null,
      duplicateScore: data.duplicateScore ?? null,
      payments,
    });
  }

  async list(tenantId: string, filters: ListVendorBillsFilters): Promise<ListVendorBillsResult> {
    const where: any = { tenantId };
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.supplierPartyId) {
      where.supplierPartyId = filters.supplierPartyId;
    }
    if (filters.search) {
      where.OR = [
        { billNumber: { contains: filters.search, mode: "insensitive" } },
        { notes: { contains: filters.search, mode: "insensitive" } },
      ];
    }
    if (filters.fromDate || filters.toDate) {
      where.billDate = {};
      if (filters.fromDate) {
        where.billDate.gte = new Date(`${filters.fromDate}T00:00:00.000Z`);
      }
      if (filters.toDate) {
        where.billDate.lte = new Date(`${filters.toDate}T23:59:59.999Z`);
      }
    }
    if (filters.dueFromDate || filters.dueToDate) {
      where.dueDate = {};
      if (filters.dueFromDate) {
        where.dueDate.gte = new Date(`${filters.dueFromDate}T00:00:00.000Z`);
      }
      if (filters.dueToDate) {
        where.dueDate.lte = new Date(`${filters.dueToDate}T23:59:59.999Z`);
      }
    }

    const take = filters.pageSize ?? 20;
    const results = await this.prisma.vendorBill.findMany({
      where,
      take,
      skip: filters.cursor ? 1 : 0,
      ...(filters.cursor ? { cursor: { id: filters.cursor } } : {}),
      orderBy: { createdAt: "desc" },
      include: { lines: true },
    });

    const items = results.map((row) => {
      const lineItems: VendorBillLineItem[] = row.lines.map((line) => ({
        id: line.id,
        description: line.description,
        quantity: line.quantity,
        unitCostCents: line.unitCostCents,
        category: line.category ?? undefined,
        glAccountId: line.glAccountId ?? undefined,
        taxCode: line.taxCode ?? undefined,
        sortOrder: line.sortOrder ?? undefined,
      }));

      return new VendorBillAggregate({
        id: row.id,
        tenantId: row.tenantId,
        billNumber: row.billNumber ?? null,
        internalBillRef: row.internalBillRef ?? null,
        status: row.status as any,
        supplierPartyId: row.supplierPartyId,
        supplierContactPartyId: row.supplierContactPartyId ?? null,
        billDate: fromPrismaDate(row.billDate) as LocalDate,
        dueDate: fromPrismaDate(row.dueDate) as LocalDate,
        currency: row.currency,
        paymentTerms: row.paymentTerms ?? null,
        notes: row.notes ?? null,
        lineItems,
        totals: {
          subtotalCents: row.subtotalCents,
          taxCents: row.taxCents,
          totalCents: row.totalCents,
          paidCents: row.paidCents,
          dueCents: row.dueCents,
        },
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        approvedAt: row.approvedAt ?? null,
        postedAt: row.postedAt ?? null,
        voidedAt: row.voidedAt ?? null,
        purchaseOrderId: row.purchaseOrderId ?? null,
        postedJournalEntryId: row.postedJournalEntryId ?? null,
        possibleDuplicateOfBillId: row.possibleDuplicateOfBillId ?? null,
        duplicateScore: row.duplicateScore ?? null,
      });
    });

    const nextCursor = results.length === take ? results[results.length - 1]?.id : null;
    return { items, nextCursor };
  }

  async findBySupplierBillNumber(
    tenantId: string,
    supplierPartyId: string,
    billNumber: string
  ): Promise<VendorBillAggregate | null> {
    const data = await this.prisma.vendorBill.findFirst({
      where: { tenantId, supplierPartyId, billNumber },
    });
    if (!data) {
      return null;
    }
    return new VendorBillAggregate({
      id: data.id,
      tenantId: data.tenantId,
      billNumber: data.billNumber ?? null,
      internalBillRef: data.internalBillRef ?? null,
      status: data.status as any,
      supplierPartyId: data.supplierPartyId,
      supplierContactPartyId: data.supplierContactPartyId ?? null,
      billDate: fromPrismaDate(data.billDate) as LocalDate,
      dueDate: fromPrismaDate(data.dueDate) as LocalDate,
      currency: data.currency,
      paymentTerms: data.paymentTerms ?? null,
      notes: data.notes ?? null,
      lineItems: [],
      totals: {
        subtotalCents: data.subtotalCents,
        taxCents: data.taxCents,
        totalCents: data.totalCents,
        paidCents: data.paidCents,
        dueCents: data.dueCents,
      },
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      approvedAt: data.approvedAt ?? null,
      postedAt: data.postedAt ?? null,
      voidedAt: data.voidedAt ?? null,
      purchaseOrderId: data.purchaseOrderId ?? null,
      postedJournalEntryId: data.postedJournalEntryId ?? null,
      possibleDuplicateOfBillId: data.possibleDuplicateOfBillId ?? null,
      duplicateScore: data.duplicateScore ?? null,
    });
  }
}
