import React from "react";
import { FileText, Receipt, TrendingUp, AlertCircle, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface CashAssistantEmptyStateProps {
  onSelectPrompt: (prompt: string) => void;
}

export function CashAssistantEmptyState({ onSelectPrompt }: CashAssistantEmptyStateProps) {
  const { t } = useTranslation();

  const primaryActions = [
    {
      icon: Receipt,
      label: t(
        "cashDashboard.assistant.emptyStateActions.recordTransactions.label",
        "Record today's transactions"
      ),
      prompt: t(
        "cashDashboard.assistant.emptyStateActions.recordTransactions.value",
        "I want to record today's cash transactions."
      ),
    },
    {
      icon: FileText,
      label: t(
        "cashDashboard.assistant.emptyStateActions.reviewMonth.label",
        "Review monthly report"
      ),
      prompt: t(
        "cashDashboard.assistant.emptyStateActions.reviewMonth.value",
        "I want to review this month's cash report."
      ),
    },
    {
      icon: TrendingUp,
      label: t("cashDashboard.assistant.emptyStateActions.closeDay.label", "Close the cash day"),
      prompt: t(
        "cashDashboard.assistant.emptyStateActions.closeDay.value",
        "I want to close the cash register for today."
      ),
    },
    {
      icon: AlertCircle,
      label: t(
        "cashDashboard.assistant.emptyStateActions.generalHelp.label",
        "Ask a general question"
      ),
      prompt: t(
        "cashDashboard.assistant.emptyStateActions.generalHelp.value",
        "I have a general question about cash management."
      ),
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
        <Sparkles className="h-8 w-8 text-accent" />
      </div>
      <h2 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
        {t("assistant.emptyStateTitle", "How can I help you today?")}
      </h2>
      <p className="mb-8 max-w-md text-muted-foreground">
        {t(
          "assistant.emptyStateDescription",
          "Select an action below or type a message to get started."
        )}
      </p>

      <div className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
        {primaryActions.map((action, idx) => {
          const Icon = action.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectPrompt(action.prompt)}
              className="group flex flex-col items-start gap-3 rounded-xl border border-border/60 bg-background/50 p-5 text-left transition-all hover:border-accent/50 hover:bg-accent/5 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-accent/10 group-hover:text-accent">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-foreground group-hover:text-accent">
                  {action.label}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
