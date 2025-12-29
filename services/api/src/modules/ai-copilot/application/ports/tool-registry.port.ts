import { type DomainToolPort } from "./domain-tool.port";

export interface ToolRegistryPort {
  listForTenant(tenantId: string): DomainToolPort[];
}

export const COPILOT_TOOLS = Symbol("COPILOT_TOOLS");
