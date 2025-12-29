import { Injectable } from "@nestjs/common";
import { PrismaService } from "@kerniflow/data";
import type {
  ReorderPolicyRepositoryPort,
  ReorderPolicy,
} from "../../application/ports/reorder-policy-repository.port";

@Injectable()
export class PrismaReorderPolicyRepository implements ReorderPolicyRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(_tenantId: string, policy: ReorderPolicy): Promise<void> {
    await this.prisma.reorderPolicy.create({
      data: {
        id: policy.id,
        tenantId: policy.tenantId,
        productId: policy.productId,
        warehouseId: policy.warehouseId,
        minQty: policy.minQty,
        maxQty: policy.maxQty ?? undefined,
        reorderPoint: policy.reorderPoint ?? undefined,
        preferredSupplierPartyId: policy.preferredSupplierPartyId ?? undefined,
        leadTimeDays: policy.leadTimeDays ?? undefined,
        isActive: policy.isActive,
        createdAt: policy.createdAt,
        updatedAt: policy.updatedAt,
      },
    });
  }

  async save(_tenantId: string, policy: ReorderPolicy): Promise<void> {
    await this.prisma.reorderPolicy.update({
      where: { id: policy.id },
      data: {
        minQty: policy.minQty,
        maxQty: policy.maxQty ?? undefined,
        reorderPoint: policy.reorderPoint ?? undefined,
        preferredSupplierPartyId: policy.preferredSupplierPartyId ?? undefined,
        leadTimeDays: policy.leadTimeDays ?? undefined,
        isActive: policy.isActive,
        updatedAt: policy.updatedAt,
      },
    });
  }

  async findById(tenantId: string, policyId: string): Promise<ReorderPolicy | null> {
    const data = await this.prisma.reorderPolicy.findFirst({ where: { id: policyId, tenantId } });
    if (!data) {
      return null;
    }
    return {
      id: data.id,
      tenantId: data.tenantId,
      productId: data.productId,
      warehouseId: data.warehouseId,
      minQty: data.minQty,
      maxQty: data.maxQty ?? null,
      reorderPoint: data.reorderPoint ?? null,
      preferredSupplierPartyId: data.preferredSupplierPartyId ?? null,
      leadTimeDays: data.leadTimeDays ?? null,
      isActive: data.isActive,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  async findByProductWarehouse(
    tenantId: string,
    productId: string,
    warehouseId: string
  ): Promise<ReorderPolicy | null> {
    const data = await this.prisma.reorderPolicy.findFirst({
      where: { tenantId, productId, warehouseId },
    });
    if (!data) {
      return null;
    }
    return {
      id: data.id,
      tenantId: data.tenantId,
      productId: data.productId,
      warehouseId: data.warehouseId,
      minQty: data.minQty,
      maxQty: data.maxQty ?? null,
      reorderPoint: data.reorderPoint ?? null,
      preferredSupplierPartyId: data.preferredSupplierPartyId ?? null,
      leadTimeDays: data.leadTimeDays ?? null,
      isActive: data.isActive,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  async list(
    tenantId: string,
    filters: { productId?: string; warehouseId?: string }
  ): Promise<ReorderPolicy[]> {
    const where: any = { tenantId };
    if (filters.productId) {
      where.productId = filters.productId;
    }
    if (filters.warehouseId) {
      where.warehouseId = filters.warehouseId;
    }
    const results = await this.prisma.reorderPolicy.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return results.map((data) => ({
      id: data.id,
      tenantId: data.tenantId,
      productId: data.productId,
      warehouseId: data.warehouseId,
      minQty: data.minQty,
      maxQty: data.maxQty ?? null,
      reorderPoint: data.reorderPoint ?? null,
      preferredSupplierPartyId: data.preferredSupplierPartyId ?? null,
      leadTimeDays: data.leadTimeDays ?? null,
      isActive: data.isActive,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    }));
  }
}
