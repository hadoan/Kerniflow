import React from "react";
import { type CollectInputsToolInput, type CollectInputsToolOutput } from "@corely/contracts";
import { Card, CardContent, Button } from "@corely/ui";
import i18n from "@corely/web-shared/shared/i18n";
import { QuestionForm } from "@corely/web-shared/shared/components/QuestionForm";
import { Markdown } from "@corely/web-shared/shared/components/Markdown";

export type ToolRendererProps = {
  toolName: string;
  state:
    | "input-streaming"
    | "input-available"
    | "output-available"
    | "output-error"
    | "approval-requested"
    | "output-denied";
  input?: unknown;
  output?: unknown;
  error?: unknown;
  toolCallId?: string;
  addToolResult?: (params: { toolCallId: string; output: unknown; tool: string }) => unknown;
  submittingToolIds?: Set<string>;
  markSubmitting?: (id: string, value: boolean) => void;
  sendPrompt?: (prompt: string) => void;
  isChatLoading?: boolean;
};

export type ToolRenderer = (props: ToolRendererProps) => React.ReactNode;

export type ToolInvocationPart = {
  type: "dynamic-tool" | `tool-${string}` | "tool-call" | "tool-result" | "tool-invocation";
  toolInvocation?: {
    state: string;
    toolCallId: string;
    toolName: string;
    args?: unknown;
    result?: unknown;
  };
  toolCallId?: string;
  toolName?: string;
  state?: string;
  args?: unknown;
  input?: unknown;
  output?: unknown;
  result?: unknown;
  approval?: { id: string; approved?: boolean; reason?: string };
  errorText?: string;
  preliminary?: boolean;
};

export type MessagePart =
  | { type: "text"; text: string; state?: string }
  | { type: "reasoning"; text: string; state?: string }
  | { type: "file"; mediaType: string; filename?: string; url: string }
  | ToolInvocationPart
  | { type: `data-${string}`; data?: any; transient?: boolean };

export const isToolPart = (part: MessagePart): part is ToolInvocationPart =>
  part.type === "dynamic-tool" || part.type.startsWith("tool-");

export const hasVisibleText = (text?: string) => Boolean(text && text.trim().length > 0);

export const hasVisiblePart = (part: MessagePart) => {
  if (part.type.startsWith("data-")) {
    return false;
  }
  if (part.type === "text" || part.type === "reasoning") {
    return hasVisibleText(part.text);
  }
  return true;
};

