import React from "react";
import { Card, CardContent } from "@corely/ui";
import { type ToolRendererProps } from "@corely/web-shared/shared/components/chat/ChatParts";
import { useTranslation } from "react-i18next";

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

export const CashDayConfirmationResultRenderer: React.FC<ToolRendererProps> = ({
  state,
  output,
}) => {
  const { t } = useTranslation();
  if (state !== "output-available") {
    return null;
  }

  const result = asRecord(output);
  if (!result) {
    return null;
  }
  if (result.ok === true) {
    return (
      <Card className="my-2 border-success/40 bg-success/5">
        <CardContent className="p-4">
          <p className="text-sm font-semibold text-foreground">
            {t("assistant.cashConfirmation.savedTitle")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("assistant.cashConfirmation.savedDescription")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const details = asRecord(result.details);
  if (
    result.code === "CashManagement:InvalidTaxInput" &&
    details?.reason === "CashManagement:TaxProfileRequired"
  ) {
    return (
      <Card className="my-2 border-destructive/40 bg-destructive/5">
        <CardContent className="p-4">
          <p className="text-sm font-semibold text-foreground">
            {t("assistant.cashConfirmation.taxProfileRequiredTitle")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("assistant.cashConfirmation.taxProfileRequiredDescription")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return null;
};
