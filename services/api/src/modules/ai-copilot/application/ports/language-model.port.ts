import { type CopilotUIMessage } from "../../domain/types/ui-message";
import { type DomainToolPort } from "./domain-tool.port";
import { type Response } from "express";
import { type ObservabilitySpanRef } from "@corely/kernel";
import { type LanguageModelUsage } from "ai";

export interface LanguageModelPort {
  streamChat(params: {
    messages: CopilotUIMessage[];
    tools: DomainToolPort[];
    runId: string;
    tenantId: string;
    userId: string;
    response: Response;
    observability: ObservabilitySpanRef;
  }): Promise<{ outputText: string; usage?: LanguageModelUsage }>;
}
