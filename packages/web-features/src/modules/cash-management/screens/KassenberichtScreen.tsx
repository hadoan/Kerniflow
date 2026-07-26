import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, Button } from "@corely/ui";
import { type CashReportPreviewDto } from "@corely/contracts";
import { cashManagementApi } from "@corely/web-shared/lib/cash-management-api";
import { formatMoney } from "@corely/web-shared/shared/lib/formatters";

type Label = { de: string; vi: string; en: string };

const copy = {
  closingCash: [
    "Kassenbestand bei Geschäftsschluss",
    "Tổng tiền mặt thực tế của quỹ khi kết thúc ngày",
    "Actual business cash at the end of the day",
  ],
  expenses: [
    "Ausgaben im Laufe des Tages",
    "Các khoản chi tiền mặt trong ngày",
    "Cash expenses during the day",
  ],
  goods: [
    "1. Wareneinkäufe und Warnebenkosten",
    "1. Mua hàng và chi phí liên quan đến hàng hóa",
    "1. Goods purchases and incidental costs",
  ],
  business: ["2. Geschäftsausgaben", "2. Chi phí kinh doanh", "2. Business expenses"],
  private: ["3. Privatentnahmen", "3. Rút tiền dùng cá nhân", "3. Private withdrawals"],
  otherOut: [
    "4. Sonstige Ausgaben (z.B. Bankeinzahlungen)",
    "4. Chi khác (ví dụ: nộp tiền vào ngân hàng)",
    "4. Other expenses (for example bank deposits)",
  ],
  total: ["Summe", "Tổng chi", "Total"],
  previous: [
    "abzüglich Kassenendbestand des Vortages",
    "trừ số tiền mặt cuối ngày hôm trước",
    "less previous day's closing cash",
  ],
  cashReceived: ["= Kasseneingang", "= Tiền mặt thu vào quỹ", "= Cash received"],
  otherIncome: [
    "abzüglich sonstige Einnahmen",
    "trừ các khoản thu khác không phải doanh thu",
    "less other non-sales cash income",
  ],
  sales: [
    "= Bareinnahmen (Tageslosung)",
    "= Doanh thu tiền mặt trong ngày",
    "= Cash sales (daily takings)",
  ],
  customers: ["Kundenzahl", "Số khách", "Customer count"],
  signature: ["Unterschrift", "Chữ ký", "Signature"],
} as const;

const label = (values: readonly [string, string, string]): Label => ({
  de: values[0],
  vi: values[1],
  en: values[2],
});

function BilingualLabel({ value }: { value: Label }) {
  const { i18n } = useTranslation();
  const language = i18n.language.startsWith("vi") ? "vi" : "en";
  return (
    <span>
      <span className="font-medium text-foreground">{value.de}</span>
      {!i18n.language.startsWith("de") ? (
        <span className="ml-2 text-xs text-muted-foreground print:text-black">
          ({value[language]})
        </span>
      ) : null}
    </span>
  );
}

function ReportRow({
  value,
  amountCents,
  emphasis = false,
}: {
  value: Label;
  amountCents: number;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[1fr_auto] gap-4 border-b border-border py-3 ${emphasis ? "font-bold" : ""}`}
    >
      <BilingualLabel value={value} />
      <span className="tabular-nums">{formatMoney(amountCents, undefined, "EUR")}</span>
    </div>
  );
}

function KassenberichtPaper({ report }: { report: CashReportPreviewDto }) {
  const otherOutflows = report.bankDepositsCents + report.otherCashOutflowsCents;
  const totalOutflows =
    report.goodsPurchasesCents +
    report.businessExpensesCents +
    report.privateWithdrawalsCents +
    otherOutflows;
  const closingCash = report.actualClosingCashCents ?? 0;
  const cashReceived = closingCash + totalOutflows - report.previousClosingCashCents;
  const otherIncome =
    report.privateDepositsCents +
    report.bankWithdrawalsToCashCents +
    report.otherNonSalesCashInflowsCents;

  return (
    <article
      className="mx-auto max-w-3xl bg-background p-5 shadow-sm print:max-w-none print:p-0 print:shadow-none"
      data-testid="kassenbericht-paper"
    >
      <header className="mb-6 border-b-2 border-foreground pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Kassenbericht</h1>
            <p className="mt-1 text-sm text-muted-foreground print:text-black">
              Tagesbericht der Barkasse · Báo cáo quỹ tiền mặt hằng ngày
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <dt className="text-muted-foreground print:text-black">Datum</dt>
            <dd className="font-semibold">{report.businessDate}</dd>
            <dt className="text-muted-foreground print:text-black">Währung</dt>
            <dd className="font-semibold">EUR</dd>
          </dl>
        </div>
        <p className="mt-3 text-sm">
          {report.business.name}
          {report.business.locationName ? ` · ${report.business.locationName}` : ""}
        </p>
      </header>

      <ReportRow value={label(copy.closingCash)} amountCents={closingCash} emphasis />
      <section className="mt-5 border border-border p-4 print:border-black">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide">
          <BilingualLabel value={label(copy.expenses)} />
        </h2>
        <ReportRow value={label(copy.goods)} amountCents={report.goodsPurchasesCents} />
        <ReportRow value={label(copy.business)} amountCents={report.businessExpensesCents} />
        <ReportRow value={label(copy.private)} amountCents={report.privateWithdrawalsCents} />
        <ReportRow value={label(copy.otherOut)} amountCents={otherOutflows} />
        <ReportRow value={label(copy.total)} amountCents={totalOutflows} emphasis />
      </section>
      <section className="mt-5">
        <ReportRow value={label(copy.previous)} amountCents={report.previousClosingCashCents} />
        <ReportRow value={label(copy.cashReceived)} amountCents={cashReceived} emphasis />
        <ReportRow value={label(copy.otherIncome)} amountCents={otherIncome} />
        <ReportRow
          value={label(copy.sales)}
          amountCents={report.calculatedCashSalesCents}
          emphasis
        />
      </section>
      <footer className="mt-12 grid grid-cols-2 gap-10 text-sm">
        <div className="border-b border-foreground pb-2">
          <BilingualLabel value={label(copy.customers)} />: {report.customerCount ?? "—"}
        </div>
        <div className="border-b border-foreground pb-2">
          <BilingualLabel value={label(copy.signature)} />
        </div>
      </footer>
    </article>
  );
}

export function KassenberichtScreen() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
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
        <div className="flex gap-2">
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
