import { nanoid } from "nanoid";
import { CopilotUIMessage } from "../../domain/types/ui-message";
import { AgentRunRepositoryPort } from "../ports/agent-run.repo.port";
import { MessageRepositoryPort } from "../ports/message.repo.port";
import { ToolExecutionRepositoryPort } from "../ports/tool-execution.repo.port";
import { ToolRegistryPort } from "../ports/tool-registry.port";
import { LanguageModelPort } from "../ports/language-model.port";
import { AuditPort } from "../ports/audit.port";
import { OutboxPort } from "../ports/outbox.port";
import { IdempotencyPort } from "../ports/idempotency.port";
import { ClockPort } from "@kerniflow/kernel/ports/clock.port";
import { Response } from "express";

export class StreamCopilotChatUseCase {
  constructor(
    private readonly agentRuns: AgentRunRepositoryPort,
    private readonly messages: MessageRepositoryPort,
    private readonly toolExecutions: ToolExecutionRepositoryPort,
    private readonly toolRegistry: ToolRegistryPort,
    private readonly languageModel: LanguageModelPort,
    private readonly audit: AuditPort,
    private readonly outbox: OutboxPort,
    private readonly idempotency: IdempotencyPort,
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
    const ok = await this.idempotency.checkAndInsert(idempotencyKey, tenantId);
    if (!ok) {
      // Already processed; return 409 to let client retry later
      params.response.status(409).json({ error: "Duplicate idempotency key" });
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
  }
}
