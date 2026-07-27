import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, Button, Input } from "@corely/ui";
import { type CashReportPreviewDto } from "@corely/contracts";
import { cashManagementApi } from "@corely/web-shared/lib/cash-management-api";


function formatNumber(amountCents: number) {
  if (amountCents === 0) {
    return "0,00";
  }
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
}

function KassenberichtPaper({ report }: { report: CashReportPreviewDto }) {
  const { t } = useTranslation();
  const otherOutflows = report.bankDepositsCents + report.otherCashOutflowsCents;
  const totalOutflows =
    report.goodsPurchasesCents +
    report.businessExpensesCents +
    report.privateWithdrawalsCents +
    otherOutflows;

  const closingCash = report.effectiveClosingCashCents;
  const cashReceived = closingCash + totalOutflows - report.previousClosingCashCents;
  const otherIncome =
    report.privateDepositsCents +
    report.bankWithdrawalsToCashCents +
    report.otherNonSalesCashInflowsCents;

  const displayDate = new Date(report.businessDate).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="w-full overflow-x-auto print:overflow-visible">
      <article
        className="mx-auto min-w-[700px] max-w-[800px] bg-white p-8 font-sans text-black shadow-sm print:min-w-0 print:max-w-none print:p-0 print:shadow-none"
        data-testid="kassenbericht-paper"
      >
        {/* Header */}
        <div className="mb-2 flex items-end justify-between">
          <div className="flex items-baseline gap-2">
            <h1 className="text-2xl font-bold text-black">Kassenbericht</h1>
            <div className="ml-2 text-sm">
              Datum{" "}
              {t("cash.ui.kassenbericht.explanations.date") && (
                <span className="text-xs text-muted-foreground">
                  ({t("cash.ui.kassenbericht.explanations.date")})
                </span>
              )}{" "}
              <span
                className="inline-block border-b border-black text-center text-lg"
                style={{ width: "120px" }}
              >
                {displayDate}
              </span>
            </div>
            <div className="ml-2 text-sm">
              Nr.{" "}
              {t("cash.ui.kassenbericht.explanations.number") && (
                <span className="text-xs text-muted-foreground">
                  ({t("cash.ui.kassenbericht.explanations.number")})
                </span>
              )}{" "}
              <span className="inline-block border-b border-black" style={{ width: "60px" }}></span>
            </div>
          </div>
          <div className="text-right text-sm leading-tight">
            <div>
              Währung{" "}
              {t("cash.ui.kassenbericht.explanations.currency") && (
                <span className="text-xs text-muted-foreground">
                  ({t("cash.ui.kassenbericht.explanations.currency")})
                </span>
              )}
            </div>
            <div className="font-bold">EUR</div>
          </div>
        </div>

        {/* Table */}
        <table className="w-full border-collapse border border-black text-sm">
          <colgroup>
            <col className="w-auto" />
            <col className="w-8" />
            <col className="w-24" />
            <col className="w-32" />
            <col className="w-16" />
          </colgroup>
          <tbody>
            <tr>
              <td colSpan={3} className="border border-black p-2 font-bold">
                Kassenbestand bei Geschäftsschluss
                {t("cash.ui.kassenbericht.explanations.closingCash") && (
                  <div className="text-xs font-normal text-muted-foreground mt-0.5">
                    {t("cash.ui.kassenbericht.explanations.closingCash")}
                  </div>
                )}
              </td>
              <td className="border border-black p-2 text-right text-lg tabular-nums">
                {formatNumber(closingCash)}
              </td>
              <td className="border border-black p-1 text-center align-top text-[10px] leading-tight">
                Buch-
                <br />
                vermerk
                {t("cash.ui.kassenbericht.explanations.bookNote") && (
                  <div className="text-[9px] font-normal text-muted-foreground mt-0.5">
                    {t("cash.ui.kassenbericht.explanations.bookNote")}
                  </div>
                )}
              </td>
            </tr>

            <tr>
              <td className="border border-black p-2 font-bold">
                Ausgaben im Laufe des Tages
                {t("cash.ui.kassenbericht.explanations.outflows") && (
                  <div className="text-xs font-normal text-muted-foreground mt-0.5">
                    {t("cash.ui.kassenbericht.explanations.outflows")}
                  </div>
                )}
              </td>
              <td className="border border-black p-1 text-center text-xs">%</td>
              <td className="border border-black p-1 text-center text-xs leading-tight">
                Vorsteuer
                <br />
                Betrag
                {t("cash.ui.kassenbericht.explanations.taxAmount") && (
                  <div className="text-[9px] font-normal text-muted-foreground mt-0.5">
                    {t("cash.ui.kassenbericht.explanations.taxAmount")}
                  </div>
                )}
              </td>
              <td className="border border-black p-1 text-center text-xs leading-tight">
                Netto-/Brutto-
                <br />
                Betrag
                {t("cash.ui.kassenbericht.explanations.netGrossAmount") && (
                  <div className="text-[9px] font-normal text-muted-foreground mt-0.5">
                    {t("cash.ui.kassenbericht.explanations.netGrossAmount")}
                  </div>
                )}
              </td>
              <td className="border-b border-r border-black"></td>
            </tr>

            <tr>
              <td className="border border-black p-2">
                1. Wareneinkäufe und Warennebenkosten
                {t("cash.ui.kassenbericht.explanations.purchases") && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t("cash.ui.kassenbericht.explanations.purchases")}
                  </div>
                )}
              </td>
              <td className="border border-black"></td>
              <td className="border border-black"></td>
              <td className="border border-black p-2 text-right text-lg tabular-nums">
                {report.goodsPurchasesCents > 0 ? formatNumber(report.goodsPurchasesCents) : ""}
              </td>
              <td className="border-b border-r border-black"></td>
            </tr>

            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={`empty-1-${i}`}>
                <td className="border border-black p-2 h-7"></td>
                <td className="border border-black"></td>
                <td className="border border-black"></td>
                <td className="border border-black p-2 text-right text-lg tabular-nums"></td>
                <td className="border-b border-r border-black"></td>
              </tr>
            ))}

            <tr>
              <td className="border border-black p-2">
                2. Geschäftsausgaben
                {t("cash.ui.kassenbericht.explanations.expenses") && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t("cash.ui.kassenbericht.explanations.expenses")}
                  </div>
                )}
              </td>
              <td className="border border-black"></td>
              <td className="border border-black"></td>
              <td className="border border-black p-2 text-right text-lg tabular-nums">
                {report.businessExpensesCents > 0 ? formatNumber(report.businessExpensesCents) : ""}
              </td>
              <td className="border-b border-r border-black"></td>
            </tr>

            {Array.from({ length: 3 }).map((_, i) => (
              <tr key={`empty-2-${i}`}>
                <td className="border border-black p-2 h-7"></td>
                <td className="border border-black"></td>
                <td className="border border-black"></td>
                <td className="border border-black p-2 text-right text-lg tabular-nums"></td>
                <td className="border-b border-r border-black"></td>
              </tr>
            ))}

            <tr>
              <td className="border border-black p-2">
                3. Privatentnahmen
                {t("cash.ui.kassenbericht.explanations.withdrawals") && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t("cash.ui.kassenbericht.explanations.withdrawals")}
                  </div>
                )}
              </td>
              <td className="border border-black"></td>
              <td className="border border-black"></td>
              <td className="border border-black p-2 text-right text-lg tabular-nums">
                {report.privateWithdrawalsCents > 0
                  ? formatNumber(report.privateWithdrawalsCents)
                  : ""}
              </td>
              <td className="border-b border-r border-black"></td>
            </tr>

            <tr>
              <td className="border border-black p-2">
                4. Sonstige Ausgaben (z.B. Bankeinzahlungen)
                {t("cash.ui.kassenbericht.explanations.otherOutflows") && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t("cash.ui.kassenbericht.explanations.otherOutflows")}
                  </div>
                )}
              </td>
              <td className="border border-black"></td>
              <td className="border border-black"></td>
              <td className="border border-black p-2 text-right text-lg tabular-nums">
                {otherOutflows > 0 ? formatNumber(otherOutflows) : ""}
              </td>
              <td className="border-b border-r border-black"></td>
            </tr>

            {Array.from({ length: 3 }).map((_, i) => (
              <tr key={`empty-3-${i}`}>
                <td className="border border-black p-2 h-7"></td>
                <td className="border border-black"></td>
                <td className="border border-black"></td>
                <td className="border border-black p-2 text-right text-lg tabular-nums"></td>
                <td className="border-b border-r border-black"></td>
              </tr>
            ))}

            <tr>
              <td colSpan={3} className="border border-black p-2 text-right text-sm">
                Summe
                {t("cash.ui.kassenbericht.explanations.total") && (
                  <span className="ml-2 text-xs text-muted-foreground font-normal">
                    ({t("cash.ui.kassenbericht.explanations.total")})
                  </span>
                )}
              </td>
              <td className="border border-black p-2 text-right text-lg tabular-nums">
                {formatNumber(totalOutflows)}
              </td>
              <td className="border-b border-r border-black"></td>
            </tr>

            <tr>
              <td colSpan={3} className="border border-black p-2 text-sm">
                abzüglich Kassenendbestand des Vortages
                {t("cash.ui.kassenbericht.explanations.previousClosingCash") && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t("cash.ui.kassenbericht.explanations.previousClosingCash")}
                  </div>
                )}
              </td>
              <td className="border border-black p-2 text-right text-lg tabular-nums">
                {formatNumber(report.previousClosingCashCents)}
              </td>
              <td className="border-b border-r border-black"></td>
            </tr>

            <tr>
              <td colSpan={3} className="border border-black p-2 text-sm font-bold">
                = Kasseneingang
                {t("cash.ui.kassenbericht.explanations.cashReceived") && (
                  <div className="text-xs font-normal text-muted-foreground mt-0.5">
                    {t("cash.ui.kassenbericht.explanations.cashReceived")}
                  </div>
                )}
              </td>
              <td className="border border-black p-2 text-right text-lg font-bold tabular-nums">
                {formatNumber(cashReceived)}
              </td>
              <td className="border-b border-r border-black"></td>
            </tr>

            <tr>
              <td className="border border-black p-2 text-sm">
                abzüglich sonstige Einnahmen
                {t("cash.ui.kassenbericht.explanations.otherIncome") && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t("cash.ui.kassenbericht.explanations.otherIncome")}
                  </div>
                )}
              </td>
              <td className="border border-black"></td>
              <td className="border border-black"></td>
              <td className="border border-black p-2 text-right text-lg tabular-nums">
                {formatNumber(otherIncome)}
              </td>
              <td className="border-b border-r border-black"></td>
            </tr>

            <tr>
              <td colSpan={3} className="border border-black p-2 text-sm font-bold">
                = Bareinnahmen (Tageslosung)
                {t("cash.ui.kassenbericht.explanations.cashSales") && (
                  <div className="text-xs font-normal text-muted-foreground mt-0.5">
                    {t("cash.ui.kassenbericht.explanations.cashSales")}
                  </div>
                )}
              </td>
              <td className="border border-black p-2 text-right text-lg font-bold tabular-nums">
                {formatNumber(report.calculatedCashSalesCents)}
              </td>
              <td className="border-b border-r border-black"></td>
            </tr>
          </tbody>
        </table>

        {/* Footer */}
        <div className="mt-8 flex justify-between text-sm">
          <div className="flex items-end">
            <div>
              Kundenzahl
              {t("cash.ui.kassenbericht.explanations.customerCount") && (
                <div className="text-xs text-muted-foreground leading-none mt-1">
                  {t("cash.ui.kassenbericht.explanations.customerCount")}
                </div>
              )}
            </div>
            <span
              className="ml-2 inline-block border-b border-black text-center text-xl"
              style={{ width: "100px" }}
            >
              {report.customerCount ?? ""}
            </span>
          </div>
          <div className="flex items-end">
            <div>
              Unterschrift
              {t("cash.ui.kassenbericht.explanations.signature") && (
                <div className="text-xs text-muted-foreground leading-none mt-1">
                  {t("cash.ui.kassenbericht.explanations.signature")}
                </div>
              )}
            </div>
            <span
              className="ml-2 inline-block border-b border-black"
              style={{ width: "250px" }}
            ></span>
          </div>
        </div>
      </article>
    </div>
  );
}

