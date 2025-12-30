import { Injectable } from "@nestjs/common";
import { PrismaService } from "@kerniflow/data";
import type {
  TenantTemplateInstallRepositoryPort,
  TenantTemplateInstallEntity,
} from "../../application/ports/tenant-template-install-repository.port";

/**
 * Prisma Tenant Template Install Repository Adapter
 * Implements template installation persistence using Prisma
 */
@Injectable()
export class PrismaTenantTemplateInstallRepositoryAdapter implements TenantTemplateInstallRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenantAndTemplate(
    tenantId: string,
    templateId: string
  ): Promise<TenantTemplateInstallEntity | null> {
    // @ts-expect-error - tenantTemplateInstall table will exist after migration
    const record = await this.prisma.tenantTemplateInstall.findUnique({
      where: {
        tenantId_templateId: {
          tenantId,
          templateId,
        },
      },
    });

    if (!record) {
      return null;
    }

    return this.toDomain(record);
  }

  async listByTenant(tenantId: string): Promise<TenantTemplateInstallEntity[]> {
    // @ts-expect-error - tenantTemplateInstall table will exist after migration
    const records = await this.prisma.tenantTemplateInstall.findMany({
      where: { tenantId },
      orderBy: { appliedAt: "desc" },
    });

    return records.map((r: any) => this.toDomain(r));
  }

  async upsert(entity: TenantTemplateInstallEntity): Promise<TenantTemplateInstallEntity> {
    // @ts-expect-error - tenantTemplateInstall table will exist after migration
    const record = await this.prisma.tenantTemplateInstall.upsert({
      where: {
        tenantId_templateId: {
          tenantId: entity.tenantId,
          templateId: entity.templateId,
        },
      },
      create: {
        id: entity.id,
        tenantId: entity.tenantId,
        templateId: entity.templateId,
        version: entity.version,
        paramsJson: entity.paramsJson,
        appliedByUserId: entity.appliedByUserId,
        appliedAt: entity.appliedAt,
        resultSummaryJson: entity.resultSummaryJson,
      },
      update: {
        version: entity.version,
        paramsJson: entity.paramsJson,
        appliedByUserId: entity.appliedByUserId,
        appliedAt: entity.appliedAt,
        resultSummaryJson: entity.resultSummaryJson,
      },
    });

    return this.toDomain(record);
  }

  async delete(tenantId: string, templateId: string): Promise<void> {
    // @ts-expect-error - tenantTemplateInstall table will exist after migration
    await this.prisma.tenantTemplateInstall.delete({
      where: {
        tenantId_templateId: {
          tenantId,
          templateId,
        },
      },
    });
  }

  private toDomain(record: any): TenantTemplateInstallEntity {
    return {
      id: record.id,
      tenantId: record.tenantId,
      templateId: record.templateId,
      version: record.version,
      paramsJson: record.paramsJson,
      appliedByUserId: record.appliedByUserId,
      appliedAt: record.appliedAt,
      resultSummaryJson: record.resultSummaryJson,
    };
  }
}
