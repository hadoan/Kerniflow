import { tool, type Tool, type ToolCallOptions } from "ai";
import type { DomainToolPort } from "../../application/ports/domain-tool.port";
import type { ToolExecutionRepositoryPort } from "../../application/ports/tool-execution-repository.port";
import type { AuditPort } from "../../application/ports/audit.port";
import type { OutboxPort } from "../../application/ports/outbox.port";

export function buildAiTools(
  tools: DomainToolPort[],
  deps: {
    toolExecutions: ToolExecutionRepositoryPort;
    audit: AuditPort;
    outbox: OutboxPort;
    tenantId: string;
    runId: string;
    userId: string;
  }
): Record<string, Tool<unknown, unknown>> {
  const serverTools = tools.filter(
    (
      candidate
    ): candidate is DomainToolPort & { execute: NonNullable<DomainToolPort["execute"]> } =>
      candidate.kind === "server" && typeof candidate.execute === "function"
  );

  const entries = serverTools.map<[string, Tool<unknown, unknown>]>((t) => [
    t.name,
    tool({
      description: t.description,
      inputSchema: t.inputSchema,
      execute: async (input: unknown, options: ToolCallOptions) => {
        const { toolCallId } = options;

        await deps.toolExecutions.create({
          id: `${deps.runId}:${toolCallId}`,
          tenantId: deps.tenantId,
          runId: deps.runId,
          toolCallId,
          toolName: t.name,
          inputJson: JSON.stringify(input),
          status: "pending",
        });
        try {
          const result = await t.execute({
            tenantId: deps.tenantId,
            userId: deps.userId,
            input,
            toolCallId,
            runId: deps.runId,
          });
          await deps.toolExecutions.complete(deps.tenantId, deps.runId, toolCallId, {
            status: "completed",
            outputJson: JSON.stringify(result),
          });
          await deps.audit.write({
            tenantId: deps.tenantId,
            actorUserId: deps.userId,
            action: `copilot.tool.${t.name}`,
            targetType: "ToolExecution",
            targetId: toolCallId,
            details: JSON.stringify({ runId: deps.runId }),
          });
          await deps.outbox.enqueue({
            tenantId: deps.tenantId,
            eventType: "copilot.tool.completed",
            payload: { runId: deps.runId, tool: t.name },
          });
          return result;
        } catch (error) {
          await deps.toolExecutions.complete(deps.tenantId, deps.runId, toolCallId, {
            status: "failed",
            errorJson: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      },
    }),
  ]);

  return Object.fromEntries(entries);
}
