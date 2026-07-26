import { type MonthlyCashReportDto } from "@corely/contracts";

export function MonthlyCashReportPreview({ report }: { report: MonthlyCashReportDto }) {
  const formatCurrencyCents = (cents: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100);
  };

  return (
    <div
      className="rounded-lg border bg-card text-card-foreground shadow-sm"
      data-testid="monthly-cash-report-preview"
    >
      <div className="flex flex-col space-y-1.5 p-6 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold leading-none tracking-tight">
            Kassenabrechnung - {report.year}-{String(report.month).padStart(2, "0")}
          </h3>
          {report.isComplete ? (
            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 border-emerald-200">
              Vollständig
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-red-100 text-red-800 border-red-200">
              Unvollständig
            </span>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {report.warnings.length > 0 && (
          <div className="rounded-md border p-4 bg-amber-50/50 border-amber-200">
            <h4 className="mb-2 font-medium text-amber-900">Hinweise & Fehler</h4>
            <ul className="list-disc list-inside space-y-1">
              {report.warnings.map((w, i) => (
                <li
                  key={i}
                  className={w.severity === "warning" ? "text-amber-800" : "text-red-700"}
                >
                  {w.date ? `[${w.date}] ` : ""}
                  {w.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h4 className="text-sm font-medium leading-none mb-4">Monatsübersicht</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Erster Anfangsbestand:</span>
                <span>
                  {report.openingCashCents !== null
                    ? formatCurrencyCents(report.openingCashCents)
                    : "-"}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Letzter Endbestand:</span>
                <span className="font-semibold">
                  {report.closingCashCents !== null
                    ? formatCurrencyCents(report.closingCashCents)
                    : "-"}
                </span>
              </div>
            </div>
            <div className="rounded-lg border p-4 space-y-2 break-inside-avoid">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Abgeschlossene Tage:</span>
                <span>{report.closedDayCount}</span>
              </div>
              {report.coverage?.status === "ACTIVE_PERIOD_UNKNOWN" ? (
                <div className="text-sm text-amber-700 bg-amber-50 p-2 rounded border border-amber-100 print:border-none print:bg-transparent">
                  Corely cannot determine whether all required days are present because the
                  register’s active period has not been configured.
                </div>
              ) : (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Fehlende Tage:</span>
                  <span
                    className={
                      (report.coverage?.missingDayCount ?? 0) > 0 ? "text-red-600 font-medium" : ""
                    }
                  >
                    {report.coverage?.missingDayCount ?? 0}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium leading-none mb-4">Summen</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span>Bareinnahmen (Umsatz):</span>
                <span>{formatCurrencyCents(report.totals.cashSalesCents)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Privateinlagen:</span>
                <span>{formatCurrencyCents(report.totals.privateDepositsCents)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Bankabhebungen (zur Kasse):</span>
                <span>{formatCurrencyCents(report.totals.bankWithdrawalsToCashCents)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Sonstige Einnahmen:</span>
                <span>{formatCurrencyCents(report.totals.otherNonSalesCashInflowsCents)}</span>
              </div>
            </div>
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span>Wareneinkäufe:</span>
                <span>{formatCurrencyCents(report.totals.goodsPurchasesCents)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Betriebsausgaben:</span>
                <span>{formatCurrencyCents(report.totals.businessExpensesCents)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Privatentnahmen:</span>
                <span>{formatCurrencyCents(report.totals.privateWithdrawalsCents)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Bankeinzahlungen:</span>
                <span>{formatCurrencyCents(report.totals.bankDepositsCents)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Sonstige Ausgaben:</span>
                <span>{formatCurrencyCents(report.totals.otherCashOutflowsCents)}</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium leading-none mb-4">Tagesübersicht</h4>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground border-b">
                <tr>
                  <th className="p-3 text-left font-medium">Datum</th>
                  <th className="p-3 text-right font-medium">Anfangsbestand</th>
                  <th className="p-3 text-right font-medium">Umsatz (bar)</th>
                  <th className="p-3 text-right font-medium">Ausgaben (bar)</th>
                  <th className="p-3 text-right font-medium">Soll-Endbestand</th>
                  <th className="p-3 text-right font-medium">Ist-Endbestand</th>
                  <th className="p-3 text-right font-medium">Differenz</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {report.days.map((day) => (
                  <tr key={day.date} className="hover:bg-muted/30">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {day.date}
                        {day.status === "MISSING" && (
                          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold bg-red-100 text-red-800 border-red-200">
                            Fehlt
                          </span>
                        )}
                        {day.status === "DISCREPANCY" && (
                          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-800 border-amber-200">
                            Differenz
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      {day.openingCashCents !== null
                        ? formatCurrencyCents(day.openingCashCents)
                        : "-"}
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      {formatCurrencyCents(day.cashSalesCents)}
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      {formatCurrencyCents(day.cashOutflowsCents)}
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      {day.calculatedClosingCashCents !== null
                        ? formatCurrencyCents(day.calculatedClosingCashCents)
                        : "-"}
                    </td>
                    <td className="p-3 text-right tabular-nums font-semibold">
                      {day.actualClosingCashCents !== null
                        ? formatCurrencyCents(day.actualClosingCashCents)
                        : "-"}
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      {day.discrepancyCents === null ? (
                        "-"
                      ) : day.discrepancyCents === 0 ? (
                        formatCurrencyCents(0)
                      ) : (
                        <span
                          className={day.discrepancyCents < 0 ? "text-red-600" : "text-emerald-600"}
                        >
                          {formatCurrencyCents(day.discrepancyCents)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
