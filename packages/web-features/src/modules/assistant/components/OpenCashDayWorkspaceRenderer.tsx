import React from "react";
import { Button, Card, CardContent } from "@corely/ui";
import { type ToolRendererProps } from "@corely/web-shared/shared/components/chat/ChatParts";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

type OpenCashDayWorkspaceOutput = {
  ok: true;
  workspaceId: string;
  conversationId: string;
  handoffId: string;
  confirmationId: string;
};

const isOpenCashDayWorkspace = (value: unknown): value is OpenCashDayWorkspaceOutput => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const result = value as Record<string, unknown>;
  return (
    result.ok === true &&
    typeof result.workspaceId === "string" &&
    typeof result.conversationId === "string" &&
    typeof result.handoffId === "string" &&
    typeof result.confirmationId === "string"
  );
};

export const OpenCashDayWorkspaceRenderer: React.FC<ToolRendererProps> = ({ state, output }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (state !== "output-available" || !isOpenCashDayWorkspace(output)) {
    return null;
  }

  const handleNavigate = () => {
    // Navigate to the workspace and pass handoffId in query params
    navigate(`/assistant/t/${output.conversationId}?handoffId=${output.handoffId}`);
  };

  return (
    <Card className="my-2 border-accent/40 bg-accent/5">
      <CardContent className="space-y-3 p-4">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {t("assistant.openCashDayWorkspace.title", "Continue in Daily Cash Workspace")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t(
              "assistant.openCashDayWorkspace.description",
              "A cash entry is ready for confirmation. Please switch to the specific daily workspace to review and confirm."
            )}
          </p>
        </div>
        <Button type="button" variant="accent" size="sm" onClick={handleNavigate}>
          {t("assistant.openCashDayWorkspace.navigate", "Open Workspace")}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
};
