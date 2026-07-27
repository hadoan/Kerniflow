import React from "react";
import { Button, Card, CardContent } from "@corely/ui";
import { type ToolRendererProps } from "@corely/web-shared/shared/components/chat/ChatParts";
import { useTranslation } from "react-i18next";

type PendingConfirmationOutput = {
  ok: true;
  confirmation: {
    status: "PENDING";
    businessDate: string;
  };
};

const isPendingConfirmation = (value: unknown): value is PendingConfirmationOutput => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const result = value as Record<string, unknown>;
  if (result.ok !== true || !result.confirmation || typeof result.confirmation !== "object") {
    return false;
  }
  const confirmation = result.confirmation as Record<string, unknown>;
  return confirmation.status === "PENDING" && typeof confirmation.businessDate === "string";
};

export const CashDayConfirmationRenderer: React.FC<ToolRendererProps> = ({
  state,
  output,
  sendPrompt,
  isChatLoading,
}) => {
  const { t } = useTranslation();

  if (state !== "output-available" || !isPendingConfirmation(output)) {
    return null;
  }

  const handleConfirm = () => {
    if (!sendPrompt || isChatLoading) {
      return;
    }
    sendPrompt(t("assistant.cashConfirmation.confirmPrompt"));
  };

  return (
    <Card className="my-2 border-accent/40 bg-accent/5">
      <CardContent className="space-y-3 p-4">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {t("assistant.cashConfirmation.title")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("assistant.cashConfirmation.description", {
              date: output.confirmation.businessDate,
            })}
          </p>
        </div>
        <Button
          type="button"
          variant="accent"
          size="sm"
          disabled={!sendPrompt || isChatLoading}
          onClick={handleConfirm}
        >
          {isChatLoading
            ? t("assistant.cashConfirmation.confirming")
            : t("assistant.cashConfirmation.confirm")}
        </Button>
      </CardContent>
    </Card>
  );
};
