import { Injectable } from "@nestjs/common";
import { prisma } from "@kerniflow/data";
import { IAuditPort } from "../../application/ports/audit.port";

/**
 * Prisma Audit Repository Implementation
 */
@Injectable()
export class PrismaAuditRepository implements IAuditPort {
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
    };

    if (data.tenantId) createData.tenantId = data.tenantId;
    if (data.actorUserId) createData.actorUserId = data.actorUserId;
    if (data.targetType) createData.targetType = data.targetType;
    if (data.targetId) createData.targetId = data.targetId;
    if (data.ip) createData.ip = data.ip;
    if (data.userAgent) createData.userAgent = data.userAgent;
    if (data.metadataJson) createData.metadataJson = data.metadataJson;

    await prisma.auditLog.create({ data: createData });
  }
}
