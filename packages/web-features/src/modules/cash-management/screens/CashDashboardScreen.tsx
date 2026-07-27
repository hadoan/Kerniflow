import type { ComponentProps, ComponentType, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
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
  EmptyState,
  Progress,
  Separator,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from "@corely/ui";
import { CashManagementBillingFeatureKeys, CashManagementProductKey } from "@corely/contracts";
import { cashManagementApi } from "@corely/web-shared/lib/cash-management-api";
import { billingApi } from "@corely/web-shared/lib/billing-api";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowRight,
  ArrowUpCircle,
  Bot,
  CalendarCheck2,
  CheckCircle2,
  CircleDashed,
  ClipboardCheck,
  Coins,
  Euro,
  FileBadge2,
  LayoutDashboard,
  LockKeyhole,
  NotebookPen,
  Receipt,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { formatDateLong, formatMoney } from "@corely/web-shared/shared/lib/formatters";
import {
  type CashDashboardData,
  type CashDashboardDayStatus,
  type CashDashboardEntry,
  type CashDashboardExportStatus,
  type CashDashboardScenarioId,
  getCashDashboardData,
  getCashDashboardDayCloseHref,
  getCashDashboardEntriesHref,
  getCashDashboardExportHref,
  getCashDashboardRegisterHref,
  mapCashDashboardResponse,
  resolveCashDashboardScenarioId,
  resolveCashDashboardSurfaceMode,
} from "./cash-dashboard-model";
import { OnboardingChecklist } from "../../onboarding/components/OnboardingChecklist";
import { CASH_MANAGEMENT_JOURNEY } from "../journeys/cash-management-journey";
import { cashKeys } from "../queries";

type LocaleKey = "en" | "de" | "vi";
type Tone = "neutral" | "success" | "warning" | "danger";
type Severity = "high" | "medium" | "low";

interface DashboardCopy {
  headerTitle: string;
  headerSubtitle: string;
  previewLabel: string;
  previewStates: Record<CashDashboardScenarioId, string>;
  banner: {
    open: string;
    receiptsMissing: (count: number) => string;
    closeNow: string;
    monthReady: string;
    closedToday: string;
    staleTitle: string;
    staleDescription: string;
  };
  actions: {
    addEntry: string;
    openEntries: string;
    closeDay: string;
    exportMonth: string;
    openRegister: string;
    attachReceipt: string;
    reviewEntries: string;
    seeAll: string;
    edit: string;
    reverse: string;
    viewDetails: string;
    attachNow: string;
    createFirstEntry: string;
  };
  labels: {
    openingBalance: string;
    cashInToday: string;
    cashOutToday: string;
    expectedBalance: string;
    countedCash: string;
    difference: string;
    missingReceipts: string;
    dailyClosing: string;
    todaysCashStatus: string;
    actionRequired: string;
    recentEntries: string;
    receiptStatus: string;
    closingWorkflow: string;
    exportStatus: string;
    trendOverview: string;
    privateDeposits: string;
    privateWithdrawals: string;
    lastClosedDate: string;
    closedBy: string;
    responsibleToday: string;
    currentMonth: string;
    entriesCompleted: string;
    lastExport: string;
    status: string;
    time: string;
    type: string;
    amount: string;
    note: string;
    receipt: string;
    rowActions: string;
    attachedToday: string;
    missingToday: string;
    missingThisMonth: string;
    weekIncome: string;
    weekExpenses: string;
    openDays: string;
    monthVsLastMonth: string;
    exportChecklistDays: string;
    exportChecklistReceipts: string;
    exportChecklistReview: string;
    helperWidget: string;
  };
  helpers: {
    includesPrivateMovements: (deposit: string, withdrawal: string) => string;
    countNotEntered: string;
    differenceBalanced: string;
    differenceOver: (amount: string) => string;
    differenceShort: (amount: string) => string;
    statusOpen: string;
    statusNeedsReview: string;
    statusReadyToClose: string;
    statusClosed: string;
    monthExportReady: string;
    exportBlockedReceipts: string;
    exportBlockedDays: string;
    exportBlockedReview: string;
    exportAlreadyGenerated: string;
    receiptsComplete: string;
    receiptsIncomplete: (count: number) => string;
    noActionNeeded: string;
    noActionDescription: string;
    noEntriesTitle: string;
    noEntriesDescription: string;
    loadingTitle: string;
    loadingDescription: string;
  };
  actionItems: {
    missingReceiptsTitle: (count: number) => string;
    missingReceiptsDescription: string;
    closeDayTitle: string;
    closeDayDescription: string;
    missingNotesTitle: (count: number) => string;
    missingNotesDescription: string;
    openDaysTitle: (count: number) => string;
    openDaysDescription: string;
    reviewTitle: (count: number) => string;
    reviewDescription: string;
    exportTitle: string;
    exportDescription: string;
    exportReadyTitle: string;
    exportReadyDescription: string;
  };
  entryTypes: Record<CashDashboardEntry["type"], string>;
  entryStatus: {
    attached: string;
    missing: string;
    review: string;
    ok: string;
  };
  assistant: {
    title: string;
    description: string;
    prompts: string[];
    languages: string;
  };
  severity: {
    high: string;
    medium: string;
    low: string;
  };
}

interface SummaryCardProps {
  title: string;
  value: string;
  helper: string;
  icon: ComponentType<{ className?: string }>;
  tone: Tone;
  statusText?: string;
  testId?: string;
}

interface ActionItem {
  id: string;
  severity: Severity;
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
}

interface DashboardUpgradeCopy {
  openBilling: string;
  upgradeToStarter: string;
  upgradeToPro: string;
  assistantLockedTitle: string;
  assistantLockedDescription: string;
  assistantLockedBadge: string;
}

function useDashboardCopy(): DashboardCopy {
  const { t } = useTranslation(undefined, { keyPrefix: "cashDashboard" });
  const previewStates = t("previewStates", {
    returnObjects: true,
  }) as DashboardCopy["previewStates"];
  const labels = t("labels", { returnObjects: true }) as DashboardCopy["labels"];
  const helperStrings = t("helpers", { returnObjects: true }) as Omit<
    DashboardCopy["helpers"],
    "includesPrivateMovements" | "differenceOver" | "differenceShort" | "receiptsIncomplete"
  >;
  const actionItemStrings = t("actionItems", { returnObjects: true }) as Omit<
    DashboardCopy["actionItems"],
    "missingReceiptsTitle" | "missingNotesTitle" | "openDaysTitle" | "reviewTitle"
  >;
  const entryTypes = t("entryTypes", { returnObjects: true }) as DashboardCopy["entryTypes"];
  const entryStatus = t("entryStatus", { returnObjects: true }) as DashboardCopy["entryStatus"];
  const assistantStrings = t("assistant", { returnObjects: true }) as Partial<
    DashboardCopy["assistant"]
  >;
  const severity = t("severity", { returnObjects: true }) as DashboardCopy["severity"];

  return {
    headerTitle: t("headerTitle"),
    headerSubtitle: t("headerSubtitle"),
    previewLabel: t("previewLabel"),
    previewStates,
    banner: {
      open: t("banner.open"),
      receiptsMissing: (count: number) => t("banner.receiptsMissing", { count }),
      closeNow: t("banner.closeNow"),
      monthReady: t("banner.monthReady"),
      closedToday: t("banner.closedToday"),
      staleTitle: t("banner.staleTitle"),
      staleDescription: t("banner.staleDescription"),
    },
    actions: {
      addEntry: t("actions.addEntry"),
      openEntries: t("actions.openEntries"),
      closeDay: t("actions.closeDay"),
      exportMonth: t("actions.exportMonth"),
      openRegister: t("actions.openRegister"),
      attachReceipt: t("actions.attachReceipt"),
      reviewEntries: t("actions.reviewEntries"),
      seeAll: t("actions.seeAll"),
      edit: t("actions.edit"),
      reverse: t("actions.reverse"),
      viewDetails: t("actions.viewDetails"),
      attachNow: t("actions.attachNow"),
      createFirstEntry: t("actions.createFirstEntry"),
    },
    labels,
    helpers: {
      ...helperStrings,
      includesPrivateMovements: (deposit: string, withdrawal: string) =>
        t("helpers.includesPrivateMovements", { deposit, withdrawal }),
      differenceOver: (amount: string) => t("helpers.differenceOver", { amount }),
      differenceShort: (amount: string) => t("helpers.differenceShort", { amount }),
      receiptsIncomplete: (count: number) => t("helpers.receiptsIncomplete", { count }),
    },
    actionItems: {
      ...actionItemStrings,
      missingReceiptsTitle: (count: number) => t("actionItems.missingReceiptsTitle", { count }),
      missingNotesTitle: (count: number) => t("actionItems.missingNotesTitle", { count }),
      openDaysTitle: (count: number) => t("actionItems.openDaysTitle", { count }),
      reviewTitle: (count: number) => t("actionItems.reviewTitle", { count }),
    },
    entryTypes,
    entryStatus,
    assistant: {
      title: assistantStrings.title ?? "",
      description: assistantStrings.description ?? "",
      prompts: Array.isArray(assistantStrings.prompts) ? assistantStrings.prompts : [],
      languages: assistantStrings.languages ?? "",
    },
    severity,
  };
}

function useDashboardUpgradeCopy(): DashboardUpgradeCopy {
  const { t } = useTranslation(undefined, { keyPrefix: "cashDashboard" });

  return {
    openBilling: t("actions.openBilling"),
    upgradeToStarter: t("actions.upgradeToStarter"),
    upgradeToPro: t("actions.upgradeToPro"),
    assistantLockedTitle: t("assistant.lockedTitle"),
    assistantLockedDescription: t("assistant.lockedDescription"),
    assistantLockedBadge: t("assistant.lockedBadge"),
  };
}

const toneStyles: Record<Tone, string> = {
  neutral:
    "border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] dark:border-border/35 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(10,15,26,0.9))]",
  success:
    "border-emerald-200/70 bg-[linear-gradient(180deg,rgba(236,253,245,0.9),rgba(255,255,255,0.96))] dark:border-emerald-500/25 dark:bg-[linear-gradient(180deg,rgba(15,45,38,0.94),rgba(8,23,21,0.92))]",
  warning:
    "border-amber-200/70 bg-[linear-gradient(180deg,rgba(255,251,235,0.92),rgba(255,255,255,0.96))] dark:border-amber-500/25 dark:bg-[linear-gradient(180deg,rgba(56,38,12,0.94),rgba(23,18,10,0.92))]",
  danger:
    "border-rose-200/70 bg-[linear-gradient(180deg,rgba(255,241,242,0.92),rgba(255,255,255,0.96))] dark:border-rose-500/25 dark:bg-[linear-gradient(180deg,rgba(58,21,30,0.94),rgba(24,12,17,0.92))]",
};

const toneBadge: Record<Tone, ComponentProps<typeof Badge>["variant"]> = {
  neutral: "outline",
  success: "success",
  warning: "warning",
  danger: "danger",
};

const severityTone: Record<Severity, Tone> = {
  high: "danger",
  medium: "warning",
  low: "neutral",
};

const localeByLanguage: Record<LocaleKey, string> = {
  en: "en-DE",
  de: "de-DE",
  vi: "vi-VN",
};

const resolveLocaleKey = (language: string | undefined): LocaleKey => {
  if (!language) {
    return "en";
  }

  const normalized = language.toLowerCase();
  if (normalized.startsWith("de")) {
    return "de";
  }
  if (normalized.startsWith("vi")) {
    return "vi";
  }

  return "en";
};

const iconToneClasses: Record<Tone, string> = {
  neutral: "bg-muted text-foreground dark:bg-background/60",
  success: "bg-success/10 text-success dark:bg-emerald-500/15 dark:text-emerald-300",
  warning: "bg-warning/10 text-warning dark:bg-amber-500/15 dark:text-amber-300",
  danger: "bg-danger/10 text-danger dark:bg-rose-500/15 dark:text-rose-300",
};

const sectionCardClass =
  "border-border/70 bg-card/95 shadow-sm shadow-foreground/5 dark:border-border/35 dark:bg-card/80 dark:shadow-black/20";

const insetPanelClass =
  "rounded-2xl border border-border/65 bg-background/80 backdrop-blur-sm dark:border-border/35 dark:bg-background/45";

const subtlePanelClass =
  "rounded-xl border border-border/60 bg-muted/15 dark:border-border/30 dark:bg-background/35";

function DashboardPageFrame({ children }: { children: ReactNode }) {
  return (
    <div
      className="mx-auto max-w-[1600px] px-4 py-5 sm:px-5 sm:py-6 lg:p-8"
      data-testid="cash-dashboard-page"
    >
      <div className="space-y-6">{children}</div>
    </div>
  );
}

const statusTone = (status: CashDashboardDayStatus): Tone => {
  switch (status) {
    case "ready-to-close":
    case "closed":
      return "success";
    case "needs-review":
      return "warning";
    default:
      return "neutral";
  }
};

const exportTone = (status: CashDashboardExportStatus): Tone => {
  switch (status) {
    case "ready":
    case "exported":
      return "success";
    case "blocked-receipts":
    case "blocked-review":
      return "warning";
    case "blocked-open-days":
      return "neutral";
  }
};

const formatDifferenceLabel = (
  amountCents: number | undefined,
  copy: DashboardCopy,
  locale: string,
  currency: string
): string => {
  if (typeof amountCents !== "number") {
    return "—";
  }

  if (amountCents === 0) {
    return copy.helpers.differenceBalanced;
  }

  const formatted = formatMoney(Math.abs(amountCents), locale, currency);
  return amountCents > 0
    ? copy.helpers.differenceOver(formatted)
    : copy.helpers.differenceShort(formatted);
};

const getStatusLabel = (status: CashDashboardDayStatus, copy: DashboardCopy): string => {
  switch (status) {
    case "ready-to-close":
      return copy.helpers.statusReadyToClose;
    case "needs-review":
      return copy.helpers.statusNeedsReview;
    case "closed":
      return copy.helpers.statusClosed;
    default:
      return copy.helpers.statusOpen;
  }
};

const getExportStatusLabel = (status: CashDashboardExportStatus, copy: DashboardCopy): string => {
  switch (status) {
    case "ready":
      return copy.helpers.monthExportReady;
    case "blocked-receipts":
      return copy.helpers.exportBlockedReceipts;
    case "blocked-open-days":
      return copy.helpers.exportBlockedDays;
    case "blocked-review":
      return copy.helpers.exportBlockedReview;
    case "exported":
      return copy.helpers.exportAlreadyGenerated;
  }
};

const getBannerContent = (data: CashDashboardData, copy: DashboardCopy) => {
  if (data.status.exportStatus === "ready" && data.status.dayStatus === "closed") {
    return {
      title: copy.banner.monthReady,
      detail: copy.helpers.monthExportReady,
      tone: "success" as Tone,
      ctaLabel: copy.actions.exportMonth,
      href: getCashDashboardExportHref(data.registerId),
      icon: FileBadge2,
    };
  }

  if (data.status.dayStatus === "ready-to-close") {
    return {
      title: copy.banner.closeNow,
      detail: copy.helpers.statusReadyToClose,
      tone: "success" as Tone,
      ctaLabel: copy.actions.closeDay,
      href: getCashDashboardDayCloseHref(data.registerId, data.dayKey),
      icon: CalendarCheck2,
    };
  }

  if (data.status.missingReceiptsToday > 0) {
    return {
      title: copy.banner.open,
      detail: copy.banner.receiptsMissing(data.status.missingReceiptsToday),
      tone: "warning" as Tone,
      ctaLabel: copy.actions.attachReceipt,
      href: getCashDashboardEntriesHref(data.registerId),
      icon: Receipt,
    };
  }

  if (data.status.dayStatus === "closed") {
    return {
      title: copy.banner.closedToday,
      detail: getStatusLabel(data.status.dayStatus, copy),
      tone: "success" as Tone,
      ctaLabel: copy.actions.openRegister,
      href: getCashDashboardRegisterHref(data.registerId),
      icon: ClipboardCheck,
    };
  }

  return {
    title: copy.banner.open,
    detail: getStatusLabel(data.status.dayStatus, copy),
    tone: "neutral" as Tone,
    ctaLabel: copy.actions.openEntries,
    href: getCashDashboardEntriesHref(data.registerId),
    icon: LayoutDashboard,
  };
};

const buildActionItems = (data: CashDashboardData, copy: DashboardCopy): ActionItem[] => {
  const items: ActionItem[] = [];

  if (data.status.missingReceiptsToday > 0) {
    items.push({
      id: "missing-receipts",
      severity: "high",
      title: copy.actionItems.missingReceiptsTitle(data.status.missingReceiptsToday),
      description: copy.actionItems.missingReceiptsDescription,
      ctaLabel: copy.actions.attachReceipt,
      href: getCashDashboardEntriesHref(data.registerId),
    });
  }

  if (!data.closing.isClosed) {
    items.push({
      id: "close-day",
      severity: data.status.dayStatus === "ready-to-close" ? "low" : "medium",
      title: copy.actionItems.closeDayTitle,
      description: copy.actionItems.closeDayDescription,
      ctaLabel:
        data.status.dayStatus === "ready-to-close"
          ? copy.actions.closeDay
          : copy.actions.reviewEntries,
      href:
        data.status.dayStatus === "ready-to-close"
          ? getCashDashboardDayCloseHref(data.registerId, data.dayKey)
          : getCashDashboardEntriesHref(data.registerId),
    });
  }

  if (data.status.missingNotesCount > 0) {
    items.push({
      id: "missing-notes",
      severity: "medium",
      title: copy.actionItems.missingNotesTitle(data.status.missingNotesCount),
      description: copy.actionItems.missingNotesDescription,
      ctaLabel: copy.actions.reviewEntries,
      href: getCashDashboardEntriesHref(data.registerId),
    });
  }

  if (data.status.openDaysThisWeek > 1) {
    items.push({
      id: "open-days",
      severity: "medium",
      title: copy.actionItems.openDaysTitle(data.status.openDaysThisWeek),
      description: copy.actionItems.openDaysDescription,
      ctaLabel: copy.actions.closeDay,
      href: getCashDashboardRegisterHref(data.registerId),
    });
  }

  if (data.status.suspiciousEntriesCount > 0) {
    items.push({
      id: "review",
      severity: "high",
      title: copy.actionItems.reviewTitle(data.status.suspiciousEntriesCount),
      description: copy.actionItems.reviewDescription,
      ctaLabel: copy.actions.reviewEntries,
      href: getCashDashboardEntriesHref(data.registerId),
    });
  }

  if (data.status.exportStatus === "ready") {
    items.push({
      id: "export-ready",
      severity: "low",
      title: copy.actionItems.exportReadyTitle,
      description: copy.actionItems.exportReadyDescription,
      ctaLabel: copy.actions.exportMonth,
      href: getCashDashboardExportHref(data.registerId),
    });
  } else if (data.status.exportStatus !== "exported") {
    items.push({
      id: "export-blocked",
      severity: "medium",
      title: copy.actionItems.exportTitle,
      description: copy.actionItems.exportDescription,
      ctaLabel: copy.actions.reviewEntries,
      href: getCashDashboardRegisterHref(data.registerId),
    });
  }

  return items.slice(0, 6);
};

export function DashboardHeaderBanner({
  data,
  copy,
  locale,
  previewControls,
}: {
  data: CashDashboardData;
  copy: DashboardCopy;
  locale: string;
  previewControls?: ReactNode;
}) {
  const banner = getBannerContent(data, copy);
  const Icon = banner.icon;

  return (
    <Card
      data-testid="cash-dashboard-banner"
      className={cn(
        "relative overflow-hidden border-border/80 shadow-lg shadow-foreground/5 dark:border-border/35 dark:shadow-black/20",
        "bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.09),transparent_22%),linear-gradient(135deg,rgba(255,252,245,0.98),rgba(255,255,255,0.98))]",
        "dark:bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18),transparent_24%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.16),transparent_20%),linear-gradient(135deg,rgba(12,20,33,0.98),rgba(9,15,27,0.98))]"
      )}
    >
      <div className="absolute -right-16 top-0 h-40 w-40 rounded-full bg-warning/10 blur-3xl dark:bg-warning/15" />
      <div className="absolute bottom-0 left-1/3 h-28 w-28 rounded-full bg-success/10 blur-3xl dark:bg-accent/10" />
      <CardContent className="relative flex flex-col gap-5 p-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className={cn("rounded-2xl p-3", iconToneClasses[banner.tone])}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {copy.headerTitle}
              </p>
              <h1
                className="text-2xl font-semibold tracking-tight text-foreground lg:text-3xl"
                data-testid="cash-dashboard-banner-title"
              >
                {banner.title}
              </h1>
            </div>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground lg:text-base">{banner.detail}</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant={toneBadge[banner.tone]}>{data.salonName}</Badge>
            {data.location ? <Badge variant="outline">{data.location}</Badge> : null}
            <Badge variant="outline">{formatDateLong(data.dayKey, locale)}</Badge>
          </div>
        </div>

        <div className="flex w-full max-w-sm flex-col gap-3 lg:items-end">
          {previewControls}
          <div className="grid gap-3 sm:grid-cols-2 lg:w-full">
            <div className={cn(insetPanelClass, "p-4")}>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {copy.labels.expectedBalance}
              </p>
              <p className="mt-2 text-xl font-semibold text-foreground">
                {formatMoney(data.summary.expectedClosingCents, locale, data.currency)}
              </p>
            </div>
            <div className={cn(insetPanelClass, "p-4")}>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {copy.labels.dailyClosing}
              </p>
              <p className="mt-2 text-xl font-semibold text-foreground">
                {getStatusLabel(data.status.dayStatus, copy)}
              </p>
            </div>
          </div>
          <Button variant={banner.tone === "success" ? "success" : "accent"} asChild>
            <Link to={banner.href}>
              {banner.ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function SummaryCard({
  title,
  value,
  helper,
  icon: Icon,
  tone,
  statusText,
  testId,
}: SummaryCardProps) {
  return (
    <Card
      className={cn("h-full border-l-4", sectionCardClass, toneStyles[tone])}
      data-testid={testId}
    >
      <CardContent className="flex h-full flex-col justify-between p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p
              className="mt-3 text-2xl font-semibold tracking-tight text-foreground"
              data-testid={testId ? `${testId}-value` : undefined}
            >
              {value}
            </p>
          </div>
          <div className={cn("rounded-xl p-2.5", iconToneClasses[tone])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <p className="text-xs text-muted-foreground">{helper}</p>
          {statusText ? <Badge variant={toneBadge[tone]}>{statusText}</Badge> : null}
        </div>
      </CardContent>
    </Card>
  );
}

function MetricRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className={cn(subtlePanelClass, "flex items-center justify-between gap-4 px-4 py-3")}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-semibold text-foreground", valueClassName)}>{value}</span>
    </div>
  );
}

export function CashStatusPanel({
  data,
  copy,
  locale,
}: {
  data: CashDashboardData;
  copy: DashboardCopy;
  locale: string;
}) {
  const statusLabel = getStatusLabel(data.status.dayStatus, copy);
  const differenceLabel = formatDifferenceLabel(
    data.summary.differenceCents,
    copy,
    locale,
    data.currency
  );

  return (
    <Card className={cn("h-full", sectionCardClass)}>
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>{copy.labels.todaysCashStatus}</CardTitle>
            <CardDescription>{copy.headerSubtitle}</CardDescription>
          </div>
          <Badge variant={toneBadge[statusTone(data.status.dayStatus)]}>{statusLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <MetricRow
            label={copy.labels.openingBalance}
            value={formatMoney(data.summary.openingBalanceCents, locale, data.currency)}
          />
          <MetricRow
            label={copy.labels.cashInToday}
            value={formatMoney(data.summary.cashIncomeTodayCents, locale, data.currency)}
            valueClassName="text-success"
          />
          <MetricRow
            label={copy.labels.cashOutToday}
            value={formatMoney(data.summary.cashExpensesTodayCents, locale, data.currency)}
            valueClassName="text-warning"
          />
          <MetricRow
            label={copy.labels.expectedBalance}
            value={formatMoney(data.summary.expectedClosingCents, locale, data.currency)}
          />
        </div>

        <div className={cn(insetPanelClass, "grid gap-3 p-4 lg:grid-cols-3")}>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {copy.labels.privateDeposits}
            </p>
            <p className="text-lg font-semibold text-foreground">
              {formatMoney(data.summary.privateDepositsCents, locale, data.currency)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {copy.labels.privateWithdrawals}
            </p>
            <p className="text-lg font-semibold text-foreground">
              {formatMoney(data.summary.privateWithdrawalsCents, locale, data.currency)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {copy.labels.dailyClosing}
            </p>
            <p className="text-lg font-semibold text-foreground">{statusLabel}</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className={cn(subtlePanelClass, "p-4")}>
            <p className="text-sm text-muted-foreground">{copy.labels.countedCash}</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {typeof data.summary.countedCashCents === "number"
                ? formatMoney(data.summary.countedCashCents, locale, data.currency)
                : copy.helpers.countNotEntered}
            </p>
          </div>
          <div className={cn(subtlePanelClass, "p-4")}>
            <p className="text-sm text-muted-foreground">{copy.labels.difference}</p>
            <p
              className={cn(
                "mt-2 text-2xl font-semibold",
                data.summary.differenceCents === 0
                  ? "text-success"
                  : typeof data.summary.differenceCents === "number"
                    ? "text-warning"
                    : "text-foreground"
              )}
            >
              {differenceLabel}
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {copy.helpers.includesPrivateMovements(
            formatMoney(data.summary.privateDepositsCents, locale, data.currency),
            formatMoney(data.summary.privateWithdrawalsCents, locale, data.currency)
          )}
        </p>
      </CardContent>
    </Card>
  );
}

export function ActionRequiredList({ items, copy }: { items: ActionItem[]; copy: DashboardCopy }) {
  return (
    <Card className={cn("h-full", sectionCardClass)}>
      <CardHeader>
        <CardTitle>{copy.labels.actionRequired}</CardTitle>
        <CardDescription>{copy.headerSubtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title={copy.helpers.noActionNeeded}
            description={copy.helpers.noActionDescription}
          />
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "rounded-2xl p-4 shadow-sm shadow-foreground/5 dark:shadow-black/10",
                  toneStyles[severityTone[item.severity]]
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={toneBadge[severityTone[item.severity]]}>
                        {item.severity === "high"
                          ? copy.severity.high
                          : item.severity === "medium"
                            ? copy.severity.medium
                            : copy.severity.low}
                      </Badge>
                      <p className="font-medium text-foreground">{item.title}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link to={item.href} data-testid={`cash-dashboard-action-${item.id}`}>
                      {item.ctaLabel}
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const receiptBadgeVariant = (entry: CashDashboardEntry): ComponentProps<typeof Badge>["variant"] =>
  entry.receiptRequired ? (entry.hasReceipt ? "success" : "warning") : "muted";

export function RecentEntriesTable({
  entries,
  copy,
  locale,
  currency,
}: {
  entries: CashDashboardEntry[];
  copy: DashboardCopy;
  locale: string;
  currency: string;
}) {
  return (
    <Card className={cn("h-full", sectionCardClass)}>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle>{copy.labels.recentEntries}</CardTitle>
          <CardDescription>{copy.headerSubtitle}</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to={entries[0]?.actionHref ?? "/cash/registers"}>
            {copy.actions.seeAll}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <EmptyState
            icon={NotebookPen}
            title={copy.helpers.noEntriesTitle}
            description={copy.helpers.noEntriesDescription}
          />
        ) : (
          <div className={cn(insetPanelClass, "overflow-hidden p-0")}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{copy.labels.time}</TableHead>
                  <TableHead>{copy.labels.type}</TableHead>
                  <TableHead className="text-right">{copy.labels.amount}</TableHead>
                  <TableHead>{copy.labels.note}</TableHead>
                  <TableHead>{copy.labels.receipt}</TableHead>
                  <TableHead>{copy.labels.status}</TableHead>
                  <TableHead className="text-right">{copy.labels.rowActions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.slice(0, 8).map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Intl.DateTimeFormat(locale, {
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(entry.occurredAt))}
                    </TableCell>
                    <TableCell>{copy.entryTypes[entry.type]}</TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-semibold",
                        entry.type === "expense" || entry.type === "private-withdrawal"
                          ? "text-warning"
                          : "text-success"
                      )}
                    >
                      {entry.type === "expense" || entry.type === "private-withdrawal" ? "-" : "+"}
                      {formatMoney(entry.amountCents, locale, currency)}
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <span className="line-clamp-2">
                        {entry.note || <span className="text-muted-foreground">—</span>}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={receiptBadgeVariant(entry)}>
                        {entry.receiptRequired
                          ? entry.hasReceipt
                            ? copy.entryStatus.attached
                            : copy.entryStatus.missing
                          : copy.entryStatus.ok}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {entry.needsReview || entry.missingNote ? (
                        <Badge variant="warning">{copy.entryStatus.review}</Badge>
                      ) : (
                        <Badge variant="success">{copy.entryStatus.ok}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={entry.actionHref}>{copy.actions.edit}</Link>
                        </Button>
                        {entry.receiptRequired && !entry.hasReceipt ? (
                          <Button variant="outline" size="sm" asChild>
                            <Link to={entry.actionHref}>{copy.actions.attachReceipt}</Link>
                          </Button>
                        ) : null}
                        {entry.canReverse ? (
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={entry.actionHref}>{copy.actions.reverse}</Link>
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ReceiptStatusCard({
  data,
  copy,
}: {
  data: CashDashboardData;
  copy: DashboardCopy;
}) {
  const tone = data.status.missingReceiptsToday > 0 ? "warning" : "success";

  return (
    <Card className={cn("h-full", sectionCardClass)}>
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>{copy.labels.receiptStatus}</CardTitle>
            <CardDescription>
              {data.status.missingReceiptsToday > 0
                ? copy.helpers.receiptsIncomplete(data.status.missingReceiptsToday)
                : copy.helpers.receiptsComplete}
            </CardDescription>
          </div>
          <Badge variant={toneBadge[tone]}>
            {data.status.missingReceiptsToday > 0
              ? copy.helpers.statusNeedsReview
              : copy.helpers.statusClosed}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={cn(insetPanelClass, "p-4")}>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{copy.labels.receiptStatus}</span>
            <span className="font-medium text-foreground">
              {data.status.receiptCompletionPercent}%
            </span>
          </div>
          <Progress value={data.status.receiptCompletionPercent} className="mt-3" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricRow
            label={copy.labels.attachedToday}
            value={String(data.status.receiptsAttachedToday)}
          />
          <MetricRow
            label={copy.labels.missingToday}
            value={String(data.status.missingReceiptsToday)}
          />
          <MetricRow
            label={copy.labels.missingThisMonth}
            value={String(data.status.missingReceiptsThisMonth)}
          />
        </div>
        <Button variant={data.status.missingReceiptsToday > 0 ? "accent" : "outline"} asChild>
          <Link to={getCashDashboardEntriesHref(data.registerId)}>
            {copy.actions.attachNow}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function ChecklistRow({ label, done }: { label: string; done: boolean }) {
  const Icon = done ? CheckCircle2 : CircleDashed;

  return (
    <div className={cn(subtlePanelClass, "flex items-center gap-3 px-4 py-3")}>
      <Icon className={cn("h-4 w-4", done ? "text-success" : "text-muted-foreground")} />
      <span className="text-sm text-foreground">{label}</span>
    </div>
  );
}

export function ClosingWorkflowCard({
  data,
  copy,
  locale,
  dailyClosingEnabled,
  upgradeCopy,
}: {
  data: CashDashboardData;
  copy: DashboardCopy;
  locale: string;
  dailyClosingEnabled: boolean;
  upgradeCopy: DashboardUpgradeCopy;
}) {
  const differenceResolved =
    typeof data.summary.differenceCents !== "number" || data.summary.differenceCents === 0;
  const canClose = data.status.dayStatus === "ready-to-close";

  return (
    <Card className={cn("h-full", sectionCardClass)} data-testid="cash-dashboard-closing-workflow">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>{copy.labels.closingWorkflow}</CardTitle>
            <CardDescription>{copy.headerSubtitle}</CardDescription>
          </div>
          <Badge variant={toneBadge[statusTone(data.status.dayStatus)]}>
            {getStatusLabel(data.status.dayStatus, copy)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <MetricRow
            label={copy.labels.lastClosedDate}
            value={
              data.closing.lastClosedDate
                ? formatDateLong(data.closing.lastClosedDate, locale)
                : "—"
            }
          />
          <MetricRow label={copy.labels.closedBy} value={data.closing.lastClosedBy ?? "—"} />
          <MetricRow
            label={copy.labels.responsibleToday}
            value={data.closing.responsiblePerson ?? "—"}
          />
          <MetricRow
            label={copy.labels.countedCash}
            value={
              data.closing.countedCashEntered
                ? formatMoney(data.summary.countedCashCents ?? 0, locale, data.currency)
                : copy.helpers.countNotEntered
            }
          />
        </div>
        <ChecklistRow label={copy.labels.countedCash} done={data.closing.countedCashEntered} />
        <ChecklistRow label={copy.labels.difference} done={differenceResolved} />
        <ChecklistRow
          label={copy.labels.missingReceipts}
          done={data.status.missingReceiptsToday === 0}
        />
        {!dailyClosingEnabled ? (
          <Button variant="accent" asChild data-testid="cash-dashboard-close-day-button">
            <Link to="/billing">{upgradeCopy.upgradeToStarter}</Link>
          </Button>
        ) : (
          <Button
            variant={canClose ? "success" : "outline"}
            disabled={!canClose}
            asChild={canClose}
            data-testid="cash-dashboard-close-day-button"
          >
            {canClose ? (
              <Link to={getCashDashboardDayCloseHref(data.registerId, data.dayKey)}>
                {copy.actions.closeDay}
              </Link>
            ) : (
              <span>{copy.actions.closeDay}</span>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function ExportStatusCard({
  data,
  copy,
  locale,
  exportEnabled,
  upgradeCopy,
}: {
  data: CashDashboardData;
  copy: DashboardCopy;
  locale: string;
  exportEnabled: boolean;
  upgradeCopy: DashboardUpgradeCopy;
}) {
  const statusLabel = getExportStatusLabel(data.status.exportStatus, copy);

  return (
    <Card className={cn("h-full", sectionCardClass)} data-testid="cash-dashboard-export-status">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>{copy.labels.exportStatus}</CardTitle>
            <CardDescription>{copy.headerSubtitle}</CardDescription>
          </div>
          <Badge
            variant={toneBadge[exportTone(data.status.exportStatus)]}
            data-testid="cash-dashboard-export-status-badge"
          >
            {statusLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <MetricRow label={copy.labels.currentMonth} value={data.monthKey} />
          <MetricRow
            label={copy.labels.entriesCompleted}
            value={`${data.export.monthEntriesCompleted}/${data.export.monthEntriesTotal}`}
          />
          <MetricRow
            label={copy.labels.missingReceipts}
            value={String(data.status.missingReceiptsThisMonth)}
          />
          <MetricRow
            label={copy.labels.lastExport}
            value={
              data.export.lastExportDate ? formatDateLong(data.export.lastExportDate, locale) : "—"
            }
          />
        </div>
        <ChecklistRow
          label={copy.labels.exportChecklistDays}
          done={data.export.checklist.daysClosed}
        />
        <ChecklistRow
          label={copy.labels.exportChecklistReceipts}
          done={data.export.checklist.receiptsComplete}
        />
        <ChecklistRow
          label={copy.labels.exportChecklistReview}
          done={data.export.checklist.reviewQueueClear}
        />
        {!exportEnabled ? (
          <Button variant="accent" asChild data-testid="cash-dashboard-export-button">
            <Link to="/billing">{upgradeCopy.upgradeToStarter}</Link>
          </Button>
        ) : (
          <Button
            variant={data.status.exportStatus === "ready" ? "accent" : "outline"}
            disabled={data.status.exportStatus !== "ready"}
            asChild={data.status.exportStatus === "ready"}
            data-testid="cash-dashboard-export-button"
          >
            {data.status.exportStatus === "ready" ? (
              <Link to={getCashDashboardExportHref(data.registerId)}>
                {copy.actions.exportMonth}
              </Link>
            ) : (
              <span>{copy.actions.exportMonth}</span>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function TrendOverviewCard({
  data,
  copy,
  locale,
}: {
  data: CashDashboardData;
  copy: DashboardCopy;
  locale: string;
}) {
  const monthDelta =
    data.trend.lastMonthCashTotalCents === 0
      ? 0
      : Math.round(
          ((data.trend.monthCashTotalCents - data.trend.lastMonthCashTotalCents) /
            data.trend.lastMonthCashTotalCents) *
            100
        );

  return (
    <Card className={sectionCardClass}>
      <CardHeader>
        <CardTitle>{copy.labels.trendOverview}</CardTitle>
        <CardDescription>{copy.headerSubtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <MetricRow
            label={copy.labels.weekIncome}
            value={formatMoney(data.trend.weekIncomeCents, locale, data.currency)}
            valueClassName="text-success"
          />
          <MetricRow
            label={copy.labels.weekExpenses}
            value={formatMoney(data.trend.weekExpensesCents, locale, data.currency)}
            valueClassName="text-warning"
          />
          <MetricRow label={copy.labels.openDays} value={String(data.trend.openDaysCount)} />
          <MetricRow
            label={copy.labels.missingReceipts}
            value={String(data.trend.missingReceiptsCount)}
          />
        </div>
        <Separator />
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className={cn(subtlePanelClass, "p-4")}>
            <p className="text-sm font-medium text-muted-foreground">
              {copy.labels.monthVsLastMonth}
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {data.monthKey}
                </p>
                <p className="mt-1 text-xl font-semibold text-foreground">
                  {formatMoney(data.trend.monthCashTotalCents, locale, data.currency)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Previous</p>
                <p className="mt-1 text-xl font-semibold text-foreground">
                  {formatMoney(data.trend.lastMonthCashTotalCents, locale, data.currency)}
                </p>
              </div>
            </div>
          </div>
          <div className={cn(insetPanelClass, "p-4")}>
            <p className="text-sm font-medium text-muted-foreground">{copy.labels.status}</p>
            <p
              className={cn(
                "mt-3 text-3xl font-semibold",
                monthDelta >= 0 ? "text-success" : "text-warning"
              )}
            >
              {monthDelta >= 0 ? "+" : ""}
              {monthDelta}%
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{copy.labels.monthVsLastMonth}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AssistantHelpWidget({
  copy,
  aiAssistantEnabled,
  upgradeCopy,
}: {
  copy: DashboardCopy;
  aiAssistantEnabled: boolean;
  upgradeCopy: DashboardUpgradeCopy;
}) {
  if (!aiAssistantEnabled) {
    return (
      <Card className="border-border/70 bg-[linear-gradient(180deg,rgba(255,247,237,0.92),rgba(255,255,255,0.98))] shadow-sm shadow-foreground/5 dark:border-border/35 dark:bg-[linear-gradient(180deg,rgba(58,37,16,0.78),rgba(17,17,18,0.92))] dark:shadow-black/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-warning/12 p-3 text-warning dark:bg-warning/18">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>{upgradeCopy.assistantLockedTitle}</CardTitle>
              <CardDescription>{upgradeCopy.assistantLockedDescription}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="warning">{upgradeCopy.assistantLockedBadge}</Badge>
            <Badge variant="outline">Pro+</Badge>
          </div>
          <Button variant="accent" asChild>
            <Link to="/billing">{upgradeCopy.upgradeToPro}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/70 bg-[linear-gradient(180deg,rgba(221,241,236,0.72),rgba(255,255,255,0.96))] shadow-sm shadow-foreground/5 dark:border-border/35 dark:bg-[linear-gradient(180deg,rgba(19,53,50,0.75),rgba(11,20,24,0.92))] dark:shadow-black/20">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-accent/12 p-3 text-accent dark:bg-accent/18 dark:text-accent-foreground">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>{copy.assistant.title}</CardTitle>
            <CardDescription>{copy.assistant.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="accent">{copy.assistant.languages}</Badge>
          <Badge variant="outline">AI helper</Badge>
        </div>
        <div className="grid gap-2">
          {copy.assistant.prompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="rounded-xl border border-border/60 bg-background/85 px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-background dark:border-border/35 dark:bg-background/45 dark:hover:bg-background/60"
            >
              {prompt}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CashDashboardLoadingState({ copy }: { copy: DashboardCopy }) {
  return (
    <div className="space-y-6">
      <div className={cn(sectionCardClass, "rounded-3xl p-6")}>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-4 h-10 w-80" />
        <Skeleton className="mt-4 h-4 w-full max-w-2xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className={cn(sectionCardClass, "p-5")}>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-4 h-8 w-28" />
            <Skeleton className="mt-4 h-4 w-full" />
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card className={cn(sectionCardClass, "p-6")}>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-6 h-44 w-full" />
        </Card>
        <Card className={cn(sectionCardClass, "p-6")}>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-6 h-44 w-full" />
        </Card>
      </div>
      <p className="text-sm text-muted-foreground">
        {copy.helpers.loadingTitle}. {copy.helpers.loadingDescription}
      </p>
    </div>
  );
}

export function CashDashboardScreen() {
  const { i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const localeKey = resolveLocaleKey(i18n.resolvedLanguage ?? i18n.language);
  const copy = useDashboardCopy();
  const upgradeCopy = useDashboardUpgradeCopy();
  const locale = localeByLanguage[localeKey];
  const missingThisMonthHelperLabel =
    copy.labels.missingThisMonth?.toLocaleLowerCase(locale) ??
    copy.labels.missingReceipts?.toLocaleLowerCase(locale) ??
    "missing this month";
  const scenarioId = resolveCashDashboardScenarioId(searchParams.get("state"));
  const mode = resolveCashDashboardSurfaceMode(searchParams.get("mode"));
  const showPreview = searchParams.get("preview") === "1";
  const requestedRegisterId = searchParams.get("registerId") ?? undefined;
  const dayKey = searchParams.get("day") ?? undefined;

  const registersQuery = useQuery({
    queryKey: cashKeys.registers.list(),
    queryFn: () => cashManagementApi.listRegisters(),
    enabled: !showPreview,
  });

  const activeRegisterId = requestedRegisterId ?? registersQuery.data?.registers[0]?.id;
  const dashboardQuery = useQuery({
    queryKey: activeRegisterId
      ? cashKeys.dashboard.detail(activeRegisterId, { dayKey })
      : ["cash-dashboard", "missing-register"],
    queryFn: () => cashManagementApi.getDashboard(activeRegisterId as string, { dayKey }),
    enabled: !showPreview && Boolean(activeRegisterId),
  });
  const billingQuery = useQuery({
    queryKey: ["billing", "overview", CashManagementProductKey],
    queryFn: () => billingApi.getOverview(CashManagementProductKey),
    enabled: !showPreview,
  });

  const data = showPreview
    ? getCashDashboardData(scenarioId)
    : dashboardQuery.data
      ? mapCashDashboardResponse(dashboardQuery.data.dashboard)
      : null;

  if (!showPreview && (registersQuery.isLoading || dashboardQuery.isLoading)) {
    return (
      <DashboardPageFrame>
        <CashDashboardLoadingState copy={copy} />
      </DashboardPageFrame>
    );
  }

  if (
    !showPreview &&
    !requestedRegisterId &&
    registersQuery.data &&
    registersQuery.data.registers.length === 0
  ) {
    return (
      <DashboardPageFrame>
        <Card className={sectionCardClass}>
          <CardContent className="p-10">
            <EmptyState
              icon={Coins}
              title={copy.helpers.noEntriesTitle}
              description={copy.helpers.noEntriesDescription}
            />
          </CardContent>
        </Card>
      </DashboardPageFrame>
    );
  }

  if (!showPreview && (registersQuery.isError || dashboardQuery.isError || !data)) {
    return (
      <DashboardPageFrame>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{copy.headerTitle}</AlertTitle>
          <AlertDescription>
            The dashboard could not be loaded from the latest cash data.
          </AlertDescription>
        </Alert>
      </DashboardPageFrame>
    );
  }

  const actionItems = buildActionItems(data, copy);
  const featureValues = billingQuery.data?.billing.entitlements.featureValues ?? {};
  const dailyClosingEnabled =
    featureValues[CashManagementBillingFeatureKeys.dailyClosing] !== false;
  const exportEnabled = featureValues[CashManagementBillingFeatureKeys.canExport] !== false;
  const aiAssistantEnabled = featureValues[CashManagementBillingFeatureKeys.aiAssistant] !== false;

  if (showPreview && mode === "loading") {
    return (
      <DashboardPageFrame>
        <CashDashboardLoadingState copy={copy} />
      </DashboardPageFrame>
    );
  }

  if (showPreview && mode === "empty") {
    return (
      <DashboardPageFrame>
        <DashboardHeaderBanner
          data={data}
          copy={copy}
          locale={locale}
          previewControls={undefined}
        />
        <Card className={sectionCardClass}>
          <CardContent className="p-10">
            <EmptyState
              icon={Coins}
              title={copy.helpers.noEntriesTitle}
              description={copy.helpers.noEntriesDescription}
              action={
                <Button asChild>
                  <Link to={getCashDashboardEntriesHref(data.registerId)}>
                    {copy.actions.createFirstEntry}
                  </Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      </DashboardPageFrame>
    );
  }

  const previewControls = showPreview ? (
    <div className={cn(insetPanelClass, "flex flex-col gap-2 p-3")}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {copy.previewLabel}
      </p>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(copy.previewStates) as CashDashboardScenarioId[]).map((id) => (
          <Button
            key={id}
            variant={id === scenarioId ? "accent" : "outline"}
            size="sm"
            onClick={() => {
              const nextParams = new URLSearchParams(searchParams);
              nextParams.set("state", id);
              nextParams.delete("mode");
              setSearchParams(nextParams);
            }}
          >
            {copy.previewStates[id]}
          </Button>
        ))}
      </div>
    </div>
  ) : undefined;

  return (
    <DashboardPageFrame>
      {showPreview && mode === "warning" ? (
        <Alert className="border-warning/40 bg-warning-muted/50 dark:bg-warning-muted/20">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{copy.banner.staleTitle}</AlertTitle>
          <AlertDescription>{copy.banner.staleDescription}</AlertDescription>
        </Alert>
      ) : null}

      <DashboardHeaderBanner
        data={data}
        copy={copy}
        locale={locale}
        previewControls={previewControls}
      />

      <div className="mb-6">
        <OnboardingChecklist config={CASH_MANAGEMENT_JOURNEY} />
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <SummaryCard
          title={copy.labels.openingBalance}
          value={formatMoney(data.summary.openingBalanceCents, locale, data.currency)}
          helper={formatDateLong(data.dayKey, locale)}
          icon={Wallet}
          tone="neutral"
          testId="cash-dashboard-summary-opening-balance"
        />
        <SummaryCard
          title={copy.labels.cashInToday}
          value={formatMoney(data.summary.cashIncomeTodayCents, locale, data.currency)}
          helper={copy.entryTypes.income}
          icon={ArrowUpCircle}
          tone="success"
          testId="cash-dashboard-summary-cash-in"
        />
        <SummaryCard
          title={copy.labels.cashOutToday}
          value={formatMoney(data.summary.cashExpensesTodayCents, locale, data.currency)}
          helper={copy.entryTypes.expense}
          icon={ArrowDownCircle}
          tone="warning"
          testId="cash-dashboard-summary-cash-out"
        />
        <SummaryCard
          title={copy.labels.expectedBalance}
          value={formatMoney(data.summary.expectedClosingCents, locale, data.currency)}
          helper={copy.helpers.includesPrivateMovements(
            formatMoney(data.summary.privateDepositsCents, locale, data.currency),
            formatMoney(data.summary.privateWithdrawalsCents, locale, data.currency)
          )}
          icon={Euro}
          tone="neutral"
          testId="cash-dashboard-summary-expected-balance"
        />
        <SummaryCard
          title={copy.labels.missingReceipts}
          value={String(data.status.missingReceiptsToday)}
          helper={`${data.status.missingReceiptsThisMonth} ${missingThisMonthHelperLabel}`}
          icon={Receipt}
          tone={data.status.missingReceiptsToday > 0 ? "warning" : "success"}
          testId="cash-dashboard-summary-missing-receipts"
        />
        <SummaryCard
          title={copy.labels.dailyClosing}
          value={getStatusLabel(data.status.dayStatus, copy)}
          helper={formatDifferenceLabel(data.summary.differenceCents, copy, locale, data.currency)}
          icon={ClipboardCheck}
          tone={statusTone(data.status.dayStatus)}
          statusText={getStatusLabel(data.status.dayStatus, copy)}
          testId="cash-dashboard-summary-daily-closing"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <CashStatusPanel data={data} copy={copy} locale={locale} />
        <ActionRequiredList items={actionItems} copy={copy} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <RecentEntriesTable
          entries={data.recentEntries}
          copy={copy}
          locale={locale}
          currency={data.currency}
        />
        <ReceiptStatusCard data={data} copy={copy} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <ClosingWorkflowCard
          data={data}
          copy={copy}
          locale={locale}
          dailyClosingEnabled={dailyClosingEnabled}
          upgradeCopy={upgradeCopy}
        />
        <ExportStatusCard
          data={data}
          copy={copy}
          locale={locale}
          exportEnabled={exportEnabled}
          upgradeCopy={upgradeCopy}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <TrendOverviewCard data={data} copy={copy} locale={locale} />
        <AssistantHelpWidget
          copy={copy}
          aiAssistantEnabled={aiAssistantEnabled}
          upgradeCopy={upgradeCopy}
        />
      </div>
    </DashboardPageFrame>
  );
}
