import React, { useState } from "react";
import { type ToolRendererProps } from "@corely/web-shared/shared/components/chat/ChatParts";
import { Button } from "@corely/ui";
import { useTranslation } from "react-i18next";
import { resolveCashClarificationContent } from "../utils/resolve-cash-clarification-content";
import { cashManagementApi } from "@corely/web-shared/lib/cash-management-api";
import { CashEntryConfirmationRenderer } from "./CashEntryConfirmationRenderer";

type CashMovementResolutionOutput = {
  resolution?: {
    kind?: string;
    choiceId?: string;
    clarificationType?: string;
    allowedChoiceValues?: string[];
  };
  resolutionId?: string;
  extraction?: CashMovementExtractionInput;
};

type ResolvedCashMovementOutput = {
  uiResult?: {
    kind?: string;
    resolutionId?: string;
    clarification?: {
      type?: string;
      choices?: Array<{ value?: string; label?: string }>;
    };
    confirmation?: {
      id?: string;
      registerId?: string;
      status?: "PENDING" | "CONFIRMED" | "CONSUMED" | "EXPIRED";
      entryType?: string;
      direction?: string;
      amountCents?: number;
      businessDate?: string;
      candidatePayload?: {
        movementType: string;
        amountCents: number;
        description: string;
        direction?: string;
      };
    };
  };
};

type ClarificationChoice = {
  id: string;
  label: string;
};

type CashMovementExtractionInput = {
  amountCents?: number;
};

const isResolutionOutput = (value: unknown): value is CashMovementResolutionOutput =>
  typeof value === "object" && value !== null && "resolution" in value;

const isResolvedOutput = (value: unknown): value is ResolvedCashMovementOutput =>
  typeof value === "object" && value !== null && "uiResult" in value;

const getExtractionInput = (value: unknown): CashMovementExtractionInput => {
  if (!value || typeof value !== "object") {
    return {};
  }
  const amountCents = (value as Record<string, unknown>).amountCents;
  return typeof amountCents === "number" ? { amountCents } : {};
};

export const AnalyzeCashMovementRenderer: React.FC<
  ToolRendererProps & { conversationId?: string }
> = ({ state, input, output, toolCallId, submittingToolIds, conversationId }) => {
  const { t, i18n } = useTranslation();
  const [resolvedOutput, setResolvedOutput] = useState<ResolvedCashMovementOutput | null>(null);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const initialResult = isResolutionOutput(output) ? output : undefined;
  const extraction = getExtractionInput(initialResult?.extraction ?? input);
  const nextClarification = resolvedOutput?.uiResult;
  const result =
    nextClarification?.kind === "REQUEST_CLARIFICATION" &&
    nextClarification.resolutionId &&
    nextClarification.clarification
      ? {
          resolution: {
            kind: "REQUEST_CLARIFICATION",
            clarificationType: nextClarification.clarification.type,
            allowedChoiceValues: nextClarification.clarification.choices
              ?.map((choice) => choice.value)
              .filter((value): value is string => typeof value === "string"),
          },
          resolutionId: nextClarification.resolutionId,
        }
      : initialResult;

  if (resolvedOutput?.uiResult?.kind === "PREPARE_ENTRY_CONFIRMATION") {
    const confirmation = resolvedOutput.uiResult.confirmation;
    if (
      confirmation?.id &&
      confirmation.registerId &&
      confirmation.status === "PENDING" &&
      confirmation.businessDate &&
      confirmation.candidatePayload
    ) {
      return (
        <CashEntryConfirmationRenderer
          state="output-available"
          toolName="prepare_cash_entry_confirmation"
          output={{
            ok: true,
            confirmation: {
              id: confirmation.id,
              registerId: confirmation.registerId,
              status: confirmation.status,
              businessDate: confirmation.businessDate,
              candidatePayload: confirmation.candidatePayload,
            },
          }}
        />
      );
    }

    const amount = confirmation?.amountCents ? confirmation.amountCents / 100 : undefined;
    return (
      <div className="rounded-md border border-border/40 bg-muted/20 px-3 py-2 text-sm text-foreground">
        {t("cashDashboard.assistant.entryPrepared", "Entry prepared")}: {confirmation?.entryType} ·{" "}
        {confirmation?.direction}
        {amount !== undefined
          ? ` · ${amount.toLocaleString(i18n.language, { style: "currency", currency: "EUR" })}`
          : ""}
      </div>
    );
  }

  if (resolvedOutput?.uiResult?.kind === "NOT_A_CASHBOOK_ENTRY") {
    return (
      <div className="rounded-md border border-border/40 bg-muted/20 px-3 py-2 text-sm text-foreground">
        {t("cashDashboard.assistant.notCashbookEntry", "This is not a cashbook entry.")}
      </div>
    );
  }

  if (result?.resolution?.choiceId) {
    return (
      <div className="rounded-md border border-border/40 bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Selected</span>
      </div>
    );
  }

  if (!result?.resolution) {
    return (
      <span className="text-xs text-muted-foreground">
        {t("assistant.analyzingCashMovement", "Analyzing cash movement...")}
      </span>
    );
  }

  if (result.resolution.kind === "REQUEST_CLARIFICATION") {
    const isSubmitting = isAnswering || (toolCallId ? submittingToolIds?.has(toolCallId) : false);
    const clarificationType = result.resolution.clarificationType;
    const allowedChoiceValues = result.resolution.allowedChoiceValues || [];

    // We get the current locale from i18n
    const locale = i18n.language || "en";

    const { question: questionText, choices } = resolveCashClarificationContent({
      type: clarificationType,
      allowedChoiceValues,
      locale,
      amountCents: extraction.amountCents,
    });

    return (
      <div className="flex flex-col gap-2 pt-1">
        <p className="text-sm font-medium text-foreground">{questionText}</p>
        <div className="flex flex-col gap-2 mt-2">
          {choices.map((choice: ClarificationChoice) => (
            <Button
              key={choice.id}
              variant="outline"
              size="sm"
              className="w-full justify-start font-normal"
              disabled={isSubmitting}
              onClick={async () => {
                if (!conversationId || !result.resolutionId) {
                  setAnswerError(t("assistant.tryAgain", "Please try again."));
                  return;
                }
                setIsAnswering(true);
                setAnswerError(null);
                try {
                  const response = await cashManagementApi.answerCashMovementResolution(
                    conversationId,
                    result.resolutionId,
                    1,
                    { choiceId: choice.id }
                  );
                  if (!isResolvedOutput(response)) {
                    throw new Error("Invalid resolution response");
                  }
                  setResolvedOutput(response);
                } catch {
                  setAnswerError(t("assistant.tryAgain", "Please try again."));
                } finally {
                  setIsAnswering(false);
                }
              }}
            >
              {choice.label}
            </Button>
          ))}
        </div>
        {answerError ? <p className="text-sm text-destructive">{answerError}</p> : null}
      </div>
    );
  }

  return null;
};
