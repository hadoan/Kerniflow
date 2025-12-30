import { Injectable } from "@nestjs/common";
import { AuditPort, TransactionContext } from "@corely/kernel";
import { PrismaService } from "../prisma/prisma.service";
import { getPrismaClient } from "../uow/prisma-unit-of-work.adapter";

/**
 * Prisma implementation of AuditPort.
 * Supports both transactional and non-transactional operations.
 */
@Injectable()
export class PrismaAuditAdapter implements AuditPort {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    entry: {
      tenantId: string;
      userId: string;
      action: string;
      entityType: string;
      entityId: string;
      metadata?: Record<string, any>;
    },
    tx?: TransactionContext
  ): Promise<void> {
    const client = getPrismaClient(this.prisma, tx);

    await client.auditLog.create({
      data: {
        tenantId: entry.tenantId,
        actorUserId: entry.userId,
        action: entry.action,
        entity: entry.entityType,
        entityId: entry.entityId,
        details: entry.metadata ? JSON.stringify(entry.metadata) : null,
      },
    });
  }
}
