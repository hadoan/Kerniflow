import { describe, it, expect, vi } from "vitest";
import { StreamCopilotChatUseCase } from "../application/use-cases/stream-copilot-chat.usecase";
import { CopilotContextBuilder } from "../application/services/copilot-context.builder";
import { CopilotTaskStateTracker } from "../application/services/copilot-task-state.service";
import { type CopilotUIMessage } from "../domain/types/ui-message";
import { type ChatStorePort } from "../application/ports/chat-store.port";
import { type LanguageModelPort } from "../application/ports/language-model.port";
import { type ToolRegistryPort } from "../application/ports/tool-registry.port";
import { type AgentRunRepositoryPort } from "../application/ports/agent-run-repository.port";
import { type ToolExecutionRepositoryPort } from "../application/ports/tool-execution-repository.port";
import { type AuditPort } from "../application/ports/audit.port";
import { type OutboxPort } from "../application/ports/outbox.port";
import { type CopilotIdempotencyPort } from "../application/ports/copilot-idempotency.port";
import { type ClockPort } from "@corely/kernel/ports/clock.port";
import { type ObservabilityPort, type ObservabilitySpanRef } from "@corely/kernel";

vi.mock("ai", () => ({
  createUIMessageStream: ({
    execute,
    onFinish,
    onError,
    originalMessages: _originalMessages,
  }: {
    execute: (options: {
      writer: {
        write: (part: unknown) => void;
        merge: (stream: ReadableStream) => void;
        onError?: (error: unknown) => string;
      };
    }) => void | Promise<void>;
    onFinish?: (params: {
      responseMessage: CopilotUIMessage;
      isContinuation: boolean;
      finishReason?: string;
    }) => void | Promise<void>;
    onError?: (error: unknown) => string;
    originalMessages?: CopilotUIMessage[];
  }) => {
    void Promise.resolve(
      execute({
        writer: {
          write: () => undefined,
          merge: () => undefined,
          onError,
        },
      })
    );

    void Promise.resolve(
      onFinish?.({
        responseMessage: { id: "assistant-response", role: "assistant", parts: [] },
        isContinuation: false,
        finishReason: "stop",
      })
    );

    return new ReadableStream({
      start(controller) {
        controller.close();
      },
    });
  },
  pipeUIMessageStreamToResponse: () => undefined,
}));

describe("StreamCopilotChatUseCase persistence", () => {
  it("rehydrates history so tool continuation includes original user request", async () => {
    const userMessage: CopilotUIMessage = {
      id: "user-1",
      role: "user",
      parts: [{ type: "text", text: "Generate an invoice draft for ACME GmbH for this month." }],
    };
    const toolCallMessage: CopilotUIMessage = {
      id: "assistant-1",
      role: "assistant",
      parts: [
        {
          type: "tool-call",
          toolCallId: "tool-1",
          toolName: "collect_inputs",
          state: "input-available",
          input: {
            title: "Invoice Details",
            fields: [{ key: "dueDate", label: "Due Date", type: "date", required: true }],
          },
        },
      ],
    };
    const toolResultMessage: CopilotUIMessage = {
      id: "assistant-1",
      role: "assistant",
      parts: [
        {
          type: "tool-result",
          toolCallId: "tool-1",
          toolName: "collect_inputs",
          state: "output-available",
          output: {
            values: { dueDate: "2025-01-31" },
            meta: { filledAt: "2025-01-15T12:00:00Z", editedKeys: ["dueDate"] },
          },
        },
      ],
    };

    const saveCalls: Array<{ messages: CopilotUIMessage[]; metadata?: any }> = [];
    const chatStore: ChatStorePort = {
      load: vi.fn(async () => ({ messages: [userMessage, toolCallMessage] })),
      save: vi.fn(async (params) => {
        saveCalls.push({ messages: params.messages, metadata: params.metadata });
      }),
    };

    let modelMessages: CopilotUIMessage[] | undefined;
    const languageModel: LanguageModelPort = {
      streamChat: vi.fn(async (params) => {
        modelMessages = params.messages;
        return {
          result: {
            toUIMessageStream: () =>
              new ReadableStream({
                start(controller) {
                  controller.close();
                },
              }),
          } as any,
        };
      }),
    };

    const agentRuns: AgentRunRepositoryPort = {
      create: vi.fn(async () => ({ id: "run-1" }) as any),
      updateStatus: vi.fn(async () => undefined),
      findById: vi.fn(async () => null),
    };

    const toolExecutions: ToolExecutionRepositoryPort = {
      create: vi.fn(async () => undefined),
      complete: vi.fn(async () => undefined),
    };

    const toolRegistry: ToolRegistryPort = {
      listForTenant: () => [],
    };

    const audit: AuditPort = {
      write: vi.fn(async () => undefined),
    };

    const outbox: OutboxPort = {
      enqueue: vi.fn(async () => undefined),
    };

    const idempotency: CopilotIdempotencyPort = {
      startOrReplay: vi.fn(async () => ({ mode: "STARTED" })),
      markCompleted: vi.fn(async () => undefined),
      markFailed: vi.fn(async () => undefined),
    };

    const clock: ClockPort = {
      now: () => new Date(),
    };

    const spanRef: ObservabilitySpanRef = {
      traceId: "trace-1",
      spanId: "span-1",
      span: {} as any,
      context: {} as any,
    };

    const observability: ObservabilityPort = {
      startTurnTrace: () => spanRef,
      setAttributes: vi.fn(),
      recordTurnInput: vi.fn(),
      recordTurnOutput: vi.fn(),
      startSpan: () => spanRef,
      endSpan: vi.fn(),
      recordToolObservation: vi.fn(),
      recordError: vi.fn(),
      flush: vi.fn(async () => undefined),
    };

    const useCase = new StreamCopilotChatUseCase(
      agentRuns,
      chatStore,
      toolExecutions,
      toolRegistry,
      languageModel,
      audit,
      outbox,
      idempotency,
      clock,
      observability,
      new CopilotContextBuilder(),
      new CopilotTaskStateTracker()
    );

    await useCase.execute({
      message: toolResultMessage,
      tenantId: "tenant-1",
      userId: "user-1",
      idempotencyKey: "idem-1",
      runId: "run-1",
      response: {} as any,
      requestId: "request-1",
      workspaceId: "tenant-1",
      workspaceKind: "COMPANY",
      environment: "test",
    });

    expect(modelMessages).toBeDefined();
    const hasOriginalUserText = modelMessages?.some(
      (message) =>
        message.role === "user" &&
        message.parts?.some(
          (part) => part.type === "text" && part.text?.includes("Generate an invoice draft")
        )
    );
    expect(hasOriginalUserText).toBe(true);

    const savedToolResult = saveCalls.some((call) =>
      call.messages.some((message) =>
        message.parts?.some(
          (part) =>
            part.type === "tool-result" &&
            (part as any).toolCallId === "tool-1" &&
            (part as any).output?.values?.dueDate === "2025-01-31"
        )
      )
    );
    expect(savedToolResult).toBe(true);
  });
});
