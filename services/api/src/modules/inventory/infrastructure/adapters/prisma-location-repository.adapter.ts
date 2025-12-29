import { Injectable } from "@nestjs/common";
import { PrismaService } from "@kerniflow/data";
import type {
  LocationRepositoryPort,
  InventoryLocation,
} from "../../application/ports/location-repository.port";
import type { LocationType } from "../../domain/inventory.types";

@Injectable()
export class PrismaLocationRepository implements LocationRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(_tenantId: string, location: InventoryLocation): Promise<void> {
    await this.prisma.inventoryLocation.create({
      data: {
        id: location.id,
        tenantId: location.tenantId,
        warehouseId: location.warehouseId,
        name: location.name,
        locationType: location.locationType as any,
        isActive: location.isActive,
        createdAt: location.createdAt,
        updatedAt: location.updatedAt,
      },
    });
  }

  async save(_tenantId: string, location: InventoryLocation): Promise<void> {
    await this.prisma.inventoryLocation.update({
      where: { id: location.id },
      data: {
        name: location.name,
        locationType: location.locationType as any,
        isActive: location.isActive,
        updatedAt: location.updatedAt,
      },
    });
  }

  async findById(tenantId: string, locationId: string): Promise<InventoryLocation | null> {
    const data = await this.prisma.inventoryLocation.findFirst({
      where: { id: locationId, tenantId },
    });
    if (!data) {
      return null;
    }
    return {
      id: data.id,
      tenantId: data.tenantId,
      warehouseId: data.warehouseId,
      name: data.name,
      locationType: data.locationType as any,
      isActive: data.isActive,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  async listByWarehouse(tenantId: string, warehouseId: string): Promise<InventoryLocation[]> {
    const results = await this.prisma.inventoryLocation.findMany({
      where: { tenantId, warehouseId },
      orderBy: { createdAt: "asc" },
    });

    return results.map((data) => ({
      id: data.id,
      tenantId: data.tenantId,
      warehouseId: data.warehouseId,
      name: data.name,
      locationType: data.locationType as any,
      isActive: data.isActive,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    }));
  }

  async findByWarehouseType(
    tenantId: string,
    warehouseId: string,
    locationType: LocationType
  ): Promise<InventoryLocation | null> {
    const data = await this.prisma.inventoryLocation.findFirst({
      where: { tenantId, warehouseId, locationType: locationType as any },
      orderBy: { createdAt: "asc" },
    });
    if (!data) {
      return null;
    }
    return {
      id: data.id,
      tenantId: data.tenantId,
      warehouseId: data.warehouseId,
      name: data.name,
      locationType: data.locationType as any,
      isActive: data.isActive,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}
