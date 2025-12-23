import type { CustomFieldDefinitionPort } from "../ports";
import type { CustomFieldDefinition } from "../types";

export interface UpdateCustomFieldDefinitionInput {
  tenantId: string;
  id: string;
  patch: Partial<
    Omit<CustomFieldDefinition, "id" | "tenantId" | "entityType" | "createdAt" | "updatedAt">
  >;
}

export class UpdateCustomFieldDefinition {
  constructor(private readonly definitions: CustomFieldDefinitionPort) {}

  async execute(input: UpdateCustomFieldDefinitionInput): Promise<CustomFieldDefinition> {
    const existing = await this.definitions.getById(input.tenantId, input.id);
    if (!existing) {
      throw new Error("Custom field definition not found");
    }
    if (input.patch.key && input.patch.key !== existing.key) {
      throw new Error("Custom field key cannot be changed");
    }
    if (input.patch.type && input.patch.type !== existing.type) {
      throw new Error("Custom field type cannot be changed");
    }

    const updated: CustomFieldDefinition = {
      ...existing,
      ...input.patch,
      updatedAt: new Date(),
    };
    return this.definitions.upsert(updated);
  }
}
