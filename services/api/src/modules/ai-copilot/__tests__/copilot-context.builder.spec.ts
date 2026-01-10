import { describe, expect, it } from "vitest";
import { CopilotContextBuilder } from "../application/services/copilot-context.builder";
import { type CopilotUIMessage } from "../domain/types/ui-message";
import { type CopilotTaskState } from "../domain/types/chat-task-state";

describe("CopilotContextBuilder", () => {
  it("prepends task summary when task state exists", () => {
    const builder = new CopilotContextBuilder(10);
    const messages: CopilotUIMessage[] = [
      {
        id: "user-1",
        role: "user",
        parts: [{ type: "text", text: "Generate an invoice draft." }],
      },
    ];
    const taskState: CopilotTaskState = {
      taskType: "collect_inputs",
      toolCallId: "tool-1",
      status: "pending",
      title: "Invoice Details",
      description: "Fill in missing fields.",
      originalUserText: "Generate an invoice draft.",
      requiredFields: ["dueDate"],
      createdAt: "2025-01-01T00:00:00.000Z",
    };

    const context = builder.build({ messages, taskState });

    expect(context[0].role).toBe("system");
    expect(context[0].parts?.[0]?.type).toBe("text");
    expect((context[0].parts?.[0] as any).text).toContain("Untrusted user context");
    expect((context[0].parts?.[0] as any).text).toContain("Original request");
    expect(context[1]).toEqual(messages[0]);
  });

  it("trims messages to max size while preserving task summary", () => {
    const builder = new CopilotContextBuilder(2);
    const messages: CopilotUIMessage[] = [
      { id: "m1", role: "user", parts: [{ type: "text", text: "one" }] },
      { id: "m2", role: "assistant", parts: [{ type: "text", text: "two" }] },
      { id: "m3", role: "user", parts: [{ type: "text", text: "three" }] },
    ];
    const taskState: CopilotTaskState = {
      taskType: "collect_inputs",
      toolCallId: "tool-2",
      status: "pending",
      createdAt: "2025-01-01T00:00:00.000Z",
    };

    const context = builder.build({ messages, taskState });

    expect(context).toHaveLength(3);
    expect(context[1].id).toBe("m2");
    expect(context[2].id).toBe("m3");
  });
});
