import React from "react";
import { format } from "date-fns";
import { Badge } from "@corely/ui";
import { useTranslation } from "react-i18next";
import { MapPin, MonitorSmartphone, Calendar, Sparkles } from "lucide-react";

export interface CashConversationContextHeaderProps {
  workspace: any; // CashAssistantWorkspaceEntity
}

export function CashConversationContextHeader({ workspace }: CashConversationContextHeaderProps) {
  const { t } = useTranslation();

  if (!workspace) {
    return null;
  }

  const { type, businessDate, businessMonth, registerId, locationId } = workspace;

  const renderBadge = () => {
    switch (type) {
      case "DAILY_CASH_DAY":
        return (
          <Badge
            variant="default"
            className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20"
          >
            {t("cashDashboard.workspace.dailyCash", "Daily Cash")}
          </Badge>
        );
      case "MONTHLY_REVIEW":
        return (
          <Badge
            variant="default"
            className="bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 border-purple-500/20"
          >
            {t("cashDashboard.workspace.monthlyReview", "Monthly Review")}
          </Badge>
        );
      case "GENERAL_HELP":
        return (
          <Badge variant="secondary">
            {t("cashDashboard.workspace.generalHelp", "General Help")}
          </Badge>
        );
      default:
        return null;
    }
  };

  const formattedDate = businessDate ? format(new Date(businessDate), "dd.MM.yyyy") : null;
  const formattedMonth = businessMonth ? format(new Date(businessMonth), "MMMM yyyy") : null;

  return (
    <div className="flex items-center gap-4 px-6 py-4 lg:px-8">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-accent/10">
        <Sparkles className="h-5 w-5 text-accent" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <div className="flex items-center gap-2">
          <h2 className="truncate text-lg font-semibold text-foreground">
            {type === "DAILY_CASH_DAY" && formattedDate
              ? `${t("cashDashboard.workspace.cashDayFor", "Cash Day")} ${formattedDate}`
              : null}
            {type === "MONTHLY_REVIEW" && formattedMonth
              ? `${t("cashDashboard.workspace.reviewFor", "Review")} ${formattedMonth}`
              : null}
            {type === "GENERAL_HELP"
              ? t("cashDashboard.workspace.generalHelpTitle", "Cash Assistant")
              : null}
          </h2>
          {renderBadge()}
        </div>

        {type !== "GENERAL_HELP" && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {formattedDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formattedDate}</span>
              </div>
            )}
            {registerId && (
              <div className="flex items-center gap-1.5">
                <MonitorSmartphone className="h-3.5 w-3.5" />
                <span>{t("cashDashboard.workspace.register", "Register")}</span>
              </div>
            )}
            {locationId && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                <span>{t("cashDashboard.workspace.location", "Location")}</span>
              </div>
            )}
          </div>
        )}
        {type === "GENERAL_HELP" && (
          <p className="text-sm text-muted-foreground truncate">
            {t(
              "assistant.threadHeaderDescription",
              "Continue the conversation or start a new task."
            )}
          </p>
        )}
      </div>
    </div>
  );
}
