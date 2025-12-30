import type { AuditPort as KernelAuditPort } from "@kerniflow/kernel";
import { AUDIT_PORT } from "@kerniflow/kernel";

export type AuditPort = KernelAuditPort;
export type AuditEntry = Parameters<KernelAuditPort["log"]>[0];

// Backward-compatible alias while modules migrate.
export const AUDIT_PORT_TOKEN = AUDIT_PORT;
export { AUDIT_PORT };
