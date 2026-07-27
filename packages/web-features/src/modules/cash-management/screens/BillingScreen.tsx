import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Progress,
  Skeleton,
  cn,
} from "@corely/ui";
import type { BillingPlanCode, BillingProductKey } from "@corely/contracts";
import { CashManagementProductKey } from "@corely/contracts";
import { billingApi } from "@corely/web-shared/lib/billing-api";
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { useBillingCopy } from "./billing-copy";
import { BillingPlanCatalog } from "./billing-plan-catalog";
import { BillingTrialAlerts } from "./billing-trial-alerts";
import {
  featureIconMap,
  featureOrder,
  featureValueToText,
  formatPeriod,
  formatPrice,
  isPaidPlan,
  planOrder,
} from "./billing-utils";

const billingProductKey: BillingProductKey = CashManagementProductKey;

export function BillingScreen() {
  const queryClient = useQueryClient();
  const copy = useBillingCopy();
  const { t } = useTranslation();

  const overviewQuery = useQuery({
    queryKey: ["billing", "overview", billingProductKey],
    queryFn: () => billingApi.getOverview(billingProductKey),
  });

  const checkoutMutation = useMutation({
    mutationFn: (planCode: Exclude<BillingPlanCode, "free">) =>
      billingApi.createCheckoutSession({
        productKey: billingProductKey,
        planCode,
        successPath: "/billing?checkout=success",
        cancelPath: "/billing?checkout=cancelled",
      }),
    onSuccess: (result) => {
      window.location.assign(result.checkoutUrl);
    },
  });

  const portalMutation = useMutation({
    mutationFn: () =>
      billingApi.createPortalSession({
        productKey: billingProductKey,
        returnPath: "/billing",
      }),
    onSuccess: (result) => {
      window.location.assign(result.portalUrl);
    },
  });

  const startTrialMutation = useMutation({
    mutationFn: () =>
      billingApi.startTrial({
        productKey: billingProductKey,
        source: "billing-page",
      }),
    onSuccess: async () => {
      toast.success(copy.trialStarted);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["billing", "overview", billingProductKey] }),
        queryClient.invalidateQueries({ queryKey: ["billing", "current", billingProductKey] }),
      ]);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : copy.trialStartFailed);
    },
  });

  const billing = overviewQuery.data?.billing;

  const orderedPlans = useMemo(
    () =>
      [...(billing?.plans ?? [])].sort(
        (left, right) => planOrder.indexOf(left.code) - planOrder.indexOf(right.code)
      ),
    [billing?.plans]
  );

  if (overviewQuery.isLoading) {
    return (
      <div className="space-y-5 px-4 py-5 sm:px-5 sm:py-6 lg:space-y-6 lg:p-8 animate-fade-in">
        <div className="space-y-3">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-[32rem] max-w-full" />
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/50 px-3 py-2">
          <Skeleton className="h-10 w-44 rounded-md" />
          <Skeleton className="h-10 w-40 rounded-md" />
          <Skeleton className="h-10 w-56 rounded-md" />
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Skeleton className="h-72 rounded-lg" />
          <Skeleton className="h-72 rounded-lg" />
        </div>
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Skeleton className="h-80 rounded-lg" />
          <Skeleton className="h-80 rounded-lg" />
        </div>
        <Skeleton className="h-72 rounded-lg" />
      </div>
    );
  }

  if (overviewQuery.isError || !billing) {
    return (
      <div className="space-y-5 px-4 py-5 sm:px-5 sm:py-6 lg:space-y-6 lg:p-8 animate-fade-in">
        <div>
          <h1 className="text-h1 text-foreground">{copy.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{copy.subtitle}</p>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{copy.loadFailed}</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            <span>{(overviewQuery.error as Error | undefined)?.message ?? copy.loadFailed}</span>
            <Button variant="outline" size="sm" onClick={() => overviewQuery.refetch()}>
              {t("common.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const currentPlan = orderedPlans.find((plan) => plan.code === billing.subscription.planCode);
  const trial = billing.trial;
  const upgradeContext = billing.upgradeContext;
  const featureEntries = featureOrder.map((feature) => ({
    key: feature.key,
    labelKey: feature.labelKey,
    value: billing.entitlements.featureValues[feature.key],
  }));
  const featuredPlan =
    orderedPlans.find((plan) => plan.code === "pro-monthly") ??
    orderedPlans.find((plan) => plan.code !== "free");
  const isFreePlan = billing.subscription.planCode === "free";
  const featuredPlanName = featuredPlan
    ? copy.planName(featuredPlan.code, featuredPlan.name)
    : copy.featuredPlanNameFallback;
  const currentPlanName = currentPlan
    ? copy.planName(currentPlan.code, currentPlan.name)
    : billing.subscription.planCode;
  const currentPlanSummary = currentPlan
    ? copy.planSummary(currentPlan.code, currentPlan.summary)
    : undefined;
  const featuredUpgradePlanCode =
    (featuredPlan?.code && isPaidPlan(featuredPlan.code) ? featuredPlan.code : null) ??
    "starter-monthly";

  return (
    <div className="space-y-5 px-4 py-5 sm:px-5 sm:py-6 lg:space-y-6 lg:p-8 animate-fade-in">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-h1 text-foreground">{copy.title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{copy.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {billing.management.canManageBilling ? (
            <Button
              variant="outline"
              onClick={() => portalMutation.mutate()}
              disabled={portalMutation.isPending}
            >
              {portalMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {copy.manageBilling}
            </Button>
          ) : null}
          {billing.management.canStartTrial ? (
            <Button
              onClick={() => startTrialMutation.mutate()}
              disabled={startTrialMutation.isPending}
            >
              {startTrialMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {copy.startTrial}
            </Button>
          ) : null}
          {billing.management.canUpgrade ? (
            <Button
              variant={billing.management.canStartTrial ? "outline" : "default"}
              onClick={() => checkoutMutation.mutate(featuredUpgradePlanCode)}
              disabled={checkoutMutation.isPending}
            >
              {checkoutMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              {copy.upgradePlan}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/50 px-3 py-2">
        <div className="rounded-md border border-border bg-background px-3 py-2 text-sm">
          <div className="text-xs text-muted-foreground">{copy.currentPlan}</div>
          <div className="mt-1 font-medium text-foreground">{currentPlanName}</div>
        </div>
        <div className="rounded-md border border-border bg-background px-3 py-2 text-sm">
          <div className="text-xs text-muted-foreground">{copy.planStatus}</div>
          <div className="mt-1 font-medium text-foreground">
            {copy.statusLabel(billing.subscription.status)}
          </div>
        </div>
        <div className="rounded-md border border-border bg-background px-3 py-2 text-sm">
          <div className="text-xs text-muted-foreground">{copy.period}</div>
          <div className="mt-1 font-medium text-foreground">
            {formatPeriod(
              billing.subscription.currentPeriodStart,
              billing.subscription.currentPeriodEnd
            )}
          </div>
        </div>
      </div>

      <BillingTrialAlerts trial={trial} copy={copy} />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full">
                {featuredPlanName}
              </Badge>
              {featuredPlan ? (
                <Badge variant="secondary" className="rounded-full">
                  {copy.recommendedTitle}
                </Badge>
              ) : null}
            </div>
            <CardTitle className="text-2xl">
              {isFreePlan ? copy.featuredTitleFree : copy.featuredTitlePaid}
            </CardTitle>
            <CardDescription>
              {featuredPlan
                ? copy.planSummary(featuredPlan.code, featuredPlan.summary)
                : copy.featuredDescriptionFallback}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {featuredPlan ? (
              <div className="flex flex-wrap items-end gap-3">
                <div className="text-3xl font-semibold text-foreground">
                  {copy.pricePerMonth(
                    featuredPlan.priceCents === 0
                      ? "€0"
                      : formatPrice(featuredPlan.priceCents, featuredPlan.currency)
                  )}
                </div>
                <div className="pb-1 text-sm text-muted-foreground">{copy.billedMonthly}</div>
              </div>
            ) : null}
            <div className="grid gap-2 md:grid-cols-2">
              {(featuredPlan?.highlights ?? []).slice(0, 6).map((highlight, index) => (
                <div
                  key={highlight}
                  className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>
                    {featuredPlan
                      ? copy.planHighlight(featuredPlan.code, index, highlight)
                      : highlight}
                  </span>
                </div>
              ))}
            </div>
            <div className="text-sm text-muted-foreground">
              {isFreePlan ? copy.featuredFootnoteFree : copy.featuredFootnotePaid}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardDescription>{copy.currentPlan}</CardDescription>
            <div className="flex items-center gap-3">
              <CardTitle className="text-xl">{currentPlanName}</CardTitle>
              <Badge className="rounded-full px-3 py-1">
                {copy.statusLabel(billing.subscription.status)}
              </Badge>
            </div>
            <CardDescription>{currentPlanSummary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
              <div className="text-muted-foreground">{copy.currentPlan}</div>
              <div className="mt-1 text-lg font-semibold text-foreground">{currentPlanName}</div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
              <div className="text-muted-foreground">{copy.planStatus}</div>
              <div className="mt-1 text-lg font-semibold text-foreground">
                {copy.statusLabel(billing.subscription.status)}
              </div>
            </div>
            {currentPlan ? (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                <div className="text-muted-foreground">{copy.currentPlan}</div>
                <div className="mt-1 text-lg font-semibold text-foreground">
                  {copy.pricePerMonth(
                    currentPlan.priceCents === 0
                      ? "€0"
                      : formatPrice(currentPlan.priceCents, currentPlan.currency)
                  )}
                </div>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {(currentPlan?.highlights ?? []).slice(0, 3).map((highlight, index) => (
                <Badge key={highlight} variant="secondary" className="rounded-full">
                  {currentPlan ? copy.planHighlight(currentPlan.code, index, highlight) : highlight}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-4">
            <CardDescription>{copy.usage}</CardDescription>
            <CardTitle className="text-2xl">{copy.usage}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {billing.usage.map((metric) => {
              const percent =
                metric.percentUsed === null ? 0 : Math.round(metric.percentUsed * 100);
              const nudge =
                isFreePlan &&
                (metric.limit === null ? false : percent >= 60 || metric.remaining === 0);

              return (
                <div
                  key={metric.key}
                  className={cn(
                    "rounded-lg border p-4",
                    nudge ? "border-amber-500/35 bg-amber-500/8" : "border-border/60 bg-muted/20"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">
                        {copy.usageMetricLabel(metric.key, metric.label)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {copy.usageLabels.usedOf(
                          metric.used,
                          metric.limit === null ? copy.noLimit : String(metric.limit)
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className="rounded-full">
                      {metric.remaining === null ? copy.noLimit : copy.remaining(metric.remaining)}
                    </Badge>
                  </div>
                  <Progress className="mt-4 h-2" value={percent} />
                  <div className="mt-3 text-xs text-muted-foreground">
                    {copy.usageLabels.currentPeriod}:{" "}
                    {formatPeriod(metric.periodStart, metric.periodEnd)}
                  </div>
                  {nudge ? (
                    <div className="mt-3 text-sm text-amber-700 dark:text-amber-200">
                      {copy.usageNudge(metric.key, copy.usageMetricLabel(metric.key, metric.label))}
                    </div>
                  ) : null}
                </div>
              );
            })}

            <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 text-accent" />
                <div>
                  <div className="font-medium text-foreground">
                    {upgradeContext.isOverEntitlement ? copy.trialExpired : copy.recommendedTitle}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {upgradeContext.isOverEntitlement
                      ? (upgradeContext.overEntitlementReasons[0]?.message ??
                        copy.trialExpiredDescription)
                      : copy.recommendedDescription}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <BillingPlanCatalog
          orderedPlans={orderedPlans}
          currentPlanCode={billing.subscription.planCode}
          featuredPlanCode={featuredPlan?.code}
          copy={copy}
          onUpgrade={(planCode) => checkoutMutation.mutate(planCode)}
          isPending={checkoutMutation.isPending}
        />
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <CardDescription>{copy.featureAccess}</CardDescription>
          <CardTitle className="text-2xl">{copy.featureAccess}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {featureEntries.map((feature) => {
            const Icon = featureIconMap[feature.key] ?? CheckCircle2;
            const isEnabled = typeof feature.value === "boolean" ? feature.value : true;

            return (
              <div
                key={feature.key}
                className={cn(
                  "rounded-lg border p-4",
                  isEnabled
                    ? "border-emerald-500/25 bg-emerald-500/8"
                    : "border-border/60 bg-muted/30"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "rounded-full p-2",
                      isEnabled
                        ? "bg-emerald-500/12 text-emerald-700"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      {copy.featureLabels[feature.labelKey]}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {featureValueToText(feature.value, copy.noLimit)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={startTrialMutation.isPending} onOpenChange={() => undefined}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{copy.trialTitle}</DialogTitle>
            <DialogDescription>{copy.trialDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {copy.loading}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
