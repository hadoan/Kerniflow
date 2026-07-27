import {
  CopilotUIPartSchema,
  CopilotUIMessageSchema,
  ListCopilotThreadMessagesResponseSchema,
  type CopilotUIMessage,
} from "@corely/contracts";

const MESSAGE_ROLES = new Set(["user", "assistant", "system", "tool"]);

const parseCompatibleMessage = (value: unknown): CopilotUIMessage | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    typeof record.role !== "string" ||
    !MESSAGE_ROLES.has(record.role)
  ) {
    return null;
  }

  const parts = Array.isArray(record.parts)
    ? record.parts.flatMap((part) => {
        const parsed = CopilotUIPartSchema.safeParse(part);
        return parsed.success ? [parsed.data] : [];
      })
    : [];

  const parsed = CopilotUIMessageSchema.safeParse({
    id: record.id,
    role: record.role,
    parts,
    content: typeof record.content === "string" ? record.content : undefined,
    metadata: record.metadata && typeof record.metadata === "object" ? record.metadata : undefined,
  });

  return parsed.success ? parsed.data : null;
};

/**
 * Parse persisted history without letting one future or malformed rich part
 * discard every otherwise valid message in the thread.
 */
export const parseCopilotHistoryPayload = (payload: unknown): CopilotUIMessage[] => {
  const parsed = ListCopilotThreadMessagesResponseSchema.safeParse(payload);
  if (parsed.success) {
    return parsed.data.items.map((item) => ({
      id: item.id,
      role: item.role,
      parts: item.parts,
      content: item.content,
      metadata: item.metadata,
    }));
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const items = (payload as { items?: unknown }).items;
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map(parseCompatibleMessage)
    .filter((message): message is CopilotUIMessage => message !== null);
};
