import React, { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  Loader2,
  Paperclip,
  Send,
  Sparkles,
  Wand2,
  FileText,
  Receipt,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { useCopilotChatOptions } from "@/lib/copilot-api";
import { cn } from "@/shared/lib/utils";
import { QuestionForm } from "@/shared/components/QuestionForm";
import { type CollectInputsToolInput, type CollectInputsToolOutput } from "@corely/contracts";

type MessagePart =
  | { type: "text"; text: string }
  | {
      type: "tool-call";
      toolName: string;
      toolCallId: string;
      input: unknown;
      state?: "partial" | "full";
    }
  | { type: "tool-result"; toolName: string; toolCallId: string; result: unknown }
  | { type: "data"; data: any };

const suggestions = [
  {
    icon: Receipt,
    label: "Extract a receipt and create an expense",
    value: "I uploaded a receipt. Extract it and draft an expense.",
  },
  {
    icon: FileText,
    label: "Generate an invoice draft",
    value: "Generate an invoice draft for ACME GmbH for this month.",
  },
  {
    icon: TrendingUp,
    label: "Summarize my expenses",
    value: "Summarize my expenses for the last 30 days.",
  },
  {
    icon: AlertCircle,
    label: "Tax guidance",
    value: "What can I deduct as a freelancer in Germany?",
  },
];

const MessageBubble: React.FC<{ role: string; children: React.ReactNode }> = ({
  role,
  children,
}) => (
  <div
    className={cn(
      "max-w-3xl w-full rounded-2xl px-4 py-3 shadow-sm border",
      role === "user"
        ? "ml-auto bg-accent text-accent-foreground border-accent/30"
        : "bg-muted text-foreground border-border"
    )}
  >
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{role}</div>
    <div className="space-y-2 text-sm leading-relaxed">{children}</div>
  </div>
);

const renderPart = (
  part: MessagePart,
  helpers: {
    addToolResult?: (params: { toolCallId: string; result: unknown; toolName?: string }) => unknown;
    submittingToolIds: Set<string>;
    markSubmitting: (id: string, value: boolean) => void;
  }
) => {
  if (part.type === "text") {
    return <p className="whitespace-pre-wrap">{part.text}</p>;
  }
  if (part.type === "tool-call") {
    if (part.toolName === "collect_inputs" && part.input) {
      const request = part.input as CollectInputsToolInput;
      const isSubmitting = helpers.submittingToolIds.has(part.toolCallId);
      return (
        <QuestionForm
          request={request}
          disabled={isSubmitting}
          onSubmit={async (output: CollectInputsToolOutput) => {
            if (!helpers.addToolResult) {return;}
            helpers.markSubmitting(part.toolCallId, true);
            await Promise.resolve(
              helpers.addToolResult({
                toolCallId: part.toolCallId,
                result: output,
                toolName: "collect_inputs",
              })
            );
            helpers.markSubmitting(part.toolCallId, false);
          }}
          onCancel={async () => {
            if (!helpers.addToolResult) {return;}
            helpers.markSubmitting(part.toolCallId, true);
            await Promise.resolve(
              helpers.addToolResult({
                toolCallId: part.toolCallId,
                result: { values: {}, meta: { cancelled: true } },
                toolName: "collect_inputs",
              })
            );
            helpers.markSubmitting(part.toolCallId, false);
          }}
        />
      );
    }
    return (
      <div className="text-xs text-muted-foreground">
        Tool call: {part.toolName} ({part.toolCallId})
      </div>
    );
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
    return (
      <div className="text-[11px] text-muted-foreground">meta: {JSON.stringify(part.data)}</div>
    );
  }
  return null;
};

export default function AssistantPage() {
  const { t, i18n } = useTranslation();
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [submittingToolIds, setSubmittingToolIds] = useState<Set<string>>(new Set());
  const chatOptions = useCopilotChatOptions({
    activeModule: "assistant",
    locale: i18n.language.startsWith("de") ? "de" : "en",
  });

  const { messages, input, handleInputChange, handleSubmit, isLoading, addToolResult } =
    useChat(chatOptions);

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

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] lg:h-screen" data-testid="assistant-chat">
      <header className="flex-shrink-0 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">{t("assistant.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("common.tagline")}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-6" data-testid="assistant-messages">
          {messages.length === 0 ? (
            <div className="text-center py-12 space-y-6">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-accent/10">
                <Wand2 className="h-8 w-8 text-accent" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">
                  {i18n.language === "de" ? "Wie kann ich Ihnen helfen?" : "How can I help you?"}
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  {i18n.language === "de"
                    ? "Stellen Sie Fragen, lassen Sie Belege auslesen, generieren Sie Rechnungen oder bitten Sie um Analysen."
                    : "Ask anything, extract receipts, generate invoices, or request quick summaries."}
                </p>
              </div>
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

          <div className="space-y-4">
            {messages.map((m) => (
              <div key={m.id} className="flex">
                {m.role === "assistant" && (
                  <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mr-3">
                    <Sparkles className="h-4 w-4 text-accent" />
                  </div>
                )}
                <MessageBubble role={m.role}>
                  {(m.parts as MessagePart[] | undefined)?.length
                    ? (m.parts as MessagePart[]).map((p, idx) => (
                        <div key={idx}>
                          {renderPart(p, { addToolResult, submittingToolIds, markSubmitting })}
                        </div>
                      ))
                    : m.content && <p className="whitespace-pre-wrap">{m.content}</p>}
                </MessageBubble>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="flex-shrink-0 border-t border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 space-y-2">
          {attachedFile ? (
            <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-muted">
              <Paperclip className="h-4 w-4" />
              <span className="flex-1 truncate">{attachedFile.name}</span>
              <Button variant="ghost" size="sm" onClick={() => setAttachedFile(null)}>
                {t("common.remove")}
              </Button>
            </div>
          ) : null}
          <form onSubmit={handleSubmit} className="flex gap-2 items-center">
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder={t("assistant.placeholder")}
              data-testid="assistant-input"
              className="flex-1"
            />
            <Button
              type="submit"
              variant="accent"
              size="icon"
              data-testid="assistant-submit"
              disabled={!input.trim() || isLoading}
              className="shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </footer>
    </div>
  );
}
