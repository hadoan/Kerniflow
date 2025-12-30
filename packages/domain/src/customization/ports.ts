import type { CustomEntityType } from "@corely/contracts";
import type { CustomFieldDefinition, CustomFieldIndexRow, EntityLayout } from "./types";

export interface CustomFieldDefinitionPort {
  listActiveByEntityType(
    tenantId: string,
    entityType: CustomEntityType
  ): Promise<CustomFieldDefinition[]>;
  getById(tenantId: string, id: string): Promise<CustomFieldDefinition | null>;
  upsert(definition: CustomFieldDefinition): Promise<CustomFieldDefinition>;
  softDelete(tenantId: string, id: string): Promise<void>;
}

export interface CustomFieldIndexPort {
  upsertIndexesForEntity(
    tenantId: string,
    entityType: CustomEntityType,
    entityId: string,
    rows: CustomFieldIndexRow[]
  ): Promise<void>;
  deleteIndexesForEntity(
    tenantId: string,
    entityType: CustomEntityType,
    entityId: string
  ): Promise<void>;
}

export interface EntityLayoutPort {
  get(tenantId: string, entityType: CustomEntityType): Promise<EntityLayout | null>;
  upsert(layout: EntityLayout): Promise<EntityLayout>;
}
