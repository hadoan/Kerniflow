import { Injectable } from "@nestjs/common";
import { PrismaService } from "@kerniflow/data";
import type { TransactionContext } from "@kerniflow/kernel";
import {
  type TenantAppInstallRepositoryPort,
  type TenantAppInstallEntity,
  type CreateTenantAppInstallDto,
  type UpdateTenantAppInstallDto,
} from "../../application/ports/tenant-app-install-repository.port";

function getPrismaClient(prisma: PrismaService, tx?: TransactionContext) {
  return tx?.prisma ?? prisma;
}

@Injectable()
export class PrismaTenantAppInstallRepositoryAdapter implements TenantAppInstallRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenantAndApp(
    tenantId: string,
    appId: string,
    tx?: TransactionContext
  ): Promise<TenantAppInstallEntity | null> {
    const client = getPrismaClient(this.prisma, tx);

    return await client.tenantAppInstall.findUnique({
      where: {
        tenantId_appId: {
          tenantId,
          appId,
        },
      },
    });
  }

  async listByTenant(tenantId: string, tx?: TransactionContext): Promise<TenantAppInstallEntity[]> {
    const client = getPrismaClient(this.prisma, tx);

    return await client.tenantAppInstall.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
    });
  }

  async listEnabledByTenant(
    tenantId: string,
    tx?: TransactionContext
  ): Promise<TenantAppInstallEntity[]> {
    const client = getPrismaClient(this.prisma, tx);

    return await client.tenantAppInstall.findMany({
      where: {
        tenantId,
        enabled: true,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async upsert(
    data: CreateTenantAppInstallDto,
    tx?: TransactionContext
  ): Promise<TenantAppInstallEntity> {
    const client = getPrismaClient(this.prisma, tx);

    return await client.tenantAppInstall.upsert({
      where: {
        tenantId_appId: {
          tenantId: data.tenantId,
          appId: data.appId,
        },
      },
      create: {
        id: data.id,
        tenantId: data.tenantId,
        appId: data.appId,
        enabled: data.enabled,
        installedVersion: data.installedVersion,
        configJson: data.configJson,
        enabledAt: data.enabledAt,
        enabledByUserId: data.enabledByUserId,
      },
      update: {
        enabled: data.enabled,
        installedVersion: data.installedVersion,
        configJson: data.configJson,
        enabledAt: data.enabledAt,
        enabledByUserId: data.enabledByUserId,
      },
    });
  }

  async update(
    id: string,
    data: UpdateTenantAppInstallDto,
    tx?: TransactionContext
  ): Promise<TenantAppInstallEntity> {
    const client = getPrismaClient(this.prisma, tx);

    return await client.tenantAppInstall.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, tx?: TransactionContext): Promise<void> {
    const client = getPrismaClient(this.prisma, tx);

    await client.tenantAppInstall.delete({
      where: { id },
    });
  }
}
