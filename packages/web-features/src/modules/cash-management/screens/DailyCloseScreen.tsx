import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link, useSearchParams, useParams } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
} from "@corely/ui";
import { cashManagementApi } from "@corely/web-shared/lib/cash-management-api";
import { formatMoney } from "@corely/web-shared/shared/lib/formatters";
import { cashKeys, invalidateCashRegisterQueries } from "../queries";
import { useQueryClient } from "@tanstack/react-query";

const denominations = [50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

const getErrorStatus = (error: unknown): number | null => {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return null;
  }
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : null;
};

export function DailyCloseScreen() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const dayKey = searchParams.get("day") ?? new Date().toISOString().slice(0, 10);
  const [note, setNote] = useState("");
  const [counts, setCounts] = useState<Record<number, number>>({});

  const registerQuery = useQuery({
    queryKey: id ? cashKeys.registers.detail(id) : ["cash-registers", "missing-id"],
    queryFn: () => cashManagementApi.getRegister(id as string),
    enabled: Boolean(id),
  });

  const dayCloseQuery = useQuery({
    queryKey: id ? cashKeys.dayCloses.detail(id, dayKey) : ["cash-day-closes", "missing-id"],
    queryFn: () => cashManagementApi.getDayClose(id as string, dayKey),
    enabled: Boolean(id),
    retry: false,
  });

  const closeRecord = dayCloseQuery.data?.close;
  const closeNotFound = getErrorStatus(dayCloseQuery.error) === 404;
  const isClosed = closeRecord?.status === "SUBMITTED";

  const expectedBalance =
    closeRecord?.expectedBalance ?? registerQuery.data?.register.currentBalanceCents ?? 0;

  const countedFromLines = useMemo(() => {
    if (!closeRecord?.denominationCounts?.length) {
      return null;
    }
    return closeRecord.denominationCounts.reduce((sum, line) => sum + line.subtotal, 0);
  }, [closeRecord]);

  const countedBalance = useMemo(() => {
    if (countedFromLines !== null) {
      return countedFromLines;
    }
    return denominations.reduce(
      (sum, denomination) => sum + denomination * (counts[denomination] ?? 0),
      0
    );
  }, [countedFromLines, counts]);

  const difference = countedBalance - expectedBalance;

  const submitMutation = useMutation({
    mutationFn: () =>
      cashManagementApi.submitDayClose(id as string, dayKey, {
        countedBalanceCents: countedBalance,
        note: note.trim() || undefined,
        denominationCounts: denominations
          .map((denomination) => ({
            denomination,
            count: counts[denomination] ?? 0,
            subtotal: denomination * (counts[denomination] ?? 0),
          }))
          .filter((line) => line.count > 0),
      }),
    onSuccess: async () => {
      if (!id) {
        return;
      }
      await invalidateCashRegisterQueries(queryClient, id);
      await queryClient.invalidateQueries({ queryKey: cashKeys.dayCloses.detail(id, dayKey) });
    },
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

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-5 sm:px-5 sm:py-6 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{t("cash.ui.dayClose.title")}</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to={`/cash/registers/${id}`}>{t("cash.ui.dayClose.backToRegister")}</Link>
          </Button>
          {isClosed ? (
            <Button asChild>
              <Link to={`/cash/registers/${id}/entries`}>
                {t("cash.ui.dayClose.addCorrectionEntry")}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("cash.ui.dayClose.closeDayFor", { register: registerQuery.data.register.name })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="day-key">{t("cash.ui.dayClose.day")}</Label>
              <Input
                id="day-key"
                type="date"
                value={dayKey}
                disabled={isClosed}
                onChange={(event) => setSearchParams({ day: event.target.value })}
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {t("cash.ui.dayClose.expectedBalance")}
              </p>
              <p className="text-lg font-semibold">
                {formatMoney(expectedBalance, undefined, registerQuery.data.register.currency)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {t("cash.ui.dayClose.countedBalance")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("cash.ui.dayClose.countedBalanceHelp")}
              </p>
              <p className="text-lg font-semibold">
                {formatMoney(countedBalance, undefined, registerQuery.data.register.currency)}
              </p>
            </div>
          </div>

          <div className="rounded-md border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/30 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">{t("cash.ui.dayClose.denomination")}</th>
                  <th className="px-4 py-2 font-medium">{t("cash.ui.dayClose.count")}</th>
                  <th className="px-4 py-2 font-medium text-right">
                    {t("cash.ui.dayClose.subtotal")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {denominations.map((denomination) => {
                  const existingLine = closeRecord?.denominationCounts?.find(
                    (line) => line.denomination === denomination
                  );
                  const count = existingLine?.count ?? counts[denomination] ?? 0;
                  const subtotal = existingLine?.subtotal ?? denomination * count;
                  return (
                    <tr key={denomination} className="border-t">
                      <td className="px-4 py-2">
                        {formatMoney(denomination, undefined, registerQuery.data.register.currency)}
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          min={0}
                          value={String(count)}
                          disabled={isClosed}
                          onChange={(event) =>
                            setCounts((prev) => ({
                              ...prev,
                              [denomination]: Math.max(0, Number(event.target.value || 0)),
                            }))
                          }
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        {formatMoney(subtotal, undefined, registerQuery.data.register.currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className={difference === 0 ? "text-green-700" : "text-amber-700"}>
            <p className="text-sm">
              {t("cash.ui.dayClose.difference")}:{" "}
              {formatMoney(difference, undefined, registerQuery.data.register.currency)}
            </p>
            {difference !== 0 ? (
              <p className="mt-1 flex items-center gap-2 text-xs">
                <AlertTriangle className="h-4 w-4" />
                {t("cash.ui.dayClose.differenceNoteRequired")}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="difference-note">{t("cash.ui.dayClose.note")}</Label>
            <Textarea
              id="difference-note"
              value={closeRecord?.note ?? note}
              disabled={isClosed}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t("cash.ui.dayClose.notePlaceholder")}
            />
          </div>

          {submitMutation.isError ? (
            <p className="text-sm text-destructive">{t("cash.ui.dayClose.submitFailed")}</p>
          ) : null}

          {!isClosed ? (
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending || (difference !== 0 && !note.trim())}
            >
              {t("cash.ui.dayClose.submitAndLock")}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">{t("cash.ui.dayClose.lockedInfo")}</p>
          )}

          {dayCloseQuery.isError && !closeNotFound ? (
            <p className="text-sm text-destructive">{t("cash.ui.dayClose.loadExistingFailed")}</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
