import { nanoid } from "nanoid";
import { createHash } from "crypto";
import { SpanStatusCode } from "@opentelemetry/api";
import { createUIMessageStream, pipeUIMessageStreamToResponse } from "ai";
import { type Response } from "express";

import { type CopilotUIMessage } from "../../domain/types/ui-message";
import { type CopilotMessage } from "../../domain/entities/message.entity";
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
    messages?: CopilotUIMessage[];
    message?: CopilotUIMessage;
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
    trigger?: string;
  }): Promise<void> {
    const { tenantId, userId, idempotencyKey } = params;
    const incomingMessages = this.ensureMessageIds(
      params.messages?.length ? params.messages : params.message ? [params.message] : []
    );

    const requestHash = this.hashRequest(incomingMessages);
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

    if (!incomingMessages.length) {
      params.response.status(400).json({ code: "EMPTY_REQUEST", message: "No messages provided" });
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

    let turnClosed = false;
    const closeTurn = (withError?: { code: SpanStatusCode; message: string }) => {
      if (turnClosed) {
        return;
      }
      this.observability.endSpan(turnSpan, withError);
      turnClosed = true;
    };

    const normalizedMessages = this.normalizeMessages(incomingMessages);
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

    const historyEntities = await this.messages.listByRun({ tenantId, runId });
    const historyMessages = historyEntities.map((entity) => this.mapEntityToUIMessage(entity));
    const existingIds = new Set(historyMessages.map((msg) => msg.id).filter(Boolean) as string[]);

    const newMessagesToPersist = incomingMessages
      .map((msg) => ({ ...msg, id: msg.id || nanoid() }))
      .filter((msg) => !existingIds.has(msg.id ?? ""));

    if (newMessagesToPersist.length) {
      await this.messages.createMany(
        newMessagesToPersist.map((msg) => ({
          id: msg.id as string,
          tenantId,
          runId,
          role: msg.role,
          partsJson: JSON.stringify(this.serializeMessage(msg)),
          traceId: turnSpan.traceId,
        }))
      );
    }

    const conversation = this.mergeMessages(historyMessages, incomingMessages).map((msg) => ({
      ...msg,
      parts: Array.isArray(msg.parts) ? msg.parts : [],
    }));
    const assistantMessageId = nanoid();

    try {
      const stream = createUIMessageStream({
        originalMessages: conversation,
        onError: (error) => (error instanceof Error ? error.message : String(error)),
        onFinish: async ({ responseMessage, isContinuation, finishReason }) => {
          try {
            await this.persistAssistantMessage({
              message: responseMessage,
              tenantId,
              runId,
              traceId: turnSpan.traceId,
              isContinuation,
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
              responseBody: { status: "STREAMED", runId, finishReason },
            });

            this.observability.recordTurnOutput(turnSpan, {
              text: this.extractAssistantText(responseMessage),
              partsSummary: `parts:${responseMessage.parts?.length ?? 0}`,
            });
          } catch (error) {
            if (error instanceof Error) {
              this.observability.recordError(turnSpan, error, { "copilot.run.id": runId });
            }
          } finally {
            closeTurn();
          }
        },
        execute: async ({ writer }) => {
          const modelSpan = this.observability.startSpan(
            "copilot.model",
            {
              "ai.model": params.modelId ?? "unspecified",
              "ai.provider": params.modelProvider ?? "unspecified",
              "copilot.run.id": runId,
            },
            turnSpan
          );

          let modelSpanError: { code: SpanStatusCode; message: string } | undefined;
          try {
            const { result, usage } = await this.languageModel.streamChat({
              messages: conversation,
              tools,
              runId,
              tenantId,
              userId,
              observability: modelSpan,
            });

            if (usage) {
              this.observability.setAttributes(modelSpan, {
                "tokens.input": usage.inputTokens ?? 0,
                "tokens.output": usage.outputTokens ?? 0,
                "tokens.total": usage.totalTokens ?? 0,
              });
            }

            writer.write({
              type: "data-run",
              data: { runId },
              transient: true,
            });

            writer.merge(
              result.toUIMessageStream({
                originalMessages: conversation,
                generateMessageId: () => assistantMessageId,
                messageMetadata: () => ({ runId }),
                sendReasoning: true,
              })
            );
          } catch (error) {
            modelSpanError = {
              code: SpanStatusCode.ERROR,
              message: "copilot_model_failed",
            };
            throw error;
          } finally {
            this.observability.endSpan(modelSpan, modelSpanError);
          }
        },
      });

      pipeUIMessageStreamToResponse({
        response: params.response,
        stream,
      });
    } catch (error) {
      if (error instanceof Error) {
        this.observability.recordError(turnSpan, error, { "copilot.run.id": runId });
      }
      await this.idempotency.markFailed({
        actionKey: ACTION_KEY,
        tenantId,
        idempotencyKey,
        responseStatus: 500,
        responseBody: { error: "copilot_stream_failed" },
      });
      closeTurn({ code: SpanStatusCode.ERROR, message: "copilot_stream_failed" });
      throw error;
    }
  }

  private hashRequest(messages: CopilotUIMessage[]): string {
    const json = JSON.stringify(messages ?? []);
    return createHash("sha256").update(json).digest("hex");
  }

  private ensureMessageIds(messages: CopilotUIMessage[]): CopilotUIMessage[] {
    return messages.map((msg) => ({ ...msg, id: msg.id || nanoid() }));
  }

  private mergeMessages(
    history: CopilotUIMessage[],
    incoming: CopilotUIMessage[]
  ): CopilotUIMessage[] {
    const merged: CopilotUIMessage[] = [];
    const seen = new Set<string>();

    const pushMessage = (message: CopilotUIMessage) => {
      if (message.id) {
        if (seen.has(message.id)) {
          const index = merged.findIndex((entry) => entry.id === message.id);
          if (index >= 0) {
            merged[index] = message;
          }
          return;
        }
        seen.add(message.id);
      }
      merged.push(message);
    };

    history.forEach(pushMessage);
    incoming.forEach(pushMessage);

    return merged;
  }

  private mapEntityToUIMessage(entity: CopilotMessage): CopilotUIMessage {
    try {
      const parsed = JSON.parse(entity.partsJson);
      const parsedParts = Array.isArray(parsed?.parts)
        ? parsed.parts
        : Array.isArray(parsed)
          ? parsed
          : [];
      return {
        id: entity.id,
        role: entity.role as CopilotUIMessage["role"],
        parts: parsedParts,
        metadata: parsed?.metadata,
      };
    } catch {
      return {
        id: entity.id,
        role: entity.role as CopilotUIMessage["role"],
        parts: [],
      };
    }
  }

  private serializeMessage(message: CopilotUIMessage) {
    return {
      parts: message.parts ?? [],
      metadata: message.metadata,
    };
  }

  private async persistAssistantMessage(params: {
    message: CopilotUIMessage;
    tenantId: string;
    runId: string;
    traceId?: string;
    isContinuation: boolean;
  }) {
    const payload = JSON.stringify(this.serializeMessage(params.message));
    const id = params.message.id || nanoid();
    const record = {
      id,
      tenantId: params.tenantId,
      runId: params.runId,
      role: params.message.role ?? "assistant",
      partsJson: payload,
      traceId: params.traceId,
    };

    await this.messages.upsert(record);
    await this.syncToolExecutionsFromMessage(params.message, params.tenantId, params.runId);
  }

  private extractAssistantText(message: CopilotUIMessage): string | undefined {
    const textPart = message.parts?.find((part) => part.type === "text");
    if (textPart && "text" in textPart && typeof textPart.text === "string") {
      return textPart.text;
    }
    return undefined;
  }

  private async syncToolExecutionsFromMessage(
    message: CopilotUIMessage,
    tenantId: string,
    runId: string
  ) {
    for (const part of message.parts ?? []) {
      const toolCallId = (part as any).toolCallId as string | undefined;
      if (!toolCallId) {
        continue;
      }
      const toolName = (part as any).toolName ?? this.toolNameFromType(String(part.type));
      const state = (part as any).state as string | undefined;

      if (state === "approval-requested") {
        try {
          await this.toolExecutions.create({
            id: `${runId}:${toolCallId}`,
            tenantId,
            runId,
            toolCallId,
            toolName: toolName ?? "unknown",
            inputJson: JSON.stringify((part as any).input ?? {}),
            status: "pending-approval",
          });
        } catch {
          // ignore duplicate records
        }
      }

      if (state === "output-available") {
        try {
          await this.toolExecutions.complete(tenantId, runId, toolCallId, {
            status: "completed",
            outputJson: JSON.stringify((part as any).output ?? {}),
          });
          await this.outbox.enqueue({
            tenantId,
            eventType: "copilot.tool.completed",
            payload: { runId, tool: toolName ?? "unknown" },
          });
        } catch {
          // Swallow errors to avoid breaking the stream persistence
        }
      }

      if (state === "output-error" || state === "output-denied") {
        try {
          await this.toolExecutions.complete(tenantId, runId, toolCallId, {
            status: "failed",
            errorJson:
              state === "output-denied"
                ? "tool denied"
                : typeof (part as any).errorText === "string"
                  ? (part as any).errorText
                  : "tool_failed",
          });
        } catch {
          // ignore failures when syncing tool executions
        }
      }
    }
  }

  private toolNameFromType(type: string): string | undefined {
    if (type.startsWith("tool-")) {
      return type.replace("tool-", "");
    }
    return undefined;
  }

  private normalizeMessages(messages: CopilotUIMessage[]): NormalizedMessageSnapshot[] {
    return messages.map((msg) => {
      const parts =
        msg.parts?.map((part) => {
          if (part.type === "text") {
            return { type: "text", text: (part as any).text } as const;
          }
          if (String(part.type).startsWith("tool-")) {
            return {
              type: "tool-call",
              toolCallId: (part as any).toolCallId,
              toolName: (part as any).toolName,
              input: (part as any).input as JsonValue,
            } as const;
          }
          if (String(part.type).startsWith("data-")) {
            return {
              type: "data",
              text: typeof (part as any).data === "string" ? (part as any).data : undefined,
            } as const;
          }
          return { type: "text", text: "" } as const;
        }) ?? [];

      return {
        role: msg.role as NormalizedMessageSnapshot["role"],
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
      const textPart = message.parts?.find((part) => part.type === "text" && part.text);
      if (textPart && textPart.text) {
        return textPart.text;
      }
    }
    return undefined;
  }
}
