import React, { useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { useCopilotChatOptions } from "@/lib/copilot-api";
import { QuestionForm } from "@/shared/components/QuestionForm";
import { type CollectInputsToolInput, type CollectInputsToolOutput } from "@corely/contracts";

type MessagePart =
  | { type: "text"; text: string }
  | {
      type: "tool-invocation";
      toolInvocation: {
        toolName: string;
        toolCallId: string;
        args?: unknown;
        result?: unknown;
        state?: "partial-call" | "call" | "result";
      };
    }
  | { type: "tool-result"; toolName: string; toolCallId: string; result: unknown }
  | { type: "data"; data: any };

const renderPart = (
  part: MessagePart,
  helpers: {
    addToolResult?: (params: { toolCallId: string; result: unknown; toolName?: string }) => unknown;
    submittingToolIds: Set<string>;
    markSubmitting: (id: string, value: boolean) => void;
  }
) => {
  if (part.type === "text") {
    return <span className="whitespace-pre-wrap">{part.text}</span>;
  }
  if (part.type === "tool-invocation") {
    const invocation = part.toolInvocation;

    if (invocation.toolName === "collect_inputs" && invocation.state !== "result") {
      const request = invocation.args as CollectInputsToolInput | undefined;
      const isSubmitting = helpers.submittingToolIds.has(invocation.toolCallId);
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
            helpers.markSubmitting(invocation.toolCallId, true);
            await Promise.resolve(
              helpers.addToolResult({
                toolCallId: invocation.toolCallId,
                result: output,
                toolName: "collect_inputs",
              })
            );
            helpers.markSubmitting(invocation.toolCallId, false);
          }}
          onCancel={async () => {
            if (!helpers.addToolResult) {
              return;
            }
            helpers.markSubmitting(invocation.toolCallId, true);
            await Promise.resolve(
              helpers.addToolResult({
                toolCallId: invocation.toolCallId,
                result: { values: {}, meta: { cancelled: true } },
                toolName: "collect_inputs",
              })
            );
            helpers.markSubmitting(invocation.toolCallId, false);
          }}
        />
      );
    }

    if (invocation.state === "partial-call" || invocation.state === "call") {
      return (
        <span className="text-xs text-muted-foreground">
          Tool call: {invocation.toolName} ({invocation.toolCallId})...
        </span>
      );
    }
    if (invocation.state === "result") {
      return (
        <Card className="bg-background border-border">
          <CardContent className="p-3 text-xs space-y-1">
            <div className="font-semibold">Tool result: {invocation.toolName}</div>
            <pre className="whitespace-pre-wrap text-muted-foreground">
              {JSON.stringify(invocation.result ?? invocation.args, null, 2)}
            </pre>
          </CardContent>
        </Card>
      );
    }
  }
  if (part.type === "tool-result") {
    return (
      <Card className="bg-background border-border">
        <CardContent className="p-3 text-xs space-y-1">
          <div className="font-semibold">Tool result: {part.toolName}</div>
          <pre className="whitespace-pre-wrap text-muted-foreground">
            {JSON.stringify(part.result, null, 2)}
          </pre>
        </CardContent>
      </Card>
    );
  }
  if (part.type === "data") {
    return <span className="text-xs text-muted-foreground">{JSON.stringify(part.data)}</span>;
  }
  return null;
};

export function Chat() {
  const chatOptions = useCopilotChatOptions({ activeModule: "assistant" });
  const { messages, input, handleInputChange, handleSubmit, addToolResult } = useChat(chatOptions);
  const [submittingToolIds, setSubmittingToolIds] = useState<Set<string>>(new Set());

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
    console.debug("[Chat] messages", messages);
  }, [messages]);

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-3">
        {messages.map((m) => (
          <div key={m.id} className="border border-border rounded-md p-3 space-y-2">
            <div className="text-xs uppercase text-muted-foreground">{m.role}</div>
            {m.parts?.map((p, idx) => (
              <div key={idx}>
                {renderPart(p as MessagePart, { addToolResult, submittingToolIds, markSubmitting })}
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
          placeholder="Type your message"
          className="flex-1"
        />
        <Button type="submit" variant="accent" disabled={!input.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
