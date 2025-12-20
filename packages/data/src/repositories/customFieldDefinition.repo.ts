import type { CustomEntityType } from "@kerniflow/contracts";
import type { CustomFieldDefinition, CustomFieldDefinitionPort } from "@kerniflow/domain";
import { prisma } from "../prisma.client";

export class CustomFieldDefinitionRepository implements CustomFieldDefinitionPort {
  async listActiveByEntityType(
    tenantId: string,
    entityType: CustomEntityType
  ): Promise<CustomFieldDefinition[]> {
    const defs = await prisma.customFieldDefinition.findMany({
      where: { tenantId, entityType, isActive: true },
      orderBy: { createdAt: "asc" },
    });
    return defs.map(toDomain);
  }

  async getById(tenantId: string, id: string): Promise<CustomFieldDefinition | null> {
    const def = await prisma.customFieldDefinition.findFirst({
      where: { id, tenantId },
    });
    return def ? toDomain(def) : null;
  }

  async upsert(definition: CustomFieldDefinition): Promise<CustomFieldDefinition> {
    const saved = await prisma.customFieldDefinition.upsert({
      where: { id: definition.id },
      create: toPrisma(definition),
      update: toPrisma(definition),
    });
    return toDomain(saved);
  }

  async softDelete(tenantId: string, id: string): Promise<void> {
    await prisma.customFieldDefinition.updateMany({
      where: { tenantId, id },
      data: { isActive: false },
    });
  }
}

function toDomain(def: any): CustomFieldDefinition {
  return {
    id: def.id,
    tenantId: def.tenantId,
    entityType: def.entityType,
    key: def.key,
    label: def.label,
    description: def.description ?? undefined,
    type: def.type,
    required: def.required,
    defaultValue: def.defaultValue ?? undefined,
    options: def.options ?? undefined,
    validation: def.validation ?? undefined,
    isIndexed: def.isIndexed,
    isActive: def.isActive,
    createdAt: def.createdAt,
    updatedAt: def.updatedAt,
  };
}

function toPrisma(def: CustomFieldDefinition) {
  return {
    id: def.id,
    tenantId: def.tenantId,
    entityType: def.entityType,
    key: def.key,
    label: def.label,
    description: def.description ?? null,
    type: def.type,
    required: def.required,
    defaultValue: (def.defaultValue ?? null) as any,
    options: (def.options ?? null) as any,
    validation: (def.validation ?? null) as any,
    isIndexed: def.isIndexed,
    isActive: def.isActive,
    createdAt: def.createdAt,
    updatedAt: def.updatedAt,
  };
}
