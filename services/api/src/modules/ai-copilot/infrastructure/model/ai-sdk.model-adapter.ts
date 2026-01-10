import { Injectable, Logger } from "@nestjs/common";
import type { EnvService } from "@corely/config";
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { LanguageModelPort } from "../../application/ports/language-model.port";
import type { DomainToolPort } from "../../application/ports/domain-tool.port";
import { buildAiTools } from "../tools/tools.factory";
import type { ToolExecutionRepositoryPort } from "../../application/ports/tool-execution-repository.port";
import type { AuditPort } from "../../application/ports/audit.port";
import type { OutboxPort } from "../../application/ports/outbox.port";
import { collectInputsTool } from "../tools/interactive-tools";
import { type CopilotUIMessage } from "../../domain/types/ui-message";
import { type ObservabilityPort, type ObservabilitySpanRef } from "@corely/kernel";
import { type LanguageModelUsage, type StreamTextResult } from "ai";

@Injectable()
export class AiSdkModelAdapter implements LanguageModelPort {
  private readonly openai: ReturnType<typeof createOpenAI>;
  private readonly anthropic: ReturnType<typeof createAnthropic>;
  private readonly logger = new Logger(AiSdkModelAdapter.name);

  constructor(
    private readonly toolExecutions: ToolExecutionRepositoryPort,
    private readonly audit: AuditPort,
    private readonly outbox: OutboxPort,
    private readonly env: EnvService,
    private readonly observability: ObservabilityPort
  ) {
    this.openai = createOpenAI({
      apiKey: this.env.OPENAI_API_KEY || "",
    });
    this.anthropic = createAnthropic({
      apiKey: this.env.ANTHROPIC_API_KEY || "",
    });
  }

  async streamChat(params: {
    messages: CopilotUIMessage[];
    tools: DomainToolPort[];
    runId: string;
    tenantId: string;
    userId: string;
    observability: ObservabilitySpanRef;
  }): Promise<{ result: StreamTextResult<any, any>; usage?: LanguageModelUsage }> {
    const aiTools = buildAiTools(params.tools, {
      toolExecutions: this.toolExecutions,
      audit: this.audit,
      outbox: this.outbox,
      tenantId: params.tenantId,
      runId: params.runId,
      userId: params.userId,
      observability: this.observability,
      parentSpan: params.observability,
    });

    const provider = this.env.AI_MODEL_PROVIDER;
    const modelId = this.env.AI_MODEL_ID;

    const model = provider === "anthropic" ? this.anthropic(modelId) : this.openai(modelId);

    const toolset = {
      ...aiTools,
      collect_inputs: collectInputsTool,
    };

    this.logger.debug(`Starting streamText with ${Object.keys(toolset).length} tools`);

    const sanitizeParts = (parts: CopilotUIMessage["parts"]) => {
      if (!Array.isArray(parts)) {
        return undefined;
      }
      const filtered = parts.flatMap((part) => {
        if (part?.type === "text" && typeof part.text === "string") {
          return [{ type: "text" as const, text: part.text }];
        }
        if (part?.type === "reasoning" && typeof part.text === "string") {
          return [{ type: "text" as const, text: part.text }];
        }
        // Drop tool/data/other parts to avoid malformed tool_use/tool_result sequences
        return [];
      });
      return filtered.length ? filtered : undefined;
    };

    const systemMessage: Omit<CopilotUIMessage, "id"> = {
      role: "system",
      parts: [
        {
          type: "text" as const,
          text:
            "You are the Corely Copilot. Use the provided tools for all factual or data retrieval tasks. " +
            "When asked to search, list, or look up customers, always call the customer_search tool even if the user provides no query; " +
            "send an empty or undefined query to list all customers. " +
            "When creating or drafting an invoice for a named customer, call invoice_create_from_customer first to resolve the customer; " +
            "only use collect_inputs after customer resolution or when required invoice fields are missing. " +
            "When defining collect_inputs fields, use the most specific type (date for YYYY-MM-DD, datetime for date+time, boolean for yes/no). " +
            "Never use type text for dates or datetimes; do not use regex patterns for those fields. " +
            "Do not make up customer data.",
        },
      ],
    };

    const modelMessages = await convertToModelMessages(
      [systemMessage, ...params.messages].map((msg) => {
        const parts = sanitizeParts(msg.parts) ?? [];
        return {
          role: msg.role,
          parts,
        };
      })
    );

    const result = streamText({
      model,
      messages: modelMessages,
      tools: toolset,
      stopWhen: stepCountIs(5),
      experimental_telemetry: {
        isEnabled: true,
        functionId: "copilot.streamChat",
      },
    });

    let usage: LanguageModelUsage | undefined;
    try {
      usage = await result.usage;
    } catch (err) {
      this.logger.warn(`Failed to resolve usage: ${err}`);
    }

    return { result, usage };
  }
}
