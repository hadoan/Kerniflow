import { describe, expect, it } from "vitest";
import { CopilotTaskStateTracker } from "../application/services/copilot-task-state.service";
import { type CopilotUIMessage } from "../domain/types/ui-message";

describe("CopilotTaskStateTracker", () => {
  it("derives task state from collect_inputs tool call", () => {
    const tracker = new CopilotTaskStateTracker();
    const messages: CopilotUIMessage[] = [
      {
        id: "user-1",
        role: "user",
        parts: [{ type: "text", text: "Generate an invoice draft for ACME." }],
      },
      {
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
              description: "Provide missing fields.",
              fields: [
                { key: "dueDate", label: "Due Date", type: "date", required: true },
                { key: "notes", label: "Notes", type: "text", required: false },
              ],
            },
          },
        ],
      },
    ];

    const taskState = tracker.derive(messages);

    expect(taskState?.taskType).toBe("collect_inputs");
    expect(taskState?.toolCallId).toBe("tool-1");
    expect(taskState?.status).toBe("pending");
    expect(taskState?.title).toBe("Invoice Details");
    expect(taskState?.description).toBe("Provide missing fields.");
    expect(taskState?.originalUserText).toBe("Generate an invoice draft for ACME.");
    expect(taskState?.requiredFields).toEqual(["dueDate"]);
    expect(taskState?.createdAt).toBeDefined();
  });

  it("keeps original user context when tool output arrives", () => {
    const tracker = new CopilotTaskStateTracker();
    const pending: CopilotUIMessage[] = [
      {
        id: "user-1",
        role: "user",
        parts: [{ type: "text", text: "Generate an invoice draft." }],
      },
      {
        id: "assistant-1",
        role: "assistant",
        parts: [
          {
            type: "tool-call",
            toolCallId: "tool-2",
            toolName: "collect_inputs",
            state: "input-available",
            input: {
              title: "Invoice Details",
              fields: [{ key: "dueDate", label: "Due Date", type: "date", required: true }],
            },
          },
        ],
      },
    ];

    const pendingState = tracker.derive(pending);
    const completedMessages: CopilotUIMessage[] = [
      ...pending,
      {
        id: "assistant-2",
        role: "assistant",
        parts: [
          {
            type: "tool-result",
            toolCallId: "tool-2",
            toolName: "collect_inputs",
            state: "output-available",
            output: { values: { dueDate: "2025-01-31" } },
          },
        ],
      },
    ];

    const completedState = tracker.derive(completedMessages, pendingState);

    expect(completedState?.status).toBe("completed");
    expect(completedState?.originalUserText).toBe("Generate an invoice draft.");
    expect(completedState?.requiredFields).toEqual(["dueDate"]);
    expect(completedState?.completedAt).toBeDefined();
  });
});
