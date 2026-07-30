import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams, useParams, useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
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

export function DailyCloseScreen() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const dayKey = searchParams.get("day") ?? new Date().toISOString().slice(0, 10);
  const [note, setNote] = useState("");
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [countedInput, setCountedInput] = useState<string>("");
  const [showDenominations, setShowDenominations] = useState(false);

  const registerQuery = useQuery({
    queryKey: id ? cashKeys.registers.detail(id) : ["cash-registers", "missing-id"],
    queryFn: () => cashManagementApi.getRegister(id as string),
    enabled: Boolean(id),
  });

  const previewQuery = useQuery({
    queryKey: id ? cashKeys.dayCloses.detail(id, dayKey) : ["cash-report-preview", "missing-id"],
    queryFn: () => cashManagementApi.getKassenbericht(id as string, dayKey),
    enabled: Boolean(id),
    retry: false,
  });

  const previewRecord = previewQuery.data?.preview;
  const isClosed = previewRecord?.status === "LOCKED";
  const status = previewRecord?.status;
  const expectedBalance = previewRecord?.expectedClosingCashCents ?? 0;
  const countedClosingCash = previewRecord?.countedClosingCashCents;
  const cashDifference = previewRecord?.cashDifferenceCents;
  const verificationStatus = previewRecord?.verificationStatus;
  const cashSalesCents = previewRecord?.calculatedCashSalesCents ?? 0;
  const currency = registerQuery.data?.register?.currency ?? "EUR";

  // Pre-fill with expected balance once loaded
  useEffect(() => {
    if (previewRecord && countedInput === "") {
      setCountedInput((expectedBalance / 100).toFixed(2));
    }
  }, [previewRecord]);

  // Denomination totals (cents)
  const denominationTotal = useMemo(
    () => denominations.reduce((sum, d) => sum + d * (counts[d] ?? 0), 0),
    [counts]
  );

  // Sync denomination table → input field
  const handleDenominationChange = (denomination: number, value: number) => {
    const next = { ...counts, [denomination]: Math.max(0, value) };
    setCounts(next);
    const total = denominations.reduce((sum, d) => sum + d * (next[d] ?? 0), 0);
    setCountedInput((total / 100).toFixed(2));
  };

  // Parsed counted balance in cents
  const countedBalanceCents = useMemo(() => {
    const parsed = parseFloat(countedInput.replace(",", "."));
    return isNaN(parsed) ? 0 : Math.round(parsed * 100);
  }, [countedInput]);

  const difference = countedBalanceCents - expectedBalance;

  const submitMutation = useMutation({
    mutationFn: () =>
      cashManagementApi.submitDayClose(id as string, dayKey, {
        mode: "COUNTED",
        countedClosingCashCents: countedBalanceCents,
        note: note.trim() || undefined,
        denominationCounts: denominations
          .map((d) => ({ denomination: d, count: counts[d] ?? 0, subtotal: d * (counts[d] ?? 0) }))
          .filter((l) => l.count > 0),
      }),
    onSuccess: async () => {
      if (!id) {
        return;
      }
      await invalidateCashRegisterQueries(queryClient, id);
      await queryClient.invalidateQueries({ queryKey: cashKeys.dayCloses.detail(id, dayKey) });
      navigate(`/cash/registers/${id}/kassenbericht?day=${dayKey}`);
    },
  });

  const handleConfirm = () => {
    submitMutation.mutate();
  };

  if (!id) {
    return null;
  }

  if (registerQuery.isLoading || previewQuery.isLoading) {
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
        <h1 className="text-2xl font-semibold">{t("cash.ui.dayClose.title", "Day Close")}</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to={`/cash/registers/${id}`}>{t("cash.ui.dayClose.backToRegister", "Back")}</Link>
          </Button>
          {isClosed ? (
            <>
              <Button variant="outline" asChild>
                <Link to={`/cash/registers/${id}/kassenbericht?day=${dayKey}`}>
                  {t("cash.ui.dayClose.viewReport", "View Kassenbericht")}
                </Link>
              </Button>
              <Button asChild>
                <Link to={`/cash/registers/${id}/entries`}>
                  {t("cash.ui.dayClose.addCorrectionEntry", "Corrections")}
                </Link>
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {isClosed && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          {t("cash.ui.dayClose.lockedInfo", "This day is locked. Use correction entries only.")}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("cash.ui.dayClose.closeDayFor", { register: registerQuery.data.register.name })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="day-key">{t("cash.ui.dayClose.day", "Business Date")}</Label>
              <Input
                id="day-key"
                type="date"
                value={dayKey}
                disabled={isClosed}
                onChange={(e) => {
                  setCountedInput("");
                  setCounts({});
                  setSearchParams({ day: e.target.value });
                }}
              />
            </div>
          </div>

          {/* ── OPEN or CALCULATED: Kassensturz entry form ── */}
          {(status === "OPEN" || status === "CALCULATED") && (
            <div className="space-y-5 mt-6 animate-in fade-in slide-in-from-bottom-2">
              {/* Expected / Counted / Difference summary */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 border rounded-lg bg-muted/20">
                  <p className="text-sm text-muted-foreground">{t("cash.ui.dayClose.expected")}</p>
                  <p className="text-xl font-semibold mt-1">
                    {formatMoney(expectedBalance, undefined, currency)}
                  </p>
                </div>

                <div className="p-4 border rounded-lg bg-muted/20 space-y-2">
                  <p className="text-sm text-muted-foreground">{t("cash.ui.dayClose.counted")}</p>
                  <Input
                    id="counted-input"
                    type="number"
                    step="0.01"
                    min={0}
                    value={countedInput}
                    onChange={(e) => {
                      setCountedInput(e.target.value);
                      // Clear denomination counts when user edits directly
                      setCounts({});
                    }}
                    className="text-xl font-semibold h-9"
                  />
                </div>

                <div
                  className={`p-4 border rounded-lg transition-colors ${
                    difference === 0
                      ? "bg-green-50 border-green-200 text-green-700"
                      : "bg-amber-50 border-amber-200 text-amber-700"
                  }`}
                >
                  <p className="text-sm opacity-80">{t("cash.ui.dayClose.difference")}</p>
                  <p className="text-xl font-semibold mt-1">
                    {formatMoney(difference, undefined, currency)}
                  </p>
                </div>
              </div>

              {/* Note — only when there is a difference */}
              {difference !== 0 && (
                <div className="space-y-2 animate-in fade-in">
                  <Label htmlFor="difference-note">{t("cash.ui.dayClose.note")}</Label>
                  <Textarea
                    id="difference-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={t("cash.ui.dayClose.notePlaceholder")}
                  />
                </div>
              )}

              {/* Denomination table (optional) */}
              <div className="border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowDenominations((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                >
                  <span>
                    {t("cash.ui.dayClose.countByDenomination")}
                    {denominationTotal > 0 && (
                      <span className="ml-2 text-foreground font-semibold">
                        ({formatMoney(denominationTotal, undefined, currency)})
                      </span>
                    )}
                  </span>
                  {showDenominations ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {showDenominations && (
                  <table className="min-w-full text-sm border-t animate-in fade-in slide-in-from-top-2">
                    <thead className="bg-muted/30 text-left">
                      <tr>
                        <th className="px-4 py-2 font-medium">
                          {t("cash.ui.dayClose.denomination")}
                        </th>
                        <th className="px-4 py-2 font-medium">{t("cash.ui.dayClose.count")}</th>
                        <th className="px-4 py-2 font-medium text-right">
                          {t("cash.ui.dayClose.subtotal")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {denominations.map((denomination) => {
                        const count = counts[denomination] ?? 0;
                        return (
                          <tr key={denomination} className="border-t">
                            <td className="px-4 py-2">
                              {formatMoney(denomination, undefined, currency)}
                            </td>
                            <td className="px-4 py-2">
                              <Input
                                type="number"
                                min={0}
                                value={String(count)}
                                onChange={(e) =>
                                  handleDenominationChange(
                                    denomination,
                                    Number(e.target.value || 0)
                                  )
                                }
                              />
                            </td>
                            <td className="px-4 py-2 text-right">
                              {formatMoney(denomination * count, undefined, currency)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <Button
                  onClick={handleConfirm}
                  disabled={submitMutation.isPending || (difference !== 0 && !note.trim())}
                >
                  {t("cash.ui.dayClose.confirmClose")}
                </Button>
              </div>

              {submitMutation.isError && (
                <p className="text-sm text-destructive">{t("cash.ui.dayClose.submitFailed")}</p>
              )}
            </div>
          )}

          {/* ── LOCKED: summary display only ── */}
          {status === "LOCKED" && (
            <div className="space-y-6 mt-6">
              {verificationStatus === "NOT_COUNTED" ? (
                <div className="p-4 rounded-lg bg-blue-50 text-blue-800 flex flex-col gap-2">
                  <p className="font-medium text-base">
                    {t("cash.ui.dayClose.dayCalculatedTitle")}
                  </p>
                  <p className="text-sm">{t("cash.ui.dayClose.dayCalculatedDesc")}</p>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs opacity-80">
                        {t("cash.ui.dayClose.expectedClosingCash")}
                      </p>
                      <p className="text-lg font-semibold">
                        {formatMoney(expectedBalance, undefined, currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs opacity-80">{t("cash.ui.dayClose.physicalCount")}</p>
                      <p className="text-lg font-semibold">{t("cash.ui.dayClose.notPerformed")}</p>
                    </div>
                    <div>
                      <p className="text-xs opacity-80">{t("cash.ui.dayClose.difference")}</p>
                      <p className="text-lg font-semibold">{t("cash.ui.dayClose.notAvailable")}</p>
                    </div>
                    <div>
                      <p className="text-xs opacity-80">{t("cash.ui.dayClose.tageslosung")}</p>
                      <p className="text-lg font-semibold">
                        {formatMoney(cashSalesCents, undefined, currency)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 border rounded-lg">
                  <p className="font-medium flex items-center gap-2 mb-4">
                    {cashDifference === 0 ? (
                      <CheckCircle2 className="text-green-600 h-5 w-5" />
                    ) : (
                      <AlertTriangle className="text-amber-600 h-5 w-5" />
                    )}
                    {cashDifference === 0
                      ? t("cash.ui.dayClose.countMatched")
                      : t("cash.ui.dayClose.countDifference")}
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t("cash.ui.dayClose.expected")}
                      </p>
                      <p className="text-lg font-semibold">
                        {formatMoney(expectedBalance, undefined, currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t("cash.ui.dayClose.counted")}
                      </p>
                      <p className="text-lg font-semibold">
                        {formatMoney(countedClosingCash!, undefined, currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t("cash.ui.dayClose.difference")}
                      </p>
                      <p
                        className={`text-lg font-semibold ${
                          cashDifference === 0 ? "text-green-600" : "text-amber-600"
                        }`}
                      >
                        {formatMoney(cashDifference!, undefined, currency)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
