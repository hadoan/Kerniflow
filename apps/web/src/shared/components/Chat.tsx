import React, { useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { fetchCopilotHistory, useCopilotChatOptions } from "@/lib/copilot-api";
import { QuestionForm } from "@/shared/components/QuestionForm";
import { type CollectInputsToolInput, type CollectInputsToolOutput } from "@corely/contracts";

type ToolInvocationPart = {
  type: string;
  toolCallId?: string;
  toolName?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  result?: unknown;
  approval?: { id: string; approved?: boolean; reason?: string };
  errorText?: string;
  preliminary?: boolean;
};

type MessagePart =
  | { type: "text"; text: string; state?: string }
  | { type: "reasoning"; text: string; state?: string }
  | ToolInvocationPart
  | { type: string; data?: any; transient?: boolean };

const isToolPart = (part: MessagePart): part is ToolInvocationPart =>
  part.type === "dynamic-tool" || part.type.startsWith("tool-");

const renderPart = (
  part: MessagePart,
  helpers: {
    addToolResult?: (params: { toolCallId: string; result: unknown; toolName?: string }) => unknown;
    addToolApprovalResponse?: (params: {
      id: string;
      approved: boolean;
      reason?: string;
    }) => unknown;
    submittingToolIds: Set<string>;
    markSubmitting: (id: string, value: boolean) => void;
  }
) => {
  if (part.type === "text") {
    return <span className="whitespace-pre-wrap">{part.text}</span>;
  }

  if (part.type === "reasoning") {
    return <span className="text-xs text-muted-foreground">{part.text}</span>;
  }

  if (isToolPart(part)) {
    const toolName = part.toolName ?? part.type.replace("tool-", "");
    const toolCallId = part.toolCallId || toolName;

    if (toolName === "collect_inputs" && part.state !== "output-available") {
      const request = part.input as CollectInputsToolInput | undefined;
      const isSubmitting = helpers.submittingToolIds.has(toolCallId);
      if (!request) {
        return <span className="text-xs text-muted-foreground">Awaiting collect_inputs...</span>;
      }
      return (
        <QuestionForm
          request={request}
          disabled={isSubmitting}
          onSubmit={async (output: CollectInputsToolOutput) => {
            if (!helpers.addToolResult) {
              return;
            }
            helpers.markSubmitting(toolCallId, true);
            await Promise.resolve(
              helpers.addToolResult({
                toolCallId,
                result: output,
                toolName: "collect_inputs",
              })
            );
            helpers.markSubmitting(toolCallId, false);
          }}
          onCancel={async () => {
            if (!helpers.addToolResult) {
              return;
            }
            helpers.markSubmitting(toolCallId, true);
            await Promise.resolve(
              helpers.addToolResult({
                toolCallId,
                result: { values: {}, meta: { cancelled: true } },
                toolName: "collect_inputs",
              })
            );
            helpers.markSubmitting(toolCallId, false);
          }}
        />
      );
    }

    if (
      part.state === "approval-requested" &&
      part.approval?.id &&
      helpers.addToolApprovalResponse
    ) {
      const approvalId = part.approval.id;
      return (
        <Card className="bg-background border-dashed border-primary/40">
          <CardContent className="p-3 text-xs space-y-2">
            <div className="font-semibold">Approval required: {toolName}</div>
            <div className="text-muted-foreground">
              The assistant wants to call <strong>{toolName}</strong>. Allow?
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="accent"
                onClick={() =>
                  helpers.addToolApprovalResponse?.({ id: approvalId, approved: true })
                }
              >
                Allow
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  helpers.addToolApprovalResponse?.({ id: approvalId, approved: false })
                }
              >
                Deny
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (part.state === "output-available") {
      return (
        <Card className="bg-background border-border">
          <CardContent className="p-3 text-xs space-y-1">
            <div className="font-semibold">Tool result: {toolName}</div>
            <pre className="whitespace-pre-wrap text-muted-foreground">
              {JSON.stringify(part.output ?? part.result ?? part.input, null, 2)}
            </pre>
          </CardContent>
        </Card>
      );
    }

    if (part.state === "output-error" || part.state === "output-denied") {
      return (
        <div className="text-xs text-destructive">
          Tool {toolName} failed: {part.errorText ?? "Denied"}
        </div>
      );
    }

    return (
      <span className="text-xs text-muted-foreground">
        Tool call: {toolName} ({toolCallId})...
      </span>
    );
  }

  if (part.type.startsWith("data-")) {
    return null;
  }

  return null;
};

export interface Suggestion {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}

export interface ChatProps {
  activeModule: string;
  locale?: string;
  placeholder?: string;
  suggestions?: Suggestion[];
  emptyStateTitle?: string;
  emptyStateDescription?: string;
}

export function Chat({
  activeModule,
  locale = "en",
  placeholder = "Type your message",
  suggestions = [],
  emptyStateTitle,
  emptyStateDescription,
}: ChatProps) {
  const {
    options: chatOptions,
    runId,
    apiBase,
    tenantId,
    accessToken,
  } = useCopilotChatOptions({
    activeModule,
    locale,
  });

  const chat = useChat(chatOptions);
  const [submittingToolIds, setSubmittingToolIds] = useState<Set<string>>(new Set());
  const [hydratedRunId, setHydratedRunId] = useState<string | null>(null);
  const [input, setInput] = useState("");

  // AI SDK v3 API - manage input state ourselves
  const messages = chat.messages ?? [];
  const sendMessage = (chat as any).sendMessage;
  const addToolResult = (chat as any).addToolResult;
  const addToolApprovalResponse = (chat as any).addToolApprovalResponse;
  const setMessages = chat.setMessages;
  const status = (chat as any).status;
  const isLoading = status === "streaming" || status === "awaiting-message";

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !sendMessage) {
      return;
    }

    sendMessage({
      role: "user",
      parts: [{ type: "text" as const, text: input }],
    });
    setInput("");
  };

  const markSubmitting = (id: string, value: boolean) => {
    setSubmittingToolIds((prev) => {
      const next = new Set(prev);
      if (value) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  useEffect(() => {
    // Reset messages immediately when runId changes
    if (hydratedRunId && hydratedRunId !== runId) {
      setMessages([]);
      setHydratedRunId(null);
    }

    let cancelled = false;
    void fetchCopilotHistory({ runId, apiBase, tenantId, accessToken })
      .then((history) => {
        if (cancelled) {
          return;
        }
        if (!hydratedRunId || hydratedRunId !== runId) {
          setMessages(history as any);
          setHydratedRunId(runId);
        }
      })
      .catch((error) => {
        console.error("Failed to fetch copilot history:", error);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, apiBase, hydratedRunId, runId, setMessages, tenantId]);

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-3">
        {messages.length === 0 && suggestions.length > 0 ? (
          <div className="text-center py-6 space-y-4">
            {emptyStateTitle && (
              <h3 className="text-lg font-semibold text-foreground">{emptyStateTitle}</h3>
            )}
            {emptyStateDescription && (
              <p className="text-sm text-muted-foreground">{emptyStateDescription}</p>
            )}
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((suggestion) => (
                <Button
                  key={suggestion.label}
                  variant="secondary"
                  size="sm"
                  className="gap-2"
                  onClick={() =>
                    handleInputChange({
                      target: { value: suggestion.value },
                    } as React.ChangeEvent<HTMLInputElement>)
                  }
                >
                  <suggestion.icon className="h-4 w-4" />
                  {suggestion.label}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((m) => (
          <div key={m.id} className="border border-border rounded-md p-3 space-y-2">
            <div className="text-xs uppercase text-muted-foreground">{m.role}</div>
            {m.parts?.map((p, idx) => (
              <div key={idx}>
                {renderPart(p as MessagePart, {
                  addToolResult,
                  addToolApprovalResponse,
                  submittingToolIds,
                  markSubmitting,
                })}
              </div>
            ))}
            {!m.parts?.length && m.content ? (
              <p className="whitespace-pre-wrap">{m.content as string}</p>
            ) : null}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={input}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="flex-1"
          disabled={isLoading}
        />
        <Button type="submit" variant="accent" disabled={!input || !input.trim() || isLoading}>
          {isLoading ? "Sending..." : "Send"}
        </Button>
      </form>
    </div>
  );
}
