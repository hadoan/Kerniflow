import { Injectable, Logger } from "@nestjs/common";
import type { EnvService } from "@corely/config";
import { streamText, convertToCoreMessages, stepCountIs } from "ai";
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

    const result = streamText({
      model,
      messages: convertToCoreMessages(params.messages),
      tools: toolset,
      stopWhen: stepCountIs(5),
    });

    // Set response headers for text streaming
    params.response.setHeader("Content-Type", "text/plain; charset=utf-8");
    params.response.setHeader("Cache-Control", "no-cache, no-transform");

    this.logger.debug("Starting to stream chunks from fullStream");
    let chunkCount = 0;
    let textDeltaCount = 0;
    let toolCallCount = 0;
    let toolResultCount = 0;

    // Stream all text from all steps (including after tool calls)
    try {
      for await (const chunk of result.fullStream) {
        chunkCount++;

        if (chunk.type === "text-delta") {
          textDeltaCount++;
          const preview = chunk.text.length > 50 ? chunk.text.substring(0, 50) + "..." : chunk.text;
          this.logger.debug(`Text delta ${textDeltaCount}: "${preview}"`);
          params.response.write(chunk.text);
        } else if (chunk.type === "tool-call") {
          toolCallCount++;
          this.logger.log(`Tool call ${toolCallCount}: ${(chunk as any).toolName}`);
        } else if (chunk.type === "tool-result") {
          toolResultCount++;
          this.logger.log(`Tool result ${toolResultCount} received`);
        } else if (chunk.type === "finish") {
          this.logger.log(`Stream finished: ${(chunk as any).finishReason}`);
        } else {
          this.logger.debug(`Chunk type: ${chunk.type}`);
        }
      }
    } catch (error) {
      this.logger.error("Stream error:", error);
    } finally {
      this.logger.log(
        `Stream completed - Chunks: ${chunkCount}, Text: ${textDeltaCount}, Tools: ${toolCallCount}/${toolResultCount}`
      );
      params.response.end();
    }

    // Return empty values - actual text/usage available via result promises if needed
    return { outputText: "", usage: undefined };
  }
}
