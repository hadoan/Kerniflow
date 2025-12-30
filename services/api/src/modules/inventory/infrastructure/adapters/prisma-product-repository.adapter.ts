import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type {
  ProductRepositoryPort,
  InventoryProduct,
  ListProductsFilters,
  ListProductsResult,
} from "../../application/ports/product-repository.port";

@Injectable()
export class PrismaProductRepository implements ProductRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(_tenantId: string, product: InventoryProduct): Promise<void> {
    await this.prisma.inventoryProduct.create({
      data: {
        id: product.id,
        tenantId: product.tenantId,
        sku: product.sku,
        name: product.name,
        productType: product.productType as any,
        unitOfMeasure: product.unitOfMeasure,
        barcode: product.barcode ?? undefined,
        defaultSalesPriceCents: product.defaultSalesPriceCents ?? undefined,
        defaultPurchaseCostCents: product.defaultPurchaseCostCents ?? undefined,
        isActive: product.isActive,
        tags: product.tags,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      },
    });
  }

  async save(_tenantId: string, product: InventoryProduct): Promise<void> {
    await this.prisma.inventoryProduct.update({
      where: { id: product.id },
      data: {
        sku: product.sku,
        name: product.name,
        productType: product.productType as any,
        unitOfMeasure: product.unitOfMeasure,
        barcode: product.barcode ?? undefined,
        defaultSalesPriceCents: product.defaultSalesPriceCents ?? undefined,
        defaultPurchaseCostCents: product.defaultPurchaseCostCents ?? undefined,
        isActive: product.isActive,
        tags: product.tags,
        updatedAt: product.updatedAt,
      },
    });
  }

  async findById(tenantId: string, productId: string): Promise<InventoryProduct | null> {
    const data = await this.prisma.inventoryProduct.findFirst({
      where: { id: productId, tenantId },
    });
    if (!data) {
      return null;
    }
    return {
      id: data.id,
      tenantId: data.tenantId,
      sku: data.sku,
      name: data.name,
      productType: data.productType as any,
      unitOfMeasure: data.unitOfMeasure,
      barcode: data.barcode ?? null,
      defaultSalesPriceCents: data.defaultSalesPriceCents ?? null,
      defaultPurchaseCostCents: data.defaultPurchaseCostCents ?? null,
      isActive: data.isActive,
      tags: data.tags ?? [],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  async findBySku(tenantId: string, sku: string): Promise<InventoryProduct | null> {
    const data = await this.prisma.inventoryProduct.findFirst({ where: { tenantId, sku } });
    if (!data) {
      return null;
    }
    return {
      id: data.id,
      tenantId: data.tenantId,
      sku: data.sku,
      name: data.name,
      productType: data.productType as any,
      unitOfMeasure: data.unitOfMeasure,
      barcode: data.barcode ?? null,
      defaultSalesPriceCents: data.defaultSalesPriceCents ?? null,
      defaultPurchaseCostCents: data.defaultPurchaseCostCents ?? null,
      isActive: data.isActive,
      tags: data.tags ?? [],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  async list(tenantId: string, filters: ListProductsFilters): Promise<ListProductsResult> {
    const where: any = { tenantId };
    if (filters.type) {
      where.productType = filters.type;
    }
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    if (filters.search) {
      where.OR = [
        { sku: { contains: filters.search, mode: "insensitive" } },
        { name: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const take = filters.pageSize ?? 20;
    const results = await this.prisma.inventoryProduct.findMany({
      where,
      take,
      skip: filters.cursor ? 1 : 0,
      ...(filters.cursor ? { cursor: { id: filters.cursor } } : {}),
      orderBy: { createdAt: "desc" },
    });

    return {
      items: results.map((data) => ({
        id: data.id,
        tenantId: data.tenantId,
        sku: data.sku,
        name: data.name,
        productType: data.productType as any,
        unitOfMeasure: data.unitOfMeasure,
        barcode: data.barcode ?? null,
        defaultSalesPriceCents: data.defaultSalesPriceCents ?? null,
        defaultPurchaseCostCents: data.defaultPurchaseCostCents ?? null,
        isActive: data.isActive,
        tags: data.tags ?? [],
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      })),
      nextCursor: results.length === take ? (results[results.length - 1]?.id ?? null) : null,
    };
  }
}
