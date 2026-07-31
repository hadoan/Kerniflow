import { type z } from "zod";
import { type ModelMessage } from "ai";
import { type PosVerticalId, type SurfaceId } from "@corely/contracts";

export type ToolKind = "server" | "client-confirm" | "client-auto";
export type ToolLocale = "en" | "de" | "vi";
export type LocalizedToolText = Partial<Record<ToolLocale, string>>;

export interface DomainToolPort {
  name: string;
  description: string;
  descriptions?: LocalizedToolText;
  appId?: string;
  allowedSurfaces?: SurfaceId[];
  allowedVerticals?: PosVerticalId[];
  requiredPermissions?: string[];
  inputSchema: z.ZodTypeAny;
  kind: ToolKind;
  needsApproval?: boolean;
  execute?: (params: {
    tenantId: string;
    workspaceId?: string;
    userId: string;
    input: unknown;
    toolCallId?: string;
    runId?: string;
    messages?: ModelMessage[];
    latestUserMessage?: string;
  }) => Promise<unknown>;
}
