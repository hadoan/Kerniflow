import React, { useState } from "react";
import { Button, Card, CardContent } from "@corely/ui";
import { type ToolRendererProps } from "@corely/web-shared/shared/components/chat/ChatParts";
import { useTranslation } from "react-i18next";
import { formatMoney } from "@corely/web-shared/shared/lib/formatters";
import { cashManagementApi } from "@corely/web-shared/lib/cash-management-api";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

type PendingEntryConfirmationOutput = {
  ok: true;
  confirmation: {
    id: string;
    registerId: string;
    status: "PENDING";
    businessDate: string;
    candidatePayload: {
      movementType: string;
      amountCents: number;
      description: string;
      direction?: string;
    };
  };
};

const isPendingEntryConfirmation = (value: unknown): value is PendingEntryConfirmationOutput => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const result = value as Record<string, unknown>;
  if (result.ok !== true || !result.confirmation || typeof result.confirmation !== "object") {
    return false;
  }
  const confirmation = result.confirmation as Record<string, unknown>;
  return (
    confirmation.status === "PENDING" &&
    typeof confirmation.businessDate === "string" &&
    typeof confirmation.candidatePayload === "object" &&
    typeof confirmation.id === "string" &&
    typeof confirmation.registerId === "string"
  );
};

export const CashEntryConfirmationRenderer: React.FC<ToolRendererProps> = ({ state, output }) => {
  const { t, i18n } = useTranslation();
  const [isConsumed, setIsConsumed] = useState(false);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const confirmMutation = useMutation({
    mutationFn: async (args: { registerId: string; confirmationId: string }) => {
      return cashManagementApi.confirmCashEntry(
        args.registerId,
        args.confirmationId,
        idempotencyKey
      );
    },
    onSuccess: () => {
      setIsConsumed(true);
    },
  });

  if (state !== "output-available" || !isPendingEntryConfirmation(output)) {
    return null;
  }

  const payload = output.confirmation.candidatePayload;
  const amountStr = formatMoney(payload.amountCents, i18n.language, "EUR");
  const displayLabel = t(
    `cashManagement.enums.entryType.${payload.movementType}`,
    payload.movementType
  );

  if (isConsumed) {
    return (
      <Card className="my-2 border-green-500/40 bg-green-500/5">
        <CardContent className="space-y-3 p-4">
          <div>
            <p className="text-sm font-semibold text-green-700 dark:text-green-400">
              {t("assistant.cashEntryConfirmation.saved", "Saved {{label}} {{amount}}", {
                label: displayLabel,
                amount: amountStr,
              })}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="my-2 border-accent/40 bg-accent/5">
      <CardContent className="space-y-3 p-4">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {t("assistant.cashEntryConfirmation.title", "Confirm Cash Entry")}
          </p>
          <div className="mt-1 space-y-1">
            <p className="text-sm font-medium text-foreground">{displayLabel}</p>
            <p className="text-xs text-muted-foreground">
              {payload.description} ({amountStr})
            </p>
            <p className="text-xs text-muted-foreground">Entry type: {payload.movementType}</p>
            {payload.direction ? (
              <p className="text-xs text-muted-foreground">Direction: {payload.direction}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Date: {output.confirmation.businessDate}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="accent"
          size="sm"
          disabled={confirmMutation.isPending}
          onClick={() => {
            confirmMutation.mutate({
              registerId: output.confirmation.registerId,
              confirmationId: output.confirmation.id,
            });
          }}
        >
          {confirmMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t("assistant.cashEntryConfirmation.confirming", "Confirming...")}
            </>
          ) : (
            t("assistant.cashEntryConfirmation.confirm", "Confirm")
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
