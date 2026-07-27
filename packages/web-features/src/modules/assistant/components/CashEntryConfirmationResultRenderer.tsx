import React from "react";
import { Card, CardContent } from "@corely/ui";
import { type ToolRendererProps } from "@corely/web-shared/shared/components/chat/ChatParts";
import { useTranslation } from "react-i18next";
import { CheckCircle2 } from "lucide-react";

export const CashEntryConfirmationResultRenderer: React.FC<ToolRendererProps> = ({
  state,
  output,
}) => {
  const { t } = useTranslation();

  if (state !== "output-available" || !output || (output as any).ok !== true) {
    return null;
  }

  return (
    <Card className="my-2 border-accent/40 bg-accent/5">
      <CardContent className="flex items-center space-x-3 p-4">
        <CheckCircle2 className="h-5 w-5 text-accent" />
        <div>
          <p className="text-sm font-semibold text-foreground">
            {t("assistant.cashEntryConfirmation.successTitle", "Entry Confirmed")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
