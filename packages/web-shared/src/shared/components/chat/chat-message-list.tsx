import { Badge } from "@corely/ui";
import { cn } from "@corely/web-shared/shared/lib/utils";

import { type MessagePart, type ToolRenderer, isToolPart, renderPart } from "./ChatParts";

export interface ChatMessage {
  id?: string;
  role: string;
  parts?: unknown;
  content?: unknown;
}

export type RoleStyle = {
  label: string;
  align: string;
  badge: "accent" | "muted" | "warning";
  bubble: string;
  tail: string;
};

type ToolResultHandler = (params: { toolCallId: string; output: unknown; tool: string }) => void;
type ToolApprovalHandler = (params: { id: string; approved: boolean; reason?: string }) => void;

interface ChatMessageListProps {
  messages: ChatMessage[];
  highlightedMessageId: string | null;
  getRoleStyle: (role: string) => RoleStyle;
  submittingToolIds: Set<string>;
  markSubmitting: (id: string, value: boolean) => void;
  addToolResult?: ToolResultHandler;
  addToolApprovalResponse?: ToolApprovalHandler;
  showWaitingStatus: boolean;
  statusText?: string;
  toolRenderers?: Record<string, ToolRenderer>;
}

export function ChatMessageList({
  messages,
  highlightedMessageId,
  getRoleStyle,
  submittingToolIds,
  markSubmitting,
  addToolResult,
  addToolApprovalResponse,
  showWaitingStatus,
  statusText,
  toolRenderers,
}: ChatMessageListProps) {
  return (
    <div className="space-y-6">
      {messages.map((message, index) => {
        const roleStyle = getRoleStyle(message.role);
        const messageId = message.id ?? `${message.role}-${index}`;
        const normalizedParts = (
          message.parts && Array.isArray(message.parts) && message.parts.length > 0
            ? (message.parts as MessagePart[])
            : message.content
              ? [{ type: "text", text: String(message.content) } as MessagePart]
              : []
        ).filter(Boolean);
        const visibleParts = normalizedParts.filter((part) => !part.type.startsWith("data-"));

        if (visibleParts.length === 0) {
          return null;
        }

        return (
          <div
            key={messageId}
            data-message-id={message.id}
            className={cn(
              "flex flex-col gap-2 rounded-2xl p-2 transition-colors",
              roleStyle.align,
              highlightedMessageId === message.id ? "bg-accent/10" : ""
            )}
          >
            <div
              className={cn(
                "flex items-center gap-2",
                message.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              <Badge variant={roleStyle.badge} className="uppercase tracking-[0.2em] text-[10px]">
                {roleStyle.label}
              </Badge>
            </div>
            <div className={cn("flex flex-col gap-2", roleStyle.align)}>
              {visibleParts.map((part, partIndex) => {
                const rendered = renderPart(part, {
                  addToolResult,
                  addToolApprovalResponse,
                  submittingToolIds,
                  markSubmitting,
                  toolRenderers,
                });
                if (!rendered) {
                  return null;
                }
                if (isToolPart(part)) {
                  return (
                    <div
                      key={`${messageId}-${partIndex}`}
                      className="w-full max-w-[min(720px,100%)]"
                    >
                      {rendered}
                    </div>
                  );
                }
                return (
                  <div
                    key={`${messageId}-${partIndex}`}
                    className={cn(
                      "max-w-[min(720px,100%)] rounded-2xl px-4 py-3 text-sm leading-relaxed backdrop-blur",
                      roleStyle.bubble,
                      roleStyle.tail
                    )}
                  >
                    {rendered}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {showWaitingStatus && statusText ? (
        <div className="flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-accent/30 border-t-accent"
            />
            <span aria-live="polite" aria-atomic="true">
              {statusText}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
