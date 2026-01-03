import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { AuditPort } from "../../application/ports/audit.port";

@Injectable()
export class PrismaAuditAdapter implements AuditPort {
  constructor(private readonly prisma: PrismaService) {}

  async write(data: {
    tenantId: string | null;
    actorUserId: string | null;
    action: string;
    targetType?: string | undefined;
    targetId?: string | undefined;
    details?: string | undefined;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        tenantId: data.tenantId || "unknown",
        action: data.action,
        entity: data.targetType || "Unknown",
        entityId: data.targetId || "unknown",
        details: data.details,
      },
    });
  }
}
