import type { CustomEntityType } from "@kerniflow/contracts";
import type { EntityLayout, EntityLayoutPort } from "@kerniflow/domain";
import { prisma } from "../prisma.client";

export class EntityLayoutRepository implements EntityLayoutPort {
  async get(tenantId: string, entityType: CustomEntityType): Promise<EntityLayout | null> {
    const layout = await prisma.entityLayout.findUnique({
      where: {
        tenantId_entityType: { tenantId, entityType },
      },
    });
    return layout ? toDomain(layout) : null;
  }

  async upsert(layout: EntityLayout): Promise<EntityLayout> {
    const saved = await prisma.entityLayout.upsert({
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
