import type { CustomFieldDefinitionPort } from "../ports";
import type { CustomFieldDefinition } from "../types";

export interface CreateCustomFieldDefinitionInput extends Omit<
  CustomFieldDefinition,
  "createdAt" | "updatedAt" | "isActive"
> {
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class CreateCustomFieldDefinition {
  constructor(private readonly definitions: CustomFieldDefinitionPort) {}

  async execute(input: CreateCustomFieldDefinitionInput): Promise<CustomFieldDefinition> {
    const existing = await this.definitions.listActiveByEntityType(
      input.tenantId,
      input.entityType
    );
    if (existing.some((def) => def.key === input.key)) {
      throw new Error(`Custom field key ${input.key} already exists for ${input.entityType}`);
    }

    const now = new Date();
    const definition: CustomFieldDefinition = {
      ...input,
      isActive: input.isActive ?? true,
      createdAt: input.createdAt ?? now,
      updatedAt: input.updatedAt ?? now,
    };
    return this.definitions.upsert(definition);
  }
}
