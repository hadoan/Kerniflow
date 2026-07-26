import { describe, expect, it } from "vitest";
import { CopilotUIMessageSchema, ListCopilotThreadMessagesResponseSchema } from "../../index";

describe("Copilot chat schemas", () => {
  it("rehydrates persisted AI SDK static tool messages without a redundant toolName", () => {
    const message = {
      id: "assistant-1",
      threadId: "thread-1",
      role: "assistant",
      parts: [
        { type: "step-start" },
        {
          type: "text",
          text: "Bản nháp chưa được lưu chính thức.",
          state: "done",
        },
        {
          type: "tool-prepare_cash_day_confirmation",
          toolCallId: "call-1",
          state: "output-available",
          input: { businessDate: "2026-07-22" },
          output: { ok: true },
        },
      ],
      metadata: { runId: "thread-1" },
      createdAt: "2026-07-26T13:45:08.277Z",
    };

    expect(
      ListCopilotThreadMessagesResponseSchema.safeParse({
        items: [message],
        nextCursor: null,
      }).success
    ).toBe(true);

    expect(CopilotUIMessageSchema.safeParse(message).success).toBe(true);
  });
});
