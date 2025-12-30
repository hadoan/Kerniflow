import { Injectable } from "@nestjs/common";
import type { CustomEntityType } from "@corely/contracts";
import type { CustomFieldIndexPort, CustomFieldIndexRow } from "@corely/domain";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CustomFieldIndexRepository implements CustomFieldIndexPort {
  constructor(private readonly prisma: PrismaService) {}

  async upsertIndexesForEntity(
    tenantId: string,
    entityType: CustomEntityType,
    entityId: string,
    rows: CustomFieldIndexRow[]
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.customFieldIndex.deleteMany({ where: { tenantId, entityType, entityId } }),
      this.prisma.customFieldIndex.createMany({
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
    await this.prisma.customFieldIndex.deleteMany({ where: { tenantId, entityType, entityId } });
  }
}
