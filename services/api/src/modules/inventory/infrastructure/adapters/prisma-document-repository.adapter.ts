import { Injectable } from "@nestjs/common";
import { PrismaService } from "@kerniflow/data";
import type {
  InventoryDocumentRepositoryPort,
  ListDocumentsFilters,
  ListDocumentsResult,
} from "../../application/ports/document-repository.port";
import { InventoryDocumentAggregate } from "../../domain/inventory-document.aggregate";
import type { InventoryDocumentLine } from "../../domain/inventory.types";
import type { LocalDate } from "@kerniflow/kernel";

const toPrismaDate = (localDate: LocalDate | null | undefined): Date | null =>
  localDate ? new Date(`${localDate}T00:00:00.000Z`) : null;

const fromPrismaDate = (value: Date | null | undefined): LocalDate | null =>
  value ? (value.toISOString().slice(0, 10) as LocalDate) : null;

@Injectable()
export class PrismaInventoryDocumentRepository implements InventoryDocumentRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, document: InventoryDocumentAggregate): Promise<void> {
    await this.save(tenantId, document);
  }

  async save(tenantId: string, document: InventoryDocumentAggregate): Promise<void> {
    if (tenantId !== document.tenantId) {
      throw new Error("Tenant mismatch when saving document");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.inventoryDocument.upsert({
        where: { id: document.id },
        update: {
          documentType: document.documentType as any,
          documentNumber: document.documentNumber ?? null,
          status: document.status as any,
          reference: document.reference ?? null,
          scheduledDate: toPrismaDate(document.scheduledDate),
          postingDate: toPrismaDate(document.postingDate),
          notes: document.notes ?? null,
          partyId: document.partyId ?? null,
          sourceType: document.sourceType ?? null,
          sourceId: document.sourceId ?? null,
          confirmedAt: document.confirmedAt,
          postedAt: document.postedAt,
          canceledAt: document.canceledAt,
          updatedAt: document.updatedAt,
        },
        create: {
          id: document.id,
          tenantId: document.tenantId,
          documentType: document.documentType as any,
          documentNumber: document.documentNumber ?? null,
          status: document.status as any,
          reference: document.reference ?? null,
          scheduledDate: toPrismaDate(document.scheduledDate),
          postingDate: toPrismaDate(document.postingDate),
          notes: document.notes ?? null,
          partyId: document.partyId ?? null,
          sourceType: document.sourceType ?? null,
          sourceId: document.sourceId ?? null,
          confirmedAt: document.confirmedAt,
          postedAt: document.postedAt,
          canceledAt: document.canceledAt,
          createdAt: document.createdAt,
          updatedAt: document.updatedAt,
        },
      });

      await tx.inventoryDocumentLine.deleteMany({ where: { documentId: document.id } });
      if (document.lines.length) {
        await tx.inventoryDocumentLine.createMany({
          data: document.lines.map((line) => ({
            id: line.id,
            documentId: document.id,
            productId: line.productId,
            quantity: line.quantity,
            unitCostCents: line.unitCostCents ?? undefined,
            fromLocationId: line.fromLocationId ?? undefined,
            toLocationId: line.toLocationId ?? undefined,
            notes: line.notes ?? undefined,
            reservedQuantity: line.reservedQuantity ?? undefined,
          })),
        });
      }
    });
  }

  async findById(tenantId: string, documentId: string): Promise<InventoryDocumentAggregate | null> {
    const data = await this.prisma.inventoryDocument.findFirst({
      where: { tenantId, id: documentId },
      include: { lines: true },
    });
    if (!data) {
      return null;
    }

    const lines: InventoryDocumentLine[] = data.lines.map((line) => ({
      id: line.id,
      productId: line.productId,
      quantity: line.quantity,
      unitCostCents: line.unitCostCents ?? null,
      fromLocationId: line.fromLocationId ?? null,
      toLocationId: line.toLocationId ?? null,
      notes: line.notes ?? null,
      reservedQuantity: line.reservedQuantity ?? null,
    }));

    return new InventoryDocumentAggregate({
      id: data.id,
      tenantId: data.tenantId,
      documentType: data.documentType as any,
      documentNumber: data.documentNumber ?? null,
      status: data.status as any,
      reference: data.reference ?? null,
      scheduledDate: fromPrismaDate(data.scheduledDate),
      postingDate: fromPrismaDate(data.postingDate),
      notes: data.notes ?? null,
      partyId: data.partyId ?? null,
      sourceType: data.sourceType ?? null,
      sourceId: data.sourceId ?? null,
      lines,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      confirmedAt: data.confirmedAt ?? null,
      postedAt: data.postedAt ?? null,
      canceledAt: data.canceledAt ?? null,
    });
  }

  async list(tenantId: string, filters: ListDocumentsFilters): Promise<ListDocumentsResult> {
    const where: any = { tenantId };
    if (filters.type) {
      where.documentType = filters.type;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.partyId) {
      where.partyId = filters.partyId;
    }
    if (filters.search) {
      where.OR = [
        { documentNumber: { contains: filters.search, mode: "insensitive" } },
        { reference: { contains: filters.search, mode: "insensitive" } },
        { notes: { contains: filters.search, mode: "insensitive" } },
      ];
    }
    if (filters.fromDate || filters.toDate) {
      where.createdAt = {};
      if (filters.fromDate) {
        where.createdAt.gte = new Date(`${filters.fromDate}T00:00:00.000Z`);
      }
      if (filters.toDate) {
        where.createdAt.lte = new Date(`${filters.toDate}T23:59:59.999Z`);
      }
    }

    const take = filters.pageSize ?? 20;
    const results = await this.prisma.inventoryDocument.findMany({
      where,
      take,
      skip: filters.cursor ? 1 : 0,
      ...(filters.cursor ? { cursor: { id: filters.cursor } } : {}),
      orderBy: { createdAt: "desc" },
      include: { lines: true },
    });

    const items = results.map((row) => {
      const lines: InventoryDocumentLine[] = row.lines.map((line) => ({
        id: line.id,
        productId: line.productId,
        quantity: line.quantity,
        unitCostCents: line.unitCostCents ?? null,
        fromLocationId: line.fromLocationId ?? null,
        toLocationId: line.toLocationId ?? null,
        notes: line.notes ?? null,
        reservedQuantity: line.reservedQuantity ?? null,
      }));

      return new InventoryDocumentAggregate({
        id: row.id,
        tenantId: row.tenantId,
        documentType: row.documentType as any,
        documentNumber: row.documentNumber ?? null,
        status: row.status as any,
        reference: row.reference ?? null,
        scheduledDate: fromPrismaDate(row.scheduledDate),
        postingDate: fromPrismaDate(row.postingDate),
        notes: row.notes ?? null,
        partyId: row.partyId ?? null,
        sourceType: row.sourceType ?? null,
        sourceId: row.sourceId ?? null,
        lines,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        confirmedAt: row.confirmedAt ?? null,
        postedAt: row.postedAt ?? null,
        canceledAt: row.canceledAt ?? null,
      });
    });

    return {
      items,
      nextCursor: results.length === take ? (results[results.length - 1]?.id ?? null) : null,
    };
  }

  async isDocumentNumberTaken(tenantId: string, documentNumber: string): Promise<boolean> {
    const existing = await this.prisma.inventoryDocument.findFirst({
      where: { tenantId, documentNumber },
      select: { id: true },
    });
    return Boolean(existing);
  }
}
