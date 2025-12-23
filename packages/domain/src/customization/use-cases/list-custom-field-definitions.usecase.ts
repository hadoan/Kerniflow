import type { CustomEntityType } from "@kerniflow/contracts";
import type { CustomFieldDefinitionPort } from "../ports";
import type { CustomFieldDefinition } from "../types";

export class ListCustomFieldDefinitions {
  constructor(private readonly definitions: CustomFieldDefinitionPort) {}

  async execute(tenantId: string, entityType: CustomEntityType): Promise<CustomFieldDefinition[]> {
    return this.definitions.listActiveByEntityType(tenantId, entityType);
  }
}
