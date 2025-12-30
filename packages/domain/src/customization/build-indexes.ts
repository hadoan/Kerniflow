import type { CustomEntityType } from "@corely/contracts";
import type { CustomFieldDefinition, CustomFieldIndexRow } from "./types";

export interface BuildIndexInput {
  tenantId: string;
  entityType: CustomEntityType;
  entityId: string;
  definitions: CustomFieldDefinition[];
  values: Record<string, unknown>;
}

export function buildCustomFieldIndexes(input: BuildIndexInput): CustomFieldIndexRow[] {
  const rows: CustomFieldIndexRow[] = [];
  for (const def of input.definitions) {
    if (!def.isIndexed) {
      continue;
    }
    const value = input.values[def.key];
    if (value === undefined || value === null) {
      continue;
    }

    const base: CustomFieldIndexRow = {
      tenantId: input.tenantId,
      entityType: input.entityType,
      entityId: input.entityId,
      fieldId: def.id,
      fieldKey: def.key,
    };

    switch (def.type) {
      case "TEXT":
        rows.push({ ...base, valueText: String(value) });
        break;
      case "NUMBER":
        rows.push({ ...base, valueNumber: toNumber(value) });
        break;
      case "DATE":
        rows.push({ ...base, valueDate: toDate(value) });
        break;
      case "BOOLEAN":
        rows.push({ ...base, valueBool: Boolean(value) });
        break;
      case "SELECT":
        rows.push({ ...base, valueText: String(value) });
        break;
      case "MULTI_SELECT":
        rows.push({ ...base, valueJson: Array.isArray(value) ? value : [value] });
        break;
      case "MONEY":
        rows.push({ ...base, valueNumber: extractAmount(value), valueJson: value });
        break;
      default:
        rows.push({ ...base, valueJson: value });
    }
  }
  return rows;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error("Cannot index non-numeric value");
  }
  return parsed;
}

function toDate(value: unknown): Date {
  if (value instanceof Date) {
    return value;
  }
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Cannot index invalid date");
  }
  return parsed;
}

function extractAmount(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  if (typeof value === "object" && value !== null) {
    const amount = (value as any).amountCents;
    if (typeof amount === "number") {
      return amount;
    }
    if (typeof amount === "string") {
      const parsed = Number(amount);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }
  throw new Error("Cannot index money value without amount");
}
