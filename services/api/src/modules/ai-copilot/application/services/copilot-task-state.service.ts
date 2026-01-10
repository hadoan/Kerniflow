import { type CopilotUIMessage } from "../../domain/types/ui-message";
import { type CopilotTaskState } from "../../domain/types/chat-task-state";
import { type CollectInputsToolInput } from "@corely/contracts";

const getToolName = (part: unknown): string | undefined => {
  if (!part || typeof part !== "object") {
    return undefined;
  }
  const typed = part as { toolName?: string; type?: string };
  if (typed.toolName) {
    return typed.toolName;
  }
  if (typeof typed.type === "string" && typed.type.startsWith("tool-")) {
    return typed.type.slice("tool-".length);
  }
  return undefined;
};

const getToolState = (part: unknown): string | undefined => {
  if (!part || typeof part !== "object") {
    return undefined;
  }
  return (part as { state?: string }).state;
};

const getToolCallId = (part: unknown): string | undefined => {
  if (!part || typeof part !== "object") {
    return undefined;
  }
  return (part as { toolCallId?: string }).toolCallId;
};

const getToolInput = (part: unknown): CollectInputsToolInput | undefined => {
  if (!part || typeof part !== "object") {
    return undefined;
  }
  return (part as { input?: CollectInputsToolInput }).input;
};

const extractLatestUserText = (
  messages: CopilotUIMessage[],
  beforeIndex: number
): string | undefined => {
  for (let index = beforeIndex - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "user") {
      continue;
    }
    const textPart = message.parts?.find((part) => part.type === "text" && "text" in part);
    if (textPart && typeof (textPart as { text?: string }).text === "string") {
      return (textPart as { text: string }).text;
    }
  }
  return undefined;
};

export class CopilotTaskStateTracker {
  derive(messages: CopilotUIMessage[], previous?: CopilotTaskState): CopilotTaskState | undefined {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message.role !== "assistant") {
        continue;
      }
      for (const part of message.parts ?? []) {
        if (getToolName(part) !== "collect_inputs") {
          continue;
        }
        const toolCallId = getToolCallId(part);
        if (!toolCallId) {
          continue;
        }
        const toolState = getToolState(part);
        const input = getToolInput(part);
        const requiredFields =
          input?.fields
            ?.filter((field) => field.required)
            .map((field) => field.key)
            .filter(Boolean) ?? previous?.requiredFields;
        const originalUserText =
          extractLatestUserText(messages, index) ?? previous?.originalUserText;
        const now = new Date().toISOString();
        const isCompleted = toolState === "output-available";
        const base: CopilotTaskState = {
          taskType: "collect_inputs",
          toolCallId,
          status: isCompleted ? "completed" : "pending",
          title: input?.title ?? previous?.title,
          description: input?.description ?? previous?.description,
          originalUserText,
          requiredFields,
          createdAt: previous && previous.toolCallId === toolCallId ? previous.createdAt : now,
          completedAt:
            isCompleted && (!previous || previous.status !== "completed")
              ? now
              : previous?.completedAt,
        };
        return base;
      }
    }
    return previous;
  }
}