export const renderPart = (
  part: MessagePart,
  helpers: {
    addToolResult?: (params: { toolCallId: string; output: unknown; tool: string }) => unknown;
    addToolApprovalResponse?: (params: {
      id: string;
      approved: boolean;
      reason?: string;
    }) => unknown;
    submittingToolIds: Set<string>;
    markSubmitting: (id: string, value: boolean) => void;
    sendPrompt?: (prompt: string) => void;
    isChatLoading?: boolean;
    toolRenderers?: Record<string, ToolRenderer>;
  }
) => {
  if (part.type === "text") {
    return <Markdown content={part.text} />;
  }

  if (part.type === "reasoning") {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
        {part.text}
      </div>
    );
  }

  if (part.type === "file") {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <div className="font-medium text-foreground">{part.filename ?? "Attachment"}</div>
        <div className="mt-0.5">{part.mediaType}</div>
      </div>
    );
  }

  if (isToolPart(part)) {
    console.log("ChatParts received tool part:", part);
    const inv = part.toolInvocation;
    const toolName =
      part.toolName ??
      inv?.toolName ??
      (part.type === "tool-invocation" ? "unknown" : part.type.replace("tool-", ""));
    const toolCallId = part.toolCallId ?? inv?.toolCallId ?? toolName;
    const input = part.input ?? part.args ?? inv?.args;
    const output = part.output ?? part.result ?? inv?.result;

    // Default mapped state for AI SDK's toolInvocation
    let state = part.state;
    if (!state && inv) {
      state = inv.state === "result" ? "output-available" : "input-available";
    }

    if (helpers.toolRenderers && helpers.toolRenderers[toolName]) {
      const Renderer = helpers.toolRenderers[toolName];
      const validStates = [
        "input-streaming",
        "input-available",
        "output-available",
        "output-error",
        "approval-requested",
        "output-denied",
      ];
      const safeState = (
        validStates.includes(state ?? "") ? state : "output-available"
      ) as ToolRendererProps["state"];

      const rendered = Renderer({
        toolName,
        state: safeState,
        input,
        output,
        error: part.errorText,
        toolCallId,
        addToolResult: helpers.addToolResult,
        submittingToolIds: helpers.submittingToolIds,
        markSubmitting: helpers.markSubmitting,
        sendPrompt: helpers.sendPrompt,
        isChatLoading: helpers.isChatLoading,
      });
      if (rendered) {
        return rendered;
      }
    }

    if (toolName === "collect_inputs" && state !== "output-available") {
      const request = input as CollectInputsToolInput | undefined;
      const isSubmitting = helpers.submittingToolIds.has(toolCallId);
      if (!request) {
        return (
          <span className="text-xs text-muted-foreground">
            {i18n.t("assistant.awaitingInputs")}
          </span>
        );
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
                output,
                tool: "collect_inputs",
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
                output: { values: {}, meta: { cancelled: true } },
                tool: "collect_inputs",
              })
            );
            helpers.markSubmitting(toolCallId, false);
          }}
        />
      );
    }

    if (state === "approval-requested" && part.approval?.id && helpers.addToolApprovalResponse) {
      const approvalId = part.approval.id;
      return (
        <Card className="border-dashed border-accent/40 bg-accent/5 shadow-[0_20px_60px_-45px_rgba(0,0,0,0.6)]">
          <CardContent className="p-4 text-xs space-y-3">
            <div className="font-semibold text-foreground">
              {i18n.t("assistant.approvalRequired", { toolName })}
            </div>
            <div className="text-muted-foreground leading-relaxed">
              {i18n.t("assistant.approvalDescription", { toolName })}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="accent"
                onClick={() =>
                  helpers.addToolApprovalResponse?.({ id: approvalId, approved: true })
                }
              >
                {i18n.t("common.allow")}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  helpers.addToolApprovalResponse?.({ id: approvalId, approved: false })
                }
              >
                {i18n.t("common.deny")}
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (state === "output-available") {
      const rawOutput = output ?? input;
      const outputRecord =
        rawOutput && typeof rawOutput === "object" ? (rawOutput as Record<string, unknown>) : null;
      const draftRecord =
        outputRecord?.draft && typeof outputRecord.draft === "object"
          ? (outputRecord.draft as Record<string, unknown>)
          : null;
      const checklistRecord =
        (draftRecord?.checklist as Record<string, unknown> | undefined) ??
        (outputRecord?.checklist as Record<string, unknown> | undefined) ??
        (outputRecord?.draftSummary &&
        typeof outputRecord.draftSummary === "object" &&
        (outputRecord.draftSummary as Record<string, unknown>).checklist &&
        typeof (outputRecord.draftSummary as Record<string, unknown>).checklist === "object"
          ? ((outputRecord.draftSummary as Record<string, unknown>).checklist as Record<
              string,
              unknown
            >)
          : undefined);
      const nextActions = Array.isArray(outputRecord?.nextRequiredActions)
        ? (outputRecord?.nextRequiredActions as Array<Record<string, unknown>>)
        : [];
      const eurStatement =
        (draftRecord?.eurStatement as Record<string, unknown> | undefined) ??
        (outputRecord?.statement as Record<string, unknown> | undefined);
      const computedRecord = draftRecord?.computed as Record<string, unknown> | undefined;
      const currency =
        (eurStatement?.currency as string | undefined) ??
        (draftRecord?.currency as string | undefined) ??
        "EUR";

      const formatCents = (value: unknown): string => {
        const cents = typeof value === "number" ? value : 0;
        const amount = cents / 100;
        return new Intl.NumberFormat(i18n.language === "de" ? "de-DE" : "en-US", {
          style: "currency",
          currency,
        }).format(amount);
      };

      const checklistItems = Array.isArray(checklistRecord?.items)
        ? (checklistRecord?.items as Array<Record<string, unknown>>)
        : [];

      const actionPromptFor = (actionId: string): string => {
        if (actionId === "generate-eur") {
          return "Generate EÜR for my current income-tax draft.";
        }
        if (actionId === "recompute") {
          return "Recompute my current income-tax draft now.";
        }
        if (actionId.startsWith("answer-")) {
          const questionId = actionId.replace("answer-", "");
          return `Ask me and confirm the answer for question ${questionId}.`;
        }
        if (actionId === "export-pdf") {
          return "Export my income-tax draft as PDF.";
        }
        if (actionId === "record-submission") {
          return "Help me record my submission confirmation.";
        }
        return "Continue with the next required action.";
      };

      if (
        toolName.startsWith("tax_") &&
        (checklistItems.length > 0 || eurStatement || computedRecord || nextActions.length > 0)
      ) {
        return (
          <Card className="border-border/60 bg-background/70 shadow-[0_14px_40px_-30px_rgba(0,0,0,0.5)]">
            <CardContent className="space-y-3 p-4 text-xs">
              <div className="font-semibold">{i18n.t("assistant.toolResult", { toolName })}</div>

              {eurStatement ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="rounded-md border border-border/50 bg-muted/40 p-2">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {i18n.t("tax.reports.eur.summary.income")}
                    </div>
                    <div className="mt-1 font-semibold">
                      {formatCents((eurStatement.totals as Record<string, unknown>)?.incomeCents)}
                    </div>
                  </div>
                  <div className="rounded-md border border-border/50 bg-muted/40 p-2">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {i18n.t("tax.reports.eur.summary.expenses")}
                    </div>
                    <div className="mt-1 font-semibold">
                      {formatCents((eurStatement.totals as Record<string, unknown>)?.expenseCents)}
                    </div>
                  </div>
                  <div className="rounded-md border border-border/50 bg-muted/40 p-2">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {i18n.t("tax.reports.eur.summary.profit")}
                    </div>
                    <div className="mt-1 font-semibold">
                      {formatCents((eurStatement.totals as Record<string, unknown>)?.profitCents)}
                    </div>
                  </div>
                </div>
              ) : null}

              {computedRecord ? (
                <div className="rounded-md border border-border/50 bg-muted/30 p-2 text-muted-foreground">
                  {i18n.t("tax.reports.eur.summary.profit")}:{" "}
                  <span className="font-semibold text-foreground">
                    {formatCents(computedRecord.estimatedIncomeTaxDueCents)}
                  </span>
                </div>
              ) : null}

              {checklistItems.length > 0 ? (
                <div className="space-y-1">
                  {checklistItems.map((item, index) => (
                    <div
                      key={String(item.id ?? index)}
                      className="rounded-md border border-border/50 bg-muted/20 px-2 py-1.5 text-muted-foreground"
                    >
                      <span className="font-medium text-foreground">
                        {String(item.severity ?? "INFO")}
                      </span>{" "}
                      {String(item.message ?? "")}
                    </div>
                  ))}
                </div>
              ) : null}

              {nextActions.length > 0 && helpers.sendPrompt ? (
                <div className="flex flex-wrap gap-2">
                  {nextActions.slice(0, 3).map((action) => {
                    const actionId = String(action.id ?? "");
                    if (!actionId) {
                      return null;
                    }
                    return (
                      <Button
                        key={actionId}
                        size="sm"
                        variant="outline"
                        onClick={() => helpers.sendPrompt?.(actionPromptFor(actionId))}
                      >
                        {String(action.label ?? actionId)}
                      </Button>
                    );
                  })}
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      }

      if (typeof rawOutput === "string") {
        return (
          <Card className="border-border/60 bg-background/70 shadow-[0_14px_40px_-30px_rgba(0,0,0,0.5)]">
            <CardContent className="p-4 text-xs space-y-2">
              <div className="font-semibold">{i18n.t("assistant.toolResult", { toolName })}</div>
              <Markdown content={rawOutput} className="text-muted-foreground" />
            </CardContent>
          </Card>
        );
      }
      return (
        <Card className="border-border/60 bg-background/70 shadow-[0_14px_40px_-30px_rgba(0,0,0,0.5)]">
          <CardContent className="p-4 text-xs space-y-2">
            <div className="font-semibold">{i18n.t("assistant.toolResult", { toolName })}</div>
            <pre className="whitespace-pre-wrap text-muted-foreground">
              {JSON.stringify(rawOutput, null, 2)}
            </pre>
          </CardContent>
        </Card>
      );
    }

    if (state === "output-error" || state === "output-denied") {
      return (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {i18n.t("assistant.toolFailed", {
            toolName,
            reason: part.errorText ?? i18n.t("assistant.denied"),
          })}
        </div>
      );
    }

    return (
      <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-accent/70" />
        {i18n.t("assistant.toolCall", { toolName, toolCallId })}
      </span>
    );
  }

  if (part.type.startsWith("data-")) {
    return null;
  }

  return null;
};
