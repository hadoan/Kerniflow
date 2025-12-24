// import type { AuditPort } from "@kerniflow/kernel";
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
import { AuditPort, TransactionContext } from "@kerniflow/kernel";
import { PrismaService } from "@kerniflow/data";
import { getPrismaClient } from "@kerniflow/data";

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
    const client = getPrismaClient(this.prisma, tx);

    await client.auditLog.create({
      data: {
        tenantId: entry.tenantId,
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadataJson: entry.metadata ? JSON.stringify(entry.metadata) : "{}",
        timestamp: new Date(),
      },
    });
  }
}