export function KassenberichtScreen() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const dayKey = searchParams.get("day") ?? new Date().toISOString().slice(0, 10);
  const [isDownloading, setIsDownloading] = useState(false);
  const reportQuery = useQuery({
    queryKey: id ? ["cash-kassenbericht", id, dayKey] : ["cash-kassenbericht", "missing-id"],
    queryFn: () => cashManagementApi.getKassenbericht(id as string, dayKey),
    enabled: Boolean(id),
  });

  if (!id) {
    return null;
  }
  if (reportQuery.isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">{t("cash.ui.kassenbericht.loading")}</div>
    );
  }
  if (!reportQuery.data?.preview) {
    return (
      <div className="p-6 text-sm text-destructive">{t("cash.ui.kassenbericht.loadFailed")}</div>
    );
  }

  const downloadPdf = async () => {
    setIsDownloading(true);
    try {
      const pdf = await cashManagementApi.downloadKassenberichtPdf(id, dayKey);
      const url = URL.createObjectURL(pdf);
      const link = document.createElement("a");
      link.href = url;
      link.download = `kassenbericht-${dayKey}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-5 sm:px-5 sm:py-6 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold">{t("cash.ui.kassenbericht.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("cash.ui.kassenbericht.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={dayKey}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => {
              setSearchParams(
                (prev) => {
                  const params = new URLSearchParams(prev);
                  if (e.target.value) {
                    params.set("day", e.target.value);
                  } else {
                    params.delete("day");
                  }
                  return params;
                },
                { replace: true }
              );
            }}
            className="w-auto h-9"
          />
          <Button variant="outline" asChild>
            <Link to={`/cash/registers/${id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("cash.ui.kassenbericht.back")}
            </Link>
          </Button>
          <Button onClick={downloadPdf} disabled={isDownloading}>
            <Download className="mr-2 h-4 w-4" />
            {isDownloading
              ? t("cash.ui.kassenbericht.downloading")
              : t("cash.ui.kassenbericht.download")}
          </Button>
        </div>
      </div>
      <Card className="print:border-0 print:shadow-none">
        <CardContent className="p-0 sm:p-4 print:p-0">
          <KassenberichtPaper report={reportQuery.data.preview} />
        </CardContent>
      </Card>
    </div>
  );
}
