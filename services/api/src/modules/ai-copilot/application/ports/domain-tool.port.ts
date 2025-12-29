import { type z } from "zod";

export type ToolKind = "server" | "client-confirm" | "client-auto";

export interface DomainToolPort {
  name: string;
  description: string;
  inputSchema: z.ZodTypeAny;
  kind: ToolKind;
  execute?: (params: {
    tenantId: string;
    userId: string;
    input: unknown;
    toolCallId?: string;
    runId?: string;
  }) => Promise<unknown>;
}
