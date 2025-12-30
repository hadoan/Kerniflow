import type { CustomEntityType } from "@corely/contracts";
import type { EntityLayoutPort } from "../ports";
import type { EntityLayout } from "../types";

export interface UpsertEntityLayoutInput {
  tenantId: string;
  entityType: CustomEntityType;
  layout: Record<string, unknown>;
  version?: number;
  id?: string;
}

export class UpsertEntityLayout {
  constructor(private readonly layouts: EntityLayoutPort) {}

  async execute(input: UpsertEntityLayoutInput): Promise<EntityLayout> {
    const existing = await this.layouts.get(input.tenantId, input.entityType);
    const now = new Date();
    const layout: EntityLayout = {
      id: input.id ?? existing?.id ?? "",
      tenantId: input.tenantId,
      entityType: input.entityType,
      layout: input.layout,
      version: input.version ?? existing?.version ?? 1,
      updatedAt: now,
    };

    return this.layouts.upsert(layout);
  }
}
