import { tool } from "ai";
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
) {
  return tools
    .filter((t) => t.kind === "server" && t.execute)
    .map((t) =>
      (tool as any)({
        name: t.name,
        description: t.description,
        parameters: t.inputSchema,
        execute: async ({ input, toolCallId }: any) => {
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
            if (!t.execute) {
              throw new Error("Tool execute function not defined");
            }
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
      })
    );
}
