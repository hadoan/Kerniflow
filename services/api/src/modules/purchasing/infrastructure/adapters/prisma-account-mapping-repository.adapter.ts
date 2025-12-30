import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { PurchasingAccountMappingRepositoryPort } from "../../application/ports/account-mapping-repository.port";
import type { PurchasingAccountMapping } from "../../domain/purchasing.types";

@Injectable()
export class PrismaPurchasingAccountMappingRepository implements PurchasingAccountMappingRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findBySupplierCategory(
    tenantId: string,
    supplierPartyId: string,
    categoryKey: string
  ): Promise<PurchasingAccountMapping | null> {
    const data = await this.prisma.purchasingAccountMapping.findFirst({
      where: { tenantId, supplierPartyId, categoryKey },
    });
    return data
      ? {
          id: data.id,
          tenantId: data.tenantId,
          supplierPartyId: data.supplierPartyId,
          categoryKey: data.categoryKey,
          glAccountId: data.glAccountId,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        }
      : null;
  }

  async list(tenantId: string, supplierPartyId?: string): Promise<PurchasingAccountMapping[]> {
    const data = await this.prisma.purchasingAccountMapping.findMany({
      where: { tenantId, ...(supplierPartyId ? { supplierPartyId } : {}) },
      orderBy: { updatedAt: "desc" },
    });
    return data.map((row) => ({
      id: row.id,
      tenantId: row.tenantId,
      supplierPartyId: row.supplierPartyId,
      categoryKey: row.categoryKey,
      glAccountId: row.glAccountId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async upsert(mapping: PurchasingAccountMapping): Promise<PurchasingAccountMapping> {
    const data = await this.prisma.purchasingAccountMapping.upsert({
      where: {
        tenantId_supplierPartyId_categoryKey: {
          tenantId: mapping.tenantId,
          supplierPartyId: mapping.supplierPartyId,
          categoryKey: mapping.categoryKey,
        },
      },
      update: {
        glAccountId: mapping.glAccountId,
        updatedAt: mapping.updatedAt,
      },
      create: {
        id: mapping.id,
        tenantId: mapping.tenantId,
        supplierPartyId: mapping.supplierPartyId,
        categoryKey: mapping.categoryKey,
        glAccountId: mapping.glAccountId,
        createdAt: mapping.createdAt,
        updatedAt: mapping.updatedAt,
      },
    });

    return {
      id: data.id,
      tenantId: data.tenantId,
      supplierPartyId: data.supplierPartyId,
      categoryKey: data.categoryKey,
      glAccountId: data.glAccountId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}
