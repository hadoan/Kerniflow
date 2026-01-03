import { nanoid } from "nanoid";
import { type CopilotUIMessage } from "../../domain/types/ui-message";
import { type AgentRunRepositoryPort } from "../ports/agent-run-repository.port";
import { type MessageRepositoryPort } from "../ports/message-repository.port";
import { type ToolExecutionRepositoryPort } from "../ports/tool-execution-repository.port";
import { type ToolRegistryPort } from "../ports/tool-registry.port";
import { type LanguageModelPort } from "../ports/language-model.port";
import { type AuditPort } from "../ports/audit.port";
import { type OutboxPort } from "../ports/outbox.port";
import { type CopilotIdempotencyPort } from "../ports/copilot-idempotency.port";
import { type ClockPort } from "@corely/kernel/ports/clock.port";
import {
  type JsonValue,
  type NormalizedMessageSnapshot,
  type ObservabilityPort,
} from "@corely/kernel";
import { type Response } from "express";
import { createHash } from "crypto";
import { SpanStatusCode } from "@opentelemetry/api";

const ACTION_KEY = "copilot.chat";

export class StreamCopilotChatUseCase {
  constructor(
    private readonly agentRuns: AgentRunRepositoryPort,
    private readonly messages: MessageRepositoryPort,
    private readonly toolExecutions: ToolExecutionRepositoryPort,
    private readonly toolRegistry: ToolRegistryPort,
    private readonly languageModel: LanguageModelPort,
    private readonly audit: AuditPort,
    private readonly outbox: OutboxPort,
    private readonly idempotency: CopilotIdempotencyPort,
    private readonly clock: ClockPort,
    private readonly observability: ObservabilityPort
  ) {}

