import { prisma } from "@kerniflow/data";
import { AuditEntry, AuditPort } from "../../ports/audit.port";

export class PrismaAuditAdapter implements AuditPort {
  async write(entry: AuditEntry): Promise<void> {
    await prisma.auditLog.create({
      data: {
        tenantId: entry.tenantId!,
        actorUserId: entry.actorUserId ?? null,
        action: entry.action,
        entity: entry.targetType ?? "",
        entityId: entry.targetId ?? "",
        details: entry.details ?? null,
      },
    });
  }
}
