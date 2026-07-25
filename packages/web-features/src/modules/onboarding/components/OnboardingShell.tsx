import React from "react";
import { cn } from "@corely/ui";
import { useTranslation } from "react-i18next";
import { OnboardingHeader } from "./OnboardingHeader";
import { OnboardingChecklist } from "./OnboardingChecklist";
import { useOnboarding } from "../engine/use-onboarding";
import { OnboardingStepRenderer } from "./OnboardingStepRenderer";
import type { OnboardingJourneyConfig } from "@corely/contracts";

export interface OnboardingShellProps {
  config: OnboardingJourneyConfig;
  onCompleted?: () => void;
  onExit?: () => void;
  onSkip?: () => void;
}

export const OnboardingShell = ({ config, onCompleted, onExit, onSkip }: OnboardingShellProps) => {
  const { t, i18n } = useTranslation();
  const { isLoaded, isComplete, progress, completeJourney, isCompleting } = useOnboarding({
    config,
    onCompleted,
  });
  const hasRedirectedRef = React.useRef(false);

  React.useEffect(() => {
    const nextLocale = progress?.locale || config.defaultLocale;
    if (!nextLocale || i18n.resolvedLanguage === nextLocale || i18n.language === nextLocale) {
      return;
    }
    void i18n.changeLanguage(nextLocale);
  }, [config.defaultLocale, i18n, progress?.locale]);

  React.useEffect(() => {
    if (!isComplete || hasRedirectedRef.current) {
      return;
    }
    hasRedirectedRef.current = true;
    const timeoutId = window.setTimeout(() => {
      onCompleted?.();
    }, 800);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isComplete, onCompleted]);

  if (!isLoaded) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-[#0B0F14]"
        data-testid="onboarding-loading"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        <span className="sr-only">{t("onboarding.loading")}</span>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col bg-[#0B0F14] text-foreground selection:bg-accent/30"
      data-testid="onboarding-shell"
    >
      <OnboardingHeader
        config={config}
        onExit={onExit}
        onSkip={async () => {
          await completeJourney();
          onSkip?.();
        }}
        className="border-white/5"
      />

      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden relative">
        {/* Decorative background elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Sidebar / Progress (Hidden on mobile, or shown as a toggle/compact) */}
        <aside className="hidden w-80 shrink-0 flex-col border-r border-white/5 bg-[#111820]/40 lg:flex backdrop-blur-sm">
          <div className="flex-1 overflow-y-auto px-8 py-12 scrollbar-thin">
            <OnboardingChecklist config={config} />
          </div>

          <div className="p-8 border-t border-white/5 bg-black/20">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-bold mb-1">
              {t("onboarding.sidebarHelpTitle")}
            </p>
            <p className="text-xs text-muted-foreground/60 leading-relaxed">
              {t("onboarding.sidebarHelpDescription")}
            </p>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="relative flex flex-1 flex-col overflow-y-auto">
          {/* Mobile Progress Bar (Compact) */}
          <div className="lg:hidden px-6 pt-4">
            <OnboardingChecklist config={config} className="gap-4" />
          </div>

          <div className="flex flex-1 items-center justify-center p-6 md:p-12 lg:p-24">
            {isComplete ? (
              <div
                className="text-center animate-in fade-in zoom-in-95 duration-500 max-w-sm"
                data-testid="onboarding-complete"
              >
                <div className="h-20 w-20 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-8 glow-accent-strong">
                  <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold tracking-tight mb-4">{t("onboarding.allSet")}</h2>
                <p className="text-lg text-muted-foreground/80 leading-relaxed">
                  {t("onboarding.redirectingToDashboard")}
                </p>
              </div>
            ) : (
              <div className="w-full max-w-5xl">
                <OnboardingStepRenderer config={config} onCompleted={onCompleted} />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
