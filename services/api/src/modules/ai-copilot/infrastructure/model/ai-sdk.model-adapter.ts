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
import type { Response } from "express";
import { type ObservabilityPort, type ObservabilitySpanRef } from "@corely/kernel";
import { type LanguageModelUsage } from "ai";

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
    response: Response;
    observability: ObservabilitySpanRef;
  }): Promise<{ outputText: string; usage?: LanguageModelUsage }> {
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

    // Convert UI messages to model messages (async)
    // convertToModelMessages expects UI messages without ids/metadata; build a clean array
    const modelMessages = await convertToModelMessages(
      params.messages.map((msg) => ({
        role: msg.role,
        parts: msg.parts,
        content: msg.content,
      }))
    );

    const result = streamText({
      model,
      messages: modelMessages,
      tools: toolset,
      stopWhen: stepCountIs(5),
    });

    // Stream plain text over SSE to the client (text protocol)
    params.response.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    params.response.setHeader("Cache-Control", "no-cache, no-transform");
    params.response.setHeader("Connection", "keep-alive");
    params.response.setHeader("X-Accel-Buffering", "no");
    params.response.status(200);
    (params.response as any).flushHeaders?.();

    let outputText = "";

    try {
      for await (const delta of result.textStream) {
        outputText += delta;
        this.logger.debug(`Stream delta: ${delta}`);
        params.response.write(`${delta}\n\n`);
        (params.response as any).flush?.();
      }
    } catch (error) {
      this.logger.error("Stream error:", error);
    } finally {
      // Signal end of stream
      params.response.write("data: [DONE]\n\n");
      params.response.end();
    }

    // Wait for usage to resolve to capture token accounting.
    const usage = await result.usage.catch((err) => {
      this.logger.warn(`Failed to resolve usage: ${err}`);
      return undefined;
    });

    return { outputText, usage };
  }
}
