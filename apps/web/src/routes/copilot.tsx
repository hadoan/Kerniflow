import React, { useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { nanoid } from "nanoid";
import { createIdempotencyKey } from "@kerniflow/api-client";
import { Button } from "@/shared/ui/button";

type MessagePart =
  | { type: "text"; text: string }
  | { type: "tool-call"; toolName: string; toolCallId: string; input: unknown }
  | { type: "tool-result"; toolName: string; toolCallId: string; result: unknown }
  | { type: "data"; data: any };

const ConfirmCard: React.FC<{
  toolCallId: string;
  toolName: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ toolCallId, toolName, onConfirm, onCancel }) => (
  <div className="border rounded p-3 my-2 bg-white shadow-sm">
    <div className="text-sm font-semibold">Tool confirmation</div>
    <div className="text-xs text-gray-600">
      {toolName} (call: {toolCallId})
    </div>
    <div className="flex gap-2 mt-2">
      <Button size="sm" onClick={onConfirm} data-testid={`confirm-${toolCallId}`}>
        Confirm
      </Button>
      <Button size="sm" variant="secondary" onClick={onCancel} data-testid={`cancel-${toolCallId}`}>
        Cancel
      </Button>
    </div>
  </div>
);

const MessageBubble: React.FC<{
  role: string;
  children: React.ReactNode;
}> = ({ role, children }) => (
  <div
    className={`max-w-3xl w-full p-3 rounded-lg ${
      role === "user" ? "bg-blue-50 text-gray-900 ml-auto" : "bg-gray-50 text-gray-900"
    } border border-gray-200 shadow-sm`}
  >
    <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">{role}</div>
    <div className="space-y-1 text-sm leading-relaxed">{children}</div>
  </div>
);

export const CopilotPage: React.FC = () => {
  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
  const tenantId = "demo-tenant"; // TODO: pull from auth/tenant context
  const accessToken = ""; // TODO: pull from auth context

  const chatOptions = useMemo(
    () =>
      ({
        api: `${apiBase}/copilot/chat`,
        headers: {
          Authorization: accessToken ? `Bearer ${accessToken}` : "",
          "X-Tenant-Id": tenantId,
          "X-Idempotency-Key": createIdempotencyKey(),
        },
        body: {
          requestData: {
            tenantId,
            locale: "en",
            activeModule: "freelancer",
          },
        },
      }) as any,
    [apiBase, tenantId, accessToken]
  );

  const { messages, input, handleInputChange, handleSubmit, addToolResult } = useChat(chatOptions);

  const renderPart = (part: MessagePart, messageId: string) => {
    if (part.type === "text") {
      return <p className="whitespace-pre-wrap">{part.text}</p>;
    }
    if (part.type === "tool-call") {
      if (part.toolName === "invoice.issue" || part.toolName === "expense.confirmCreate") {
        return (
          <ConfirmCard
            key={part.toolCallId}
            toolCallId={part.toolCallId}
            toolName={part.toolName}
            onConfirm={() =>
              addToolResult?.({
                toolCallId: part.toolCallId,
                result: { confirmed: true },
                toolName: part.toolName,
              } as any)
            }
            onCancel={() =>
              addToolResult?.({
                toolCallId: part.toolCallId,
                result: { confirmed: false },
                toolName: part.toolName,
              } as any)
            }
          />
        );
      }
      return (
        <div className="text-xs text-gray-600">
          Tool call: {part.toolName} ({part.toolCallId})
        </div>
      );
    }
    if (part.type === "tool-result") {
      return (
        <div className="text-xs text-green-700">
          Tool result {part.toolName}: {JSON.stringify(part.result)}
        </div>
      );
    }
    if (part.type === "data") {
      return (
        <div className="text-[11px] text-gray-500">
          meta {messageId}: {JSON.stringify(part.data)}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Copilot</h1>

      <div className="border rounded p-3 h-[60vh] overflow-y-auto bg-white shadow-sm">
        {messages.map((m) => (
          <div key={m.id} className="mb-3 flex flex-col gap-1">
            <MessageBubble role={m.role}>
              {(m.parts as MessagePart[] | undefined)?.length
                ? (m.parts as MessagePart[]).map((p, idx) => (
                    <div key={idx}>{renderPart(p, m.id)}</div>
                  ))
                : m.content && <p className="whitespace-pre-wrap">{m.content}</p>}
            </MessageBubble>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          className="flex-1 border rounded px-3 py-2"
          value={input}
          onChange={handleInputChange}
          placeholder="Ask Copilot..."
        />
        <Button type="submit">Send</Button>
      </form>
    </div>
  );
};

export default CopilotPage;
