import { Injectable, Inject } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { AuditPort } from "../../application/ports/audit.port";

/**
 * Prisma Audit Repository Implementation
 */
@Injectable()
export class PrismaAuditRepository implements AuditPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async write(data: {
    tenantId: string | null;
    actorUserId: string | null;
    action: string;
    targetType?: string;
    targetId?: string;
    ip?: string;
    userAgent?: string;
    metadataJson?: string;
  }): Promise<void> {
    const createData: any = {
      action: data.action,
      // Map target fields to the required Prisma columns
      entity: data.targetType || "Unknown",
      entityId: data.targetId || data.actorUserId || "unknown",
    };

    if (data.tenantId) {
      createData.tenantId = data.tenantId;
    }
    // The auditLog model does not have actorUserId; stash it in metadata if provided
    if (data.actorUserId) {
      createData.details = JSON.stringify({ actorUserId: data.actorUserId });
    }
    if (data.ip) {
      createData.ip = data.ip;
    }
    if (data.userAgent) {
      createData.userAgent = data.userAgent;
    }
    if (data.metadataJson) {
      createData.metadataJson = data.metadataJson;
    }

    await this.prisma.auditLog.create({ data: createData });
  }
}
