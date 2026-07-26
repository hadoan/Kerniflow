import { describe, expect, it } from "vitest";
import { parseCopilotHistoryPayload } from "../copilot-history";

describe("parseCopilotHistoryPayload", () => {
  it("restores static tool messages whose tool name is encoded in type", () => {
    const messages = parseCopilotHistoryPayload({
      items: [
        {
          id: "assistant-1",
          threadId: "thread-1",
          role: "assistant",
          parts: [
            { type: "text", text: "Bản nháp chưa được lưu chính thức.", state: "done" },
            {
              type: "tool-prepare_cash_day_confirmation",
              toolCallId: "call-1",
              state: "output-available",
              output: { ok: true },
            },
          ],
          metadata: { runId: "thread-1" },
          createdAt: "2026-07-26T13:45:08.277Z",
        },
      ],
      nextCursor: null,
    });

    expect(messages).toHaveLength(1);
    expect(messages[0].parts).toHaveLength(2);
  });

  it("keeps valid text when a future rich part is not recognized yet", () => {
    const messages = parseCopilotHistoryPayload({
      items: [
        {
          id: "assistant-1",
          threadId: "thread-1",
          role: "assistant",
          parts: [
            { type: "text", text: "Saved response", state: "done" },
            { type: "future-rich-part", payload: true },
          ],
          createdAt: "2026-07-26T13:45:08.277Z",
        },
      ],
      nextCursor: null,
    });

    expect(messages).toHaveLength(1);
    expect(messages[0].parts).toEqual([{ type: "text", text: "Saved response", state: "done" }]);
  });
});
