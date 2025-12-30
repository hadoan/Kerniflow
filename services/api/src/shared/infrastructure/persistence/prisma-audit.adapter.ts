// import type { AuditPort } from "@corely/kernel";
// import type { AuditEntry } from "@shared/ports/audit.port";

// export class PrismaAuditAdapter implements AuditPort {
//   async write(entry: AuditEntry): Promise<void> {
//     const prisma = getPrisma();
//     await prisma.auditLog.create({
//       data: {
//         tenantId: entry.tenantId!,
//         actorUserId: entry.actorUserId ?? null,
//         action: entry.action,
//         entity: entry.targetType ?? "",
//         entityId: entry.targetId ?? "",
//         details: entry.details ?? null,
//       },
//     });
//   }
// }

import { Injectable } from "@nestjs/common";
import { AuditPort } from "@corely/kernel";
import type { TransactionContext } from "@corely/kernel";
import { PrismaService } from "@corely/data";
import { getPrismaClient } from "@corely/data";

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
      metadata?: Record<string, unknown>;
    },
    tx?: TransactionContext
  ): Promise<void> {
    const client = getPrismaClient(this.prisma, tx as any);

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
