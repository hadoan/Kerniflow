import type { CustomEntityType } from "@kerniflow/contracts";
import type { CustomFieldIndexPort, CustomFieldIndexRow } from "@kerniflow/domain";
import { prisma } from "../prisma.client";

export class CustomFieldIndexRepository implements CustomFieldIndexPort {
  async upsertIndexesForEntity(
    tenantId: string,
    entityType: CustomEntityType,
    entityId: string,
    rows: CustomFieldIndexRow[]
  ): Promise<void> {
    await prisma.$transaction([
      prisma.customFieldIndex.deleteMany({ where: { tenantId, entityType, entityId } }),
      prisma.customFieldIndex.createMany({
        data: rows.map((row) => ({
          tenantId: row.tenantId,
          entityType: row.entityType,
          entityId: row.entityId,
          fieldId: row.fieldId,
          fieldKey: row.fieldKey,
          valueText: row.valueText ?? null,
          valueNumber: row.valueNumber ?? null,
          valueDate: row.valueDate ?? null,
          valueBool: row.valueBool ?? null,
          valueJson: (row.valueJson ?? null) as any,
        })),
        skipDuplicates: true,
      }),
    ]);
  }

  async deleteIndexesForEntity(
    tenantId: string,
    entityType: CustomEntityType,
    entityId: string
  ): Promise<void> {
    await prisma.customFieldIndex.deleteMany({ where: { tenantId, entityType, entityId } });
  }
}
