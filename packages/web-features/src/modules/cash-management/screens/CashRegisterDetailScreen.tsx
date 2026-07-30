import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CalendarX2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@corely/ui";
import { cashManagementApi } from "@corely/web-shared/lib/cash-management-api";
import { formatDateTime, formatMoney } from "@corely/web-shared/shared/lib/formatters";
import { useCashPermissions } from "../access";
import { cashKeys } from "../queries";

/** Returns "YYYY-MM-DD" for N days ago (default 1 = yesterday). */
function getDayKey(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().slice(0, 10);
}

/** Returns the day after a YYYY-MM-DD string. */
function nextDay(dayKey: string): string {
  const d = new Date(dayKey + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Builds a list of every date in [from, to] inclusive (YYYY-MM-DD). */
function buildDateRange(from: string, to: string): string[] {
  const result: string[] = [];
  let cur = from;
  while (cur <= to) {
    result.push(cur);
    cur = nextDay(cur);
    if (result.length > 365) {
      break;
    } // safety cap
  }
  return result;
}

export function CashRegisterDetailScreen() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canManageCash, canCloseCash, canExportCash } = useCashPermissions();
  const [showUnclosedModal, setShowUnclosedModal] = useState(false);

  const registerQuery = useQuery({
    queryKey: id ? cashKeys.registers.detail(id) : ["cash-registers", "missing-id"],
    queryFn: () => cashManagementApi.getRegister(id as string),
    enabled: Boolean(id),
  });

  const entriesQuery = useQuery({
    queryKey: id
      ? cashKeys.entries.list({ registerId: id, preview: true })
      : ["cash-entries", "missing-id"],
    queryFn: async () => {
      const result = await cashManagementApi.listEntries(id as string);
      return {
        entries: result.entries.slice(0, 8),
      };
    },
    enabled: Boolean(id) && canManageCash,
  });

  const closesQuery = useQuery({
    queryKey: id
      ? cashKeys.dayCloses.list({
          registerId: id,
          dayKeyFrom: "0000-01-01",
        })
      : ["cash-day-closes", "missing-id"],
    queryFn: () => cashManagementApi.listDayCloses(id as string),
    enabled: Boolean(id) && canManageCash,
  });

  if (!id) {
    return null;
  }

  if (registerQuery.isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">{t("cash.ui.common.loadingRegister")}</div>
    );
  }

  if (!registerQuery.data?.register) {
    return (
      <div className="p-6 text-sm text-destructive">{t("cash.ui.common.registerNotFound")}</div>
    );
  }

  const register = registerQuery.data.register;
  const entries = entriesQuery.data?.entries ?? [];
  const closes = closesQuery.data?.closes ?? [];
  const lastClosed = closes
    .filter((close) => close.status === "SUBMITTED")
    .sort((a, b) => (a.dayKey < b.dayKey ? 1 : -1))[0];

  const yesterday = getDayKey(1);
  // The earliest day the user still needs to close
  const earliestUnclosedDay = lastClosed ? nextDay(lastClosed.dayKey) : getDayKey(1);
  const hasUnclosedDays = !lastClosed || lastClosed.dayKey < yesterday;

  return (
    <div className="min-w-0 space-y-5 px-4 py-5 sm:px-5 sm:py-6 lg:space-y-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-semibold">{register.name}</h1>
          <p className="text-sm text-muted-foreground">
            {register.location ?? t("cash.ui.common.noLocation")} · {register.currency}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          {canManageCash ? (
            <Button asChild className="w-full sm:w-auto">
              <Link to={`/cash/registers/${id}/entries`}>
                {t("cash.ui.registerDetail.newCashEntry")}
              </Link>
            </Button>
          ) : null}
          {canCloseCash ? (
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <Link
                to={`/cash/registers/${id}/day-close?day=${new Date().toISOString().slice(0, 10)}`}
              >
                {t("cash.ui.registerDetail.closeDay")}
              </Link>
            </Button>
          ) : null}
          {lastClosed ? (
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                if (hasUnclosedDays) {
                  setShowUnclosedModal(true);
                } else {
                  navigate(`/cash/registers/${id}/kassenbericht?day=${lastClosed.dayKey}`);
                }
              }}
            >
              {t("cash.ui.registerDetail.kassenbericht")}
            </Button>
          ) : null}
          {canExportCash ? (
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <Link to={`/cash/registers/${id}/exports`}>{t("cash.ui.registerDetail.export")}</Link>
            </Button>
          ) : null}
          {canManageCash ? (
            <Button variant="ghost" asChild className="w-full sm:w-auto">
              <Link to={`/cash/registers/${id}/edit`}>{t("cash.ui.registerDetail.edit")}</Link>
            </Button>
          ) : null}
        </div>
      </div>

      {/* Unclosed days warning modal */}
      <Dialog open={showUnclosedModal} onOpenChange={setShowUnclosedModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("cash.ui.registerDetail.unclosedDaysModal.title")}</DialogTitle>
            <DialogDescription className="space-y-2 pt-1">
              <span className="block">
                {t("cash.ui.registerDetail.unclosedDaysModal.description")}
              </span>
              <span className="block font-semibold text-foreground">
                {new Date(earliestUnclosedDay + "T12:00:00Z").toLocaleDateString(i18n.language, {
                  weekday: "long",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button variant="outline" onClick={() => setShowUnclosedModal(false)}>
              {t("cash.ui.registerDetail.unclosedDaysModal.cancel")}
            </Button>
            {lastClosed && (
              <Button
                variant="outline"
                onClick={() => {
                  setShowUnclosedModal(false);
                  navigate(`/cash/registers/${id}/kassenbericht?day=${lastClosed.dayKey}`);
                }}
              >
                {t("cash.ui.registerDetail.unclosedDaysModal.viewLastKassenbericht")}
              </Button>
            )}
            <Button
              onClick={() => {
                setShowUnclosedModal(false);
                navigate(`/cash/registers/${id}/day-close?day=${earliestUnclosedDay}`);
              }}
            >
              {t("cash.ui.registerDetail.unclosedDaysModal.goClose")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("cash.ui.registerDetail.currentBalance")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatMoney(register.currentBalanceCents, undefined, register.currency)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("cash.ui.registerDetail.lastClosedDay")}</CardTitle>
          </CardHeader>
          <CardContent>
            {canManageCash && lastClosed ? (
              <span>{lastClosed.dayKey}</span>
            ) : (
              <span className="text-sm text-muted-foreground">
                {t("cash.ui.registerDetail.noSubmittedClose")}
              </span>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={hasUnclosedDays && canCloseCash ? "unclosed" : "overview"}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">{t("cash.ui.registerDetail.tabs.overview")}</TabsTrigger>
          {canManageCash ? (
            <TabsTrigger value="entries">
              {t("cash.ui.registerDetail.tabs.entriesPreview")}
            </TabsTrigger>
          ) : null}
          {canManageCash ? (
            <TabsTrigger value="activity">
              {t("cash.ui.registerDetail.tabs.activityAudit")}
            </TabsTrigger>
          ) : null}
          {canCloseCash && hasUnclosedDays ? (
            <TabsTrigger value="unclosed" className="gap-1.5">
              <CalendarX2 className="h-3.5 w-3.5" />
              {t("cash.ui.registerDetail.tabs.unclosedDays")}
              <span className="ml-1 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground leading-none">
                {buildDateRange(earliestUnclosedDay, yesterday).length}
              </span>
            </TabsTrigger>
          ) : null}
        </TabsList>
        <TabsContent value="overview">
          <Card>
            <CardContent className="space-y-2 pt-6 text-sm">
              <p className="break-words">
                {t("cash.ui.registerDetail.registerId")}:{" "}
                <code className="break-all rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  {register.id}
                </code>
              </p>
              <p>
                {t("cash.ui.registerDetail.negativeBalancePolicy")}:{" "}
                <Badge variant={register.disallowNegativeBalance ? "destructive" : "outline"}>
                  {register.disallowNegativeBalance
                    ? t("cash.ui.registerDetail.policyBlocked")
                    : t("cash.ui.registerDetail.policyAllowed")}
                </Badge>
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        {canManageCash ? (
          <TabsContent value="entries">
            <Card>
              <CardContent className="pt-6">
                {entries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("cash.ui.registerDetail.noEntriesYet")}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex flex-col gap-2 rounded-md border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium">{entry.description}</p>
                          <p className="text-muted-foreground">
                            #{entry.entryNo} · {formatDateTime(entry.occurredAt)}
                          </p>
                        </div>
                        <p
                          className={`shrink-0 ${entry.direction === "OUT" ? "text-red-600" : "text-green-600"}`}
                        >
                          {entry.direction === "OUT" ? "-" : "+"}
                          {formatMoney(entry.amount, undefined, entry.currency)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4">
                  <Button variant="outline" asChild>
                    <Link to={`/cash/registers/${id}/entries`}>
                      {t("cash.ui.registerDetail.openFullEntries")}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}
        {canManageCash ? (
          <TabsContent value="activity">
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground">
                {t("cash.ui.registerDetail.activityPrefix")}{" "}
                <strong>{t("cash.ui.registerDetail.auditPack")}</strong>{" "}
                {t("cash.ui.registerDetail.activitySuffix")}
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}

        {canCloseCash && hasUnclosedDays ? (
          <TabsContent value="unclosed">
            <Card>
              <CardContent className="pt-4 pb-2">
                {closesQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground py-4">
                    {t("cash.ui.common.loadingRegister")}
                  </p>
                ) : (
                  (() => {
                    const closedSet = new Set(
                      closes.filter((c) => c.status === "SUBMITTED").map((c) => c.dayKey)
                    );
                    const draftMap = new Map(
                      closes.filter((c) => c.status === "DRAFT").map((c) => [c.dayKey, c])
                    );
                    const days = buildDateRange(earliestUnclosedDay, yesterday).filter(
                      (d) => !closedSet.has(d)
                    );

                    return (
                      <div className="divide-y">
                        {days.map((day) => {
                          const draft = draftMap.get(day);
                          const displayDay = new Date(day + "T12:00:00Z").toLocaleDateString(
                            i18n.language,
                            { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }
                          );
                          return (
                            <Link
                              key={day}
                              to={`/cash/registers/${id}/day-close?day=${day}`}
                              className="flex items-center justify-between gap-3 py-3 px-1 hover:bg-muted/40 rounded transition-colors group"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <CalendarX2 className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
                                <span className="text-sm font-medium">{displayDay}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {draft ? (
                                  <Badge variant="outline" className="text-xs">
                                    {t("cash.ui.registerDetail.unclosedDays.draft")}
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="text-xs">
                                    {t("cash.ui.registerDetail.unclosedDays.open")}
                                  </Badge>
                                )}
                                <span className="text-xs text-muted-foreground group-hover:text-foreground">
                                  {t("cash.ui.registerDetail.unclosedDays.close")}
                                </span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    );
                  })()
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
