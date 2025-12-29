import { type RequestContext } from "../context/request-context";

export interface AuditEntry {
  tenantId: string | null;
  actorUserId: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: string;
  context?: RequestContext;
}

export interface AuditPort {
  write(entry: AuditEntry): Promise<void>;
}

export const AUDIT_PORT_TOKEN = Symbol("AUDIT_PORT_TOKEN");
