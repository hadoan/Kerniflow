import { Logger } from "@nestjs/common";
import { tool, type Tool, type ToolCallOptions } from "ai";
import { SpanStatusCode } from "@opentelemetry/api";
import type {
  DomainToolPort,
  LocalizedToolText,
  ToolLocale,
} from "../../application/ports/domain-tool.port";
import type { ToolExecutionRepositoryPort } from "../../application/ports/tool-execution-repository.port";
import type { AuditPort } from "../../application/ports/audit.port";
import type { OutboxPort } from "@corely/kernel";
import { type ObservabilityPort, type ObservabilitySpanRef, type JsonValue } from "@corely/kernel";
import { isToolInActiveAppScope } from "./app-scope";

const logger = new Logger("ToolsFactory");

export function buildAiTools(
  tools: DomainToolPort[],
  deps: {
    toolExecutions: ToolExecutionRepositoryPort;
    audit: AuditPort;
    outbox: OutboxPort;
    locale?: string;
    tenantId: string;
    workspaceId?: string;
    activeAppId?: string;
    runId: string;
    userId: string;
    observability: ObservabilityPort;
    parentSpan: ObservabilitySpanRef;
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
      description: resolveToolDescription(t.description, t.descriptions, deps.locale),
      inputSchema: t.inputSchema,
      needsApproval: t.needsApproval,
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
          traceId: deps.parentSpan.traceId,
        });
        const span = deps.observability.startSpan(
          `tool.${t.name}`,
          {
            "tool.name": t.name,
            "tool.call_id": toolCallId,
            "copilot.run.id": deps.runId,
          },
          deps.parentSpan
        );
        const startedAt = Date.now();
        try {
          if (!isToolInActiveAppScope(t.appId, deps.activeAppId)) {
            throw new Error(
              `Platform:ToolNotInAppScope (expected ${deps.activeAppId}, got ${t.appId})`
            );
          }

          const result = await t.execute({
            tenantId: deps.tenantId,
            workspaceId: deps.workspaceId,
            userId: deps.userId,
            input,
            toolCallId,
            runId: deps.runId,
            messages: options.messages,
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
          const durationMs = Date.now() - startedAt;
          deps.observability.recordToolObservation(span, {
            toolName: t.name,
            toolCallId,
            input: input as JsonValue,
            output: result as JsonValue,
            status: "ok",
            durationMs,
          });
          deps.observability.endSpan(span);
          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorStack = error instanceof Error ? error.stack : undefined;
          logger.error(
            `[tool:${t.name}] runId=${deps.runId} toolCallId=${toolCallId} FAILED: ${errorMessage}`,
            errorStack
          );
          await deps.toolExecutions.complete(deps.tenantId, deps.runId, toolCallId, {
            status: "failed",
            errorJson: errorMessage,
          });
          const durationMs = Date.now() - startedAt;
          deps.observability.recordToolObservation(span, {
            toolName: t.name,
            toolCallId,
            input: input as JsonValue,
            status: "error",
            durationMs,
            errorType: "tool",
            errorMessage,
          });
          deps.observability.endSpan(span, { code: SpanStatusCode.ERROR, message: "tool_failed" });
          throw error;
        }
      },
    }),
  ]);

  return Object.fromEntries(entries);
}

export const resolveToolLocale = (locale?: string): ToolLocale => {
  const normalized = locale?.trim().toLowerCase();

  if (normalized?.startsWith("de")) {
    return "de";
  }
  if (normalized?.startsWith("vi")) {
    return "vi";
  }

  return "en";
};

export const resolveToolDescription = (
  fallbackDescription: string,
  descriptions?: LocalizedToolText,
  locale?: string
): string => {
  if (!descriptions) {
    return fallbackDescription;
  }

  const resolvedLocale = resolveToolLocale(locale);
  return (
    descriptions[resolvedLocale] ??
    descriptions.en ??
    descriptions.de ??
    descriptions.vi ??
    fallbackDescription
  );
};
