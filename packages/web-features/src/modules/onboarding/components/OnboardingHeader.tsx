import React from "react";
import { Button } from "@corely/ui";
import { useTranslation } from "react-i18next";
import { ArrowLeft, X } from "lucide-react";
import { LanguageSelector, Logo } from "@corely/web-shared";
import type { OnboardingJourneyConfig } from "@corely/contracts";
import { cn } from "@corely/web-shared/shared/lib/utils";

export interface OnboardingHeaderProps {
  config: OnboardingJourneyConfig;
  onExit?: () => void;
  onSkip?: () => void;
  onBack?: () => void;
  canGoBack?: boolean;
  className?: string;
}

export const OnboardingHeader = ({
  onExit,
  onSkip,
  onBack,
  canGoBack = false,
  className,
}: OnboardingHeaderProps) => {
  const { t } = useTranslation();
  return (
    <header
      className={cn(
        "flex shrink-0 items-center justify-between border-b bg-background/80 px-6 py-4 backdrop-blur-md sticky top-0 z-50",
        className
      )}
      data-testid="onboarding-header"
    >
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4 border-r pr-6 border-border/50">
          <Logo size="sm" showText={false} />
          <span className="text-sm font-semibold tracking-tight text-foreground/90 uppercase">
            {t("onboarding.title")}
          </span>
        </div>

        {canGoBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground gap-2"
            aria-label={t("onboarding.goBack")}
            data-testid="onboarding-back"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider hidden sm:inline">
              {t("onboarding.goBack")}
            </span>
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <LanguageSelector className="text-foreground/70 hover:text-foreground hover:bg-white/5 transition-colors" />

        {onSkip && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            className="text-muted-foreground hover:text-foreground"
            data-testid="onboarding-skip"
          >
            {t("onboarding.skip", "Skip Onboarding")}
          </Button>
        )}

        {onExit && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onExit}
            className="gap-2 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-foreground transition-all"
            data-testid="onboarding-exit"
          >
            <span className="hidden sm:inline">{t("onboarding.saveAndExit")}</span>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </header>
  );
};
