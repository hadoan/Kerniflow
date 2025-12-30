import { Injectable } from "@nestjs/common";
import type { CustomEntityType } from "@corely/contracts";
import type { EntityLayout, EntityLayoutPort } from "@corely/domain";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class EntityLayoutRepository implements EntityLayoutPort {
  constructor(private readonly prisma: PrismaService) {}

  async get(tenantId: string, entityType: CustomEntityType): Promise<EntityLayout | null> {
    const layout = await this.prisma.entityLayout.findUnique({
      where: {
        tenantId_entityType: { tenantId, entityType },
      },
    });
    return layout ? toDomain(layout) : null;
  }

  async upsert(layout: EntityLayout): Promise<EntityLayout> {
    const saved = await this.prisma.entityLayout.upsert({
      where: {
        tenantId_entityType: { tenantId: layout.tenantId, entityType: layout.entityType },
      },
      create: {
        id: layout.id,
        tenantId: layout.tenantId,
        entityType: layout.entityType,
        layout: layout.layout as any,
        version: layout.version,
        updatedAt: layout.updatedAt,
      },
      update: {
        layout: layout.layout as any,
        version: layout.version,
        updatedAt: layout.updatedAt,
      },
    });
    return toDomain(saved);
  }
}

function toDomain(row: any): EntityLayout {
  return {
    id: row.id,
    tenantId: row.tenantId,
    entityType: row.entityType as CustomEntityType,
    layout: row.layout,
    version: row.version,
    updatedAt: row.updatedAt,
  };
}
