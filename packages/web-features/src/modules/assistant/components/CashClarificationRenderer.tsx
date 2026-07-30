import React from "react";
import {
  type RequestCashClarificationInput,
  type RequestCashClarificationOutput,
  type CashClarificationChoiceId,
} from "@corely/contracts";
import { resolveCashClarificationContent } from "../utils/resolve-cash-clarification-content";
import { Button, Card, CardContent } from "@corely/ui";
import { type ToolRendererProps } from "@corely/web-shared/shared/components/chat/ChatParts";
import { useTranslation } from "react-i18next";

export const CashClarificationRenderer: React.FC<ToolRendererProps> = ({
  state,
  input,
  output,
  toolCallId,
  addToolResult,
  submittingToolIds,
  markSubmitting,
}) => {
  const { t, i18n } = useTranslation();
  const reqOutput = output as RequestCashClarificationOutput | undefined;

  if (state === "output-available" || reqOutput?.choiceId) {
    return (
      <div className="rounded-md border border-border/40 bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{reqOutput?.label ?? "Selected"}</span>
      </div>
    );
  }

  const reqInput = input as RequestCashClarificationInput | undefined;
  if (!reqInput?.clarificationType) {
    return <span className="text-xs text-muted-foreground">{t("assistant.loadingClarification", "Loading clarification...")}</span>;
  }

  const locale = (i18n.language ?? "en") as "en" | "de" | "vi";
  
  const { question: questionText, choices } = resolveCashClarificationContent({
    type: reqInput.clarificationType,
    allowedChoiceValues: reqInput.allowedChoiceValues || [],
    locale,
  });

  const isSubmitting = toolCallId ? submittingToolIds?.has(toolCallId) : false;

  const handleSelectChoice = async (choiceId: CashClarificationChoiceId, label: string) => {
    if (!addToolResult || !toolCallId) {
      return;
    }

    const clarificationId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `clarify-${Date.now()}`;

    markSubmitting?.(toolCallId, true);
    await Promise.resolve(
      addToolResult({
        toolCallId,
        output: {
          clarificationId,
          choiceId,
          label,
        },
        tool: "request_cash_clarification",
      })
    );
    markSubmitting?.(toolCallId, false);
  };

  return (
    <Card className="border-border/60 bg-background/80 shadow-[0_10px_30px_-20px_rgba(0,0,0,0.5)] my-2">
      <CardContent className="p-3 text-xs space-y-3">
        <p className="font-medium text-foreground text-sm leading-snug">{questionText}</p>
        <div className="flex flex-wrap gap-2">
          {choices.map((c) => (
            <Button
              key={c.id}
              size="sm"
              variant="outline"
              disabled={isSubmitting}
              className="text-xs hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => handleSelectChoice(c.id as CashClarificationChoiceId, c.label)}
            >
              {c.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
