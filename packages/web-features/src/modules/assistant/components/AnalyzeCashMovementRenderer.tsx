import React from "react";
import { type ToolRendererProps } from "@corely/web-shared/shared/components/chat/ChatParts";
import { Button } from "@corely/ui";
import { useTranslation } from "react-i18next";
import { CASH_CLARIFICATION_CONTENT } from "@corely/contracts";

export const AnalyzeCashMovementRenderer: React.FC<ToolRendererProps> = ({
  state,
  output,
  toolCallId,
  submittingToolIds,
  addToolResult,
}) => {
  const { t, i18n } = useTranslation();
  const result = output as any;
  
  console.log("AnalyzeCashMovementRenderer render:", { state, result, toolCallId });

  if (result?.resolution?.choiceId) {
    return (
      <div className="rounded-md border border-border/40 bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Selected</span>
      </div>
    );
  }

  if (!result || !result.resolution) {
    return <span className="text-xs text-muted-foreground">{t("assistant.analyzingCashMovement", "Analyzing cash movement...")}</span>;
  }

  if (result.resolution.kind === "REQUEST_CLARIFICATION") {
    const isSubmitting = toolCallId ? submittingToolIds?.has(toolCallId) : false;
    const clarificationType = result.resolution.clarificationType;
    
    let choices = result.resolution.choices || [];
    if (choices.length === 0 && clarificationType) {
      const content = CASH_CLARIFICATION_CONTENT[clarificationType as keyof typeof CASH_CLARIFICATION_CONTENT];
      if (content) {
        choices = content.choices;
      }
    }
    
    // We get the current locale from i18n
    const locale = i18n.language || "en";
    
    const contentInfo = clarificationType ? CASH_CLARIFICATION_CONTENT[clarificationType as keyof typeof CASH_CLARIFICATION_CONTENT] : null;
    const questionText = contentInfo?.question[locale as "en" | "de" | "vi"] 
      || contentInfo?.question.en 
      || t("assistant.clarificationNeeded", "Please clarify");
    
    return (
      <div className="flex flex-col gap-2 pt-1">
        <p className="text-sm font-medium text-foreground">
          {questionText}
        </p>
        <div className="flex flex-col gap-2 mt-2">
          {choices.map((choice: any) => (
            <Button
              key={choice.id}
              variant="outline"
              size="sm"
              className="w-full justify-start font-normal"
              disabled={isSubmitting}
              onClick={() => {
                if (addToolResult && toolCallId) {
                  addToolResult({
                    toolCallId,
                    output: { choiceId: choice.id, resolutionId: result.resolutionId },
                    tool: "analyze_cash_movement",
                  });
                }
              }}
            >
              {choice.label[locale] || choice.label.en || choice.label.de}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return null;
};
