import React from "react";
import { Button, Card, CardContent } from "@corely/ui";
import { useTranslation } from "react-i18next";
import { type CashWorkspaceHandoffDto } from "@corely/contracts";
import { Loader2 } from "lucide-react";

interface CashHandoffConfirmationCardProps {
  handoff: CashWorkspaceHandoffDto;
  isConfirming: boolean;
  onConfirm: () => void;
  isCancelling: boolean;
  onCancel: () => void;
  onNextAction: () => void;
}

export const CashHandoffConfirmationCard: React.FC<CashHandoffConfirmationCardProps> = ({
  handoff,
  isConfirming,
  onConfirm,
  isCancelling,
  onCancel,
  onNextAction,
}) => {
  const { t } = useTranslation();

  if (!handoff) {
    return null;
  }

  const isPending = handoff.status === "PENDING";
  const isConsumed = handoff.status === "CONSUMED";

  if (handoff.status === "CANCELLED" || handoff.status === "EXPIRED") {
    // If it's cancelled or expired, we might want to just hide it or show a quick notice
    return null;
  }

  const isLoading = isConfirming || isCancelling;

  // Use presentation-safe DTO labels if available, with a fallback to translation string mapping
  const displayLabel =
    handoff.movement?.display?.label ||
    t(`cashManagement.enums.entryType.${handoff.movement?.type}`, "");
  const explanation = handoff.movement?.display?.explanation || handoff.movement?.description;
  const amountStr = handoff.movement?.formattedAmount;

  if (isConsumed) {
    return (
      <Card className="mb-4 border-green-500/40 bg-green-500/5">
        <CardContent className="space-y-3 p-4">
          <div>
            <p className="text-sm font-semibold text-green-700 dark:text-green-400">
              {t("assistant.cashEntryConfirmation.saved", "Saved {{label}} {{amount}}", {
                label: displayLabel,
                amount: amountStr,
              })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onNextAction}>
              {t("assistant.cashEntryConfirmation.continueChat", "Continue recording")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4 border-accent/40 bg-accent/5">
      <CardContent className="space-y-3 p-4">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {t("assistant.cashEntryConfirmation.title", "Confirm Cash Entry")}
          </p>
          <div className="mt-1 space-y-1">
            <p className="text-sm font-medium text-foreground">{displayLabel}</p>
            <p className="text-xs text-muted-foreground">
              {explanation} ({amountStr})
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="accent"
            size="sm"
            disabled={isLoading || !isPending}
            onClick={onConfirm}
          >
            {isConfirming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("assistant.cashEntryConfirmation.confirming", "Confirming...")}
              </>
            ) : (
              t("assistant.cashEntryConfirmation.confirm", "Confirm")
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isLoading || !isPending}
            onClick={onCancel}
          >
            {isCancelling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t("common.actions.cancel", "Cancel")
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
