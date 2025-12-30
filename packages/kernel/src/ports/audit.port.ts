import { type TransactionContext } from "./unit-of-work.port";

export interface AuditPort {
  log(
    entry: {
      tenantId: string;
      userId: string;
      action: string;
      entityType: string;
      entityId: string;
      metadata?: Record<string, any>;
    },
    tx?: TransactionContext
  ): Promise<void>;
}

export const AUDIT_PORT = "kernel/audit-port";
