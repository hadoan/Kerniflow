import { nanoid } from "nanoid";
import { type CopilotUIMessage } from "../../domain/types/ui-message";
import { type AgentRunRepositoryPort } from "../ports/agent-run.repo.port";
import { type MessageRepositoryPort } from "../ports/message.repo.port";
import { type ToolExecutionRepositoryPort } from "../ports/tool-execution.repo.port";
import { type ToolRegistryPort } from "../ports/tool-registry.port";
import { type LanguageModelPort } from "../ports/language-model.port";
import { type AuditPort } from "../ports/audit.port";
import { type OutboxPort } from "../ports/outbox.port";
import { type CopilotIdempotencyPort } from "../ports/copilot-idempotency.port";
import { type ClockPort } from "@kerniflow/kernel/ports/clock.port";
import { type Response } from "express";
import { createHash } from "crypto";

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
    private readonly clock: ClockPort
  ) {}

  async execute(params: {
    messages: CopilotUIMessage[];
    tenantId: string;
    userId: string;
    idempotencyKey: string;
    response: Response;
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

    const runId = params.messages.find((m) => m.id)?.id || nanoid();

    await this.agentRuns.create({
      id: runId,
      tenantId,
      createdByUserId: userId,
      status: "running",
    });

    const tools = this.toolRegistry.listForTenant(tenantId);

    try {
      await this.languageModel.streamChat({
        messages: params.messages,
        tools,
        runId,
        tenantId,
        userId,
        response: params.response,
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
    } catch (error) {
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
}
