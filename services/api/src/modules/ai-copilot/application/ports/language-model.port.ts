import { type CopilotUIMessage } from "../../domain/types/ui-message";
import { type DomainToolPort } from "./domain-tool.port";
import { type ObservabilitySpanRef } from "@corely/kernel";
import { type WorkspaceKind } from "@corely/prompts";
import { type LanguageModelUsage, type StreamTextResult } from "ai";
import { type PosVerticalId, type SurfaceId } from "@corely/contracts";

export interface LanguageModelPort {
  streamChat(params: {
    messages: CopilotUIMessage[];
    tools: DomainToolPort[];
    locale?: string;
    runId: string;
    tenantId: string;
    toolTenantId?: string;
    workspaceId?: string;
    userId: string;
    workspaceKind?: WorkspaceKind;
    environment?: string;
    activeAppId?: string;
    surfaceId?: SurfaceId;
    verticalId?: PosVerticalId | null;
    observability: ObservabilitySpanRef;
  }): Promise<{ result: StreamTextResult<any, any> }>;
}