  async execute(params: {
    messages: CopilotUIMessage[];
    tenantId: string;
    userId: string;
    idempotencyKey: string;
    runId?: string;
    response: Response;
    requestId: string;
    workspaceId?: string;
    workspaceKind?: string;
    intent?: string;
    environment: string;
    modelId?: string;
    modelProvider?: string;
  }): Promise<void> {
    const { tenantId, userId, idempotencyKey } = params;

    const requestHash = this.hashRequest(params.messages);
    const decision = await this.idempotency.startOrReplay({
      actionKey: ACTION_KEY,
      tenantId,
      userId,
      idempotencyKey,
      requestHash,
    });

    if (decision.mode === "REPLAY") {
      params.response.setHeader("Idempotency-Replayed", "true");
      params.response.status(decision.responseStatus).json(decision.responseBody);
      return;
    }

    if (decision.mode === "IN_PROGRESS") {
      if (decision.retryAfterMs) {
        params.response.setHeader(
          "Retry-After",
          Math.ceil(decision.retryAfterMs / 1000).toString()
        );
      }
      params.response
        .status(202)
        .json({ status: "IN_PROGRESS", retryAfterMs: decision.retryAfterMs });
      return;
    }

    if (decision.mode === "MISMATCH") {
      params.response
        .status(400)
        .json({ code: "IDEMPOTENCY_MISMATCH", message: "Payload does not match existing request" });
      return;
    }

    if (decision.mode === "FAILED") {
      params.response.status(decision.responseStatus).json(decision.responseBody);
      return;
    }

    const runId = params.runId || nanoid();
    const turnId = nanoid();
    const tools = this.toolRegistry.listForTenant(tenantId);

    const turnSpan = this.observability.startTurnTrace({
      traceName: `copilot.turn:${params.intent ?? "general"}`,
      turnId,
      runId,
      tenantId,
      userId,
      workspaceId: params.workspaceId,
      workspaceKind: params.workspaceKind,
      intent: params.intent,
      entrypoint: "api.copilot.chat",
      environment: params.environment,
      requestId: params.requestId,
      toolsRequested: tools.map((tool) => tool.name),
      model: params.modelId,
      provider: params.modelProvider,
    });

    const normalizedMessages = this.normalizeMessages(params.messages);
    this.observability.recordTurnInput(turnSpan, {
      history: normalizedMessages,
      userInput: this.extractLatestUserInput(normalizedMessages),
      toolsRequested: tools.map((tool) => tool.name),
    });

    const existingRun = await this.agentRuns.findById({ tenantId, runId });
    if (!existingRun) {
      await this.agentRuns.create({
        id: runId,
        tenantId,
        createdByUserId: userId,
        status: "running",
        traceId: turnSpan.traceId,
      });
    }

    const messagePersistSpan = this.observability.startSpan(
      "store.messages",
      { "copilot.run.id": runId },
      turnSpan
    );

    await this.messages.createMany(
      params.messages.map((msg) => ({
        id: msg.id || nanoid(),
        tenantId,
        runId,
        role: msg.role,
        partsJson: JSON.stringify(
          msg.parts && Array.isArray(msg.parts)
            ? msg.parts
            : [{ type: "text", text: typeof msg.content === "string" ? msg.content : "" }]
        ),
        traceId: turnSpan.traceId,
      }))
    );

    this.observability.endSpan(messagePersistSpan);

    try {
      const modelSpan = this.observability.startSpan(
        "copilot.model",
        {
          "ai.model": params.modelId ?? "unspecified",
          "ai.provider": params.modelProvider ?? "unspecified",
          "copilot.run.id": runId,
        },
        turnSpan
      );

      const result = await this.languageModel.streamChat({
        messages: params.messages,
        tools,
        runId,
        tenantId,
        userId,
        response: params.response,
        observability: modelSpan,
      });

      if (result.usage) {
        this.observability.setAttributes(modelSpan, {
          "tokens.input": result.usage.promptTokens ?? 0,
          "tokens.output": result.usage.completionTokens ?? 0,
          "tokens.total": result.usage.totalTokens ?? 0,
        });
      }

      this.observability.endSpan(modelSpan);
      this.observability.recordTurnOutput(turnSpan, {
        text: result.outputText,
        partsSummary: result.outputText ? `length:${result.outputText.length}` : "",
      });

      await this.agentRuns.updateStatus(runId, "completed", this.clock.now());

      await this.audit.write({
        tenantId,
        actorUserId: userId,
        action: "copilot.chat",
        targetType: "AgentRun",
        targetId: runId,
      });

      await this.idempotency.markCompleted({
        actionKey: ACTION_KEY,
        tenantId,
        idempotencyKey,
        responseStatus: 200,
        responseBody: { status: "STREAMED", runId },
      });
      this.observability.endSpan(turnSpan);
    } catch (error) {
      if (error instanceof Error) {
        this.observability.recordError(turnSpan, error, { "copilot.run.id": params.runId ?? "" });
      }
      this.observability.endSpan(turnSpan, {
        code: SpanStatusCode.ERROR,
        message: "copilot_stream_failed",
      });
      await this.idempotency.markFailed({
        actionKey: ACTION_KEY,
        tenantId,
        idempotencyKey,
        responseStatus: 500,
        responseBody: { error: "copilot_stream_failed" },
      });
      throw error;
    }
  }

  private hashRequest(messages: CopilotUIMessage[]): string {
    const json = JSON.stringify(messages ?? []);
    return createHash("sha256").update(json).digest("hex");
  }

  private normalizeMessages(messages: CopilotUIMessage[]): NormalizedMessageSnapshot[] {
    return messages.map((msg) => {
      const parts =
        msg.parts?.map((part) => {
          if (part.type === "text") {
            return { type: "text", text: part.text };
          }
          if (part.type === "tool-call") {
            return {
              type: "tool-call",
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              input: part.input as JsonValue,
            };
          }
          if (part.type === "tool-result") {
            return {
              type: "tool-result",
              toolCallId: part.toolCallId,
              toolName: part.toolName,
              result: part.result as JsonValue,
            };
          }
          if (part.type === "data") {
            return {
              type: "data",
              text: typeof part.data === "string" ? part.data : undefined,
            };
          }
          return { type: "text", text: "" };
        }) ?? [];

      return {
        role: msg.role as NormalizedMessageSnapshot["role"],
        content: typeof msg.content === "string" ? msg.content : undefined,
        parts: parts.length ? parts : undefined,
      };
    });
  }

  private extractLatestUserInput(messages: NormalizedMessageSnapshot[]): string | undefined {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message.role !== "user") {
        continue;
      }
      if (message.content) {
        return message.content;
      }
      const textPart = message.parts?.find((part) => part.type === "text" && part.text);
      if (textPart && textPart.text) {
        return textPart.text;
      }
    }
    return undefined;
  }
}
