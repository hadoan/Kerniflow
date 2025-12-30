import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { TransactionContext } from "@corely/kernel";
import {
  type TenantMenuOverrideRepositoryPort,
  type TenantMenuOverrideEntity,
  type CreateTenantMenuOverrideDto,
  type MenuScope,
} from "../../application/ports/tenant-menu-override-repository.port";

type PrismaTransactionContext = TransactionContext & { prisma: PrismaService };

function getPrismaClient(prisma: PrismaService, tx?: TransactionContext) {
  const prismaTx = tx as PrismaTransactionContext | undefined;
  return prismaTx?.prisma ?? prisma;
}

@Injectable()
export class PrismaTenantMenuOverrideRepositoryAdapter implements TenantMenuOverrideRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenantAndScope(
    tenantId: string,
    scope: MenuScope,
    tx?: TransactionContext
  ): Promise<TenantMenuOverrideEntity | null> {
    const client = getPrismaClient(this.prisma, tx);

    return await client.tenantMenuOverride.findUnique({
      where: {
        tenantId_scope: {
          tenantId,
          scope,
        },
      },
    });
  }

  async upsert(
    data: CreateTenantMenuOverrideDto,
    tx?: TransactionContext
  ): Promise<TenantMenuOverrideEntity> {
    const client = getPrismaClient(this.prisma, tx);

    return await client.tenantMenuOverride.upsert({
      where: {
        tenantId_scope: {
          tenantId: data.tenantId,
          scope: data.scope,
        },
      },
      create: {
        id: data.id,
        tenantId: data.tenantId,
        scope: data.scope,
        overridesJson: data.overridesJson,
        updatedByUserId: data.updatedByUserId,
      },
      update: {
        overridesJson: data.overridesJson,
        updatedByUserId: data.updatedByUserId,
      },
    });
  }

  async delete(id: string, tx?: TransactionContext): Promise<void> {
    const client = getPrismaClient(this.prisma, tx);

    await client.tenantMenuOverride.delete({
      where: { id },
    });
  }
}
