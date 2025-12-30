import type { CustomEntityType, CustomFieldType } from "@corely/contracts";

export interface CustomFieldDefinition {
  id: string;
  tenantId: string;
  entityType: CustomEntityType;
  key: string;
  label: string;
  description?: string | null;
  type: CustomFieldType;
  required: boolean;
  defaultValue?: unknown;
  options?: Array<string | number | boolean>;
  validation?: Record<string, unknown>;
  isIndexed: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomFieldIndexRow {
  tenantId: string;
  entityType: CustomEntityType;
  entityId: string;
  fieldId: string;
  fieldKey: string;
  valueText?: string | null;
  valueNumber?: number | null;
  valueDate?: Date | null;
  valueBool?: boolean | null;
  valueJson?: unknown;
}

export interface EntityLayout {
  id: string;
  tenantId: string;
  entityType: CustomEntityType;
  layout: Record<string, unknown>;
  version: number;
  updatedAt: Date;
}
