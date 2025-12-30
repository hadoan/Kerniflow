import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type {
  WarehouseRepositoryPort,
  InventoryWarehouse,
  ListWarehousesFilters,
  ListWarehousesResult,
} from "../../application/ports/warehouse-repository.port";

@Injectable()
export class PrismaWarehouseRepository implements WarehouseRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(_tenantId: string, warehouse: InventoryWarehouse): Promise<void> {
    await this.prisma.inventoryWarehouse.create({
      data: {
        id: warehouse.id,
        tenantId: warehouse.tenantId,
        name: warehouse.name,
        isDefault: warehouse.isDefault,
        address: warehouse.address ?? undefined,
        createdAt: warehouse.createdAt,
        updatedAt: warehouse.updatedAt,
      },
    });
  }

  async save(_tenantId: string, warehouse: InventoryWarehouse): Promise<void> {
    await this.prisma.inventoryWarehouse.update({
      where: { id: warehouse.id },
      data: {
        name: warehouse.name,
        isDefault: warehouse.isDefault,
        address: warehouse.address ?? undefined,
        updatedAt: warehouse.updatedAt,
      },
    });
  }

  async findById(tenantId: string, warehouseId: string): Promise<InventoryWarehouse | null> {
    const data = await this.prisma.inventoryWarehouse.findFirst({
      where: { id: warehouseId, tenantId },
    });
    if (!data) {
      return null;
    }
    return {
      id: data.id,
      tenantId: data.tenantId,
      name: data.name,
      isDefault: data.isDefault,
      address: data.address ?? null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  async findDefault(tenantId: string): Promise<InventoryWarehouse | null> {
    const data = await this.prisma.inventoryWarehouse.findFirst({
      where: { tenantId, isDefault: true },
      orderBy: { createdAt: "asc" },
    });
    if (!data) {
      return null;
    }
    return {
      id: data.id,
      tenantId: data.tenantId,
      name: data.name,
      isDefault: data.isDefault,
      address: data.address ?? null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  async list(tenantId: string, filters: ListWarehousesFilters): Promise<ListWarehousesResult> {
    const take = filters.pageSize ?? 20;
    const results = await this.prisma.inventoryWarehouse.findMany({
      where: { tenantId },
      take,
      skip: filters.cursor ? 1 : 0,
      ...(filters.cursor ? { cursor: { id: filters.cursor } } : {}),
      orderBy: { createdAt: "desc" },
    });

    return {
      items: results.map((data) => ({
        id: data.id,
        tenantId: data.tenantId,
        name: data.name,
        isDefault: data.isDefault,
        address: data.address ?? null,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      })),
      nextCursor: results.length === take ? (results[results.length - 1]?.id ?? null) : null,
    };
  }
}
