import { describe, expect, it } from "vitest";
import {
  CustomFieldValidationError,
  buildCustomFieldIndexes,
  validateAndNormalizeCustomValues,
} from "../..";
import type { CustomFieldDefinition } from "../types";

const baseDefinition = (overrides: Partial<CustomFieldDefinition>): CustomFieldDefinition => ({
  id: overrides.id ?? "field-1",
  tenantId: overrides.tenantId ?? "t1",
  entityType: overrides.entityType ?? "expense",
  key: overrides.key ?? "custom_field",
  label: overrides.label ?? "Custom Field",
  type: overrides.type ?? "TEXT",
  required: overrides.required ?? false,
  isIndexed: overrides.isIndexed ?? false,
  isActive: overrides.isActive ?? true,
  createdAt: overrides.createdAt ?? new Date(),
  updatedAt: overrides.updatedAt ?? new Date(),
  ...(overrides.defaultValue !== undefined && { defaultValue: overrides.defaultValue }),
  ...(overrides.description !== undefined && { description: overrides.description }),
  ...(overrides.options !== undefined && { options: overrides.options }),
  ...(overrides.validation !== undefined && { validation: overrides.validation }),
});

describe("validateAndNormalizeCustomValues", () => {
  it("throws for missing required fields", () => {
    const defs = [baseDefinition({ key: "req", required: true })];
    expect(() => validateAndNormalizeCustomValues(defs, {})).toThrow(CustomFieldValidationError);
  });

  it("applies default value for missing optional fields", () => {
    const defs = [baseDefinition({ key: "opt", defaultValue: "hello" })];
    const normalized = validateAndNormalizeCustomValues(defs, {});
    expect(normalized).toEqual({ opt: "hello" });
  });

  it("rejects unknown keys", () => {
    const defs = [baseDefinition({ key: "known" })];
    expect(() => validateAndNormalizeCustomValues(defs, { other: "value" })).toThrow(
      CustomFieldValidationError
    );
  });

  it("coerces number, boolean and date types", () => {
    const defs = [
      baseDefinition({ key: "num", type: "NUMBER" }),
      baseDefinition({ key: "flag", type: "BOOLEAN" }),
      baseDefinition({ key: "date", type: "DATE" }),
    ];
    const normalized = validateAndNormalizeCustomValues(defs, {
      num: "12.5",
      flag: "true",
      date: "2024-01-02",
    });

    expect(normalized.num).toBe(12.5);
    expect(normalized.flag).toBe(true);
    expect(normalized.date instanceof Date).toBe(true);
  });

  it("enforces select options", () => {
    const defs = [baseDefinition({ key: "color", type: "SELECT", options: ["red", "blue"] })];
    expect(() => validateAndNormalizeCustomValues(defs, { color: "green" })).toThrow(
      CustomFieldValidationError
    );
    const normalized = validateAndNormalizeCustomValues(defs, { color: "blue" });
    expect(normalized.color).toBe("blue");
  });

  it("supports multi-select arrays", () => {
    const defs = [baseDefinition({ key: "tags", type: "MULTI_SELECT", options: ["a", "b", "c"] })];
    const normalized = validateAndNormalizeCustomValues(defs, { tags: ["a", "c"] });
    expect(normalized.tags).toEqual(["a", "c"]);
  });
});

describe("buildCustomFieldIndexes", () => {
  it("creates index rows for indexed fields", () => {
    const defs: CustomFieldDefinition[] = [
      baseDefinition({ id: "t", key: "title", type: "TEXT", isIndexed: true }),
      baseDefinition({ id: "amt", key: "amount", type: "NUMBER", isIndexed: true }),
      baseDefinition({ id: "when", key: "when", type: "DATE", isIndexed: false }),
    ];
    const normalized = {
      title: "Hello",
      amount: 42,
      when: new Date("2023-03-01"),
    };

    const rows = buildCustomFieldIndexes({
      tenantId: "t1",
      entityType: "expense",
      entityId: "exp1",
      definitions: defs,
      values: normalized,
    });

    expect(rows).toHaveLength(2);
    const amountRow = rows.find((r) => r.fieldKey === "amount");
    expect(amountRow?.valueNumber).toBe(42);
  });
});
