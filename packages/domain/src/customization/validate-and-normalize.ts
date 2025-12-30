import type { CustomFieldDefinition } from "./types";
import type { CustomFieldType } from "@corely/contracts";

export interface ValidateAndNormalizeOptions {
  rejectUnknown?: boolean;
}

export class CustomFieldValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CustomFieldValidationError";
  }
}

export function validateAndNormalizeCustomValues(
  definitions: CustomFieldDefinition[],
  values: Record<string, unknown> | undefined | null,
  options: ValidateAndNormalizeOptions = {}
): Record<string, unknown> {
  const rejectUnknown = options.rejectUnknown ?? true;
  const normalized: Record<string, unknown> = {};
  const provided = values ?? {};

  if (rejectUnknown) {
    for (const key of Object.keys(provided)) {
      const def = definitions.find((d) => d.key === key && d.isActive);
      if (!def) {
        throw new CustomFieldValidationError(`Unknown custom field: ${key}`);
      }
    }
  }

  for (const def of definitions.filter((d) => d.isActive)) {
    const raw = (provided as Record<string, unknown>)[def.key];
    const hasValue = raw !== undefined && raw !== null;
    if (!hasValue) {
      if (def.required) {
        if (def.defaultValue !== undefined) {
          normalized[def.key] = def.defaultValue;
        } else {
          throw new CustomFieldValidationError(`Missing required custom field: ${def.key}`);
        }
      } else if (def.defaultValue !== undefined) {
        normalized[def.key] = def.defaultValue;
      }
      continue;
    }

    normalized[def.key] = normalizeValueForType(def.type, raw, def);
  }

  return normalized;
}

function normalizeValueForType(
  type: CustomFieldType,
  raw: unknown,
  def: CustomFieldDefinition
): string | number | boolean | Date | Array<string | number | boolean> | Record<string, unknown> {
  switch (type) {
    case "TEXT":
      return normalizeText(raw);
    case "NUMBER":
      return normalizeNumber(raw);
    case "DATE":
      return normalizeDate(raw);
    case "BOOLEAN":
      return normalizeBoolean(raw);
    case "SELECT":
      return normalizeSelect(raw, def.options);
    case "MULTI_SELECT":
      return normalizeMultiSelect(raw, def.options);
    case "MONEY":
      return normalizeMoney(raw);
    default:
      return raw as any;
  }
}

function normalizeText(raw: unknown): string {
  if (raw === undefined || raw === null) {
    return "";
  }
  if (typeof raw === "string") {
    return raw;
  }
  if (typeof raw === "number" || typeof raw === "boolean") {
    return String(raw);
  }
  throw new CustomFieldValidationError("TEXT custom fields must be a string");
}

function normalizeNumber(raw: unknown): number {
  if (typeof raw === "number") {
    return raw;
  }
  if (typeof raw === "string") {
    const parsed = Number(raw);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  throw new CustomFieldValidationError("NUMBER custom fields must be a number");
}

function normalizeDate(raw: unknown): Date {
  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) {
      throw new CustomFieldValidationError("DATE custom fields must be a valid date");
    }
    return raw;
  }
  if (typeof raw === "string") {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  throw new CustomFieldValidationError("DATE custom fields must be a valid date");
}

function normalizeBoolean(raw: unknown): boolean {
  if (typeof raw === "boolean") {
    return raw;
  }
  if (typeof raw === "string") {
    if (raw.toLowerCase() === "true") {
      return true;
    }
    if (raw.toLowerCase() === "false") {
      return false;
    }
  }
  if (typeof raw === "number") {
    if (raw === 1) {
      return true;
    }
    if (raw === 0) {
      return false;
    }
  }
  throw new CustomFieldValidationError("BOOLEAN custom fields must be a boolean");
}

function normalizeSelect(
  raw: unknown,
  options?: Array<string | number | boolean>
): string | number | boolean {
  const value = normalizeSelectValue(raw);
  if (options && !options.some((o) => o === value)) {
    throw new CustomFieldValidationError(`Value ${value} is not allowed for select field`);
  }
  return value;
}

function normalizeMultiSelect(
  raw: unknown,
  options?: Array<string | number | boolean>
): Array<string | number | boolean> {
  const valuesArray = Array.isArray(raw) ? raw : [raw];
  const normalized = valuesArray.map((item) => normalizeSelectValue(item));
  if (options) {
    for (const val of normalized) {
      if (!options.some((o) => o === val)) {
        throw new CustomFieldValidationError(`Value ${val} is not allowed for multi select field`);
      }
    }
  }
  return normalized;
}

function normalizeSelectValue(raw: unknown): string | number | boolean {
  if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") {
    return raw;
  }
  throw new CustomFieldValidationError("Select custom fields must be string, number or boolean");
}

function normalizeMoney(raw: unknown): Record<string, unknown> {
  if (typeof raw === "number") {
    return { amountCents: raw };
  }
  if (typeof raw === "string") {
    const parsed = Number(raw);
    if (!Number.isNaN(parsed)) {
      return { amountCents: parsed };
    }
  }
  if (typeof raw === "object" && raw !== null) {
    const amount = (raw as Record<string, unknown>).amountCents;
    const currency = (raw as Record<string, unknown>).currency;
    if (typeof amount === "number" || typeof amount === "string") {
      const parsed = typeof amount === "number" ? amount : Number(amount);
      if (!Number.isNaN(parsed)) {
        return currency ? { amountCents: parsed, currency } : { amountCents: parsed };
      }
    }
  }
  throw new CustomFieldValidationError("MONEY custom fields must include amountCents");
}
