import React from "react";
import { type CashReportPreviewDto, type CashReportWarning } from "@corely/contracts";
import { Card, CardContent } from "@corely/ui";
import i18n from "@corely/web-shared/shared/i18n";

export type CashReportPreviewProps = {
  report: CashReportPreviewDto;
};

export const CashReportPreview: React.FC<CashReportPreviewProps> = ({ report }) => {
  const formatCents = (cents: number) => {
    return new Intl.NumberFormat(i18n.language === "de" ? "de-DE" : "en-US", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100);
  };

  const getWarningColor = (severity: CashReportWarning["severity"]) => {
    switch (severity) {
      case "BLOCKING":
        return "bg-destructive/10 text-destructive border-destructive/30";
      case "WARNING":
        return "bg-warning/10 text-warning border-warning/30";
      case "INFO":
      default:
        return "bg-accent/10 text-accent border-accent/30";
    }
  };

  return (
    <Card className="border-border/60 bg-background/90 shadow-lg print:shadow-none print:border-none print:w-full max-w-2xl overflow-hidden" data-testid="cash-report-preview">
      <CardContent className="p-6 space-y-6">
        <div className="flex justify-between items-start border-b border-border/50 pb-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Kassenbericht (Preview)
            </h2>
            <div className="text-sm text-muted-foreground mt-1">
              {report.business.name}{" "}
              {report.business.locationName ? `- ${report.business.locationName}` : ""}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Datum: {report.businessDate}</div>
          </div>
          <div className="text-right">
            <div
              data-testid="cash-report-status"
              className={`px-2 py-1 rounded text-xs font-semibold ${
                report.status === "READY_TO_CLOSE"
                  ? "bg-success/10 text-success"
                  : report.status === "NEEDS_REVIEW"
                    ? "bg-warning/10 text-warning"
                    : report.status === "CLOSED"
                      ? "bg-muted text-muted-foreground"
                      : "bg-accent/10 text-accent"
              }`}
            >
              {report.status}
            </div>
          </div>
        </div>

        {report.warnings.length > 0 && (
          <div className="space-y-2 print:hidden">
            {report.warnings.map((warning, i) => (
              <div
                key={i}
                data-testid="cash-report-warning"
                className={`p-3 rounded-md border text-sm font-medium ${getWarningColor(warning.severity)}`}
              >
                {warning.message}
              </div>
            ))}
          </div>
        )}

        <div className="space-y-1 text-sm font-mono">
          {report.calculation.operands.map((op, i) => (
            <div
              key={i}
              className={`flex justify-between items-center py-1.5 ${op.operator === "RESULT" ? "border-t-2 border-foreground font-bold pt-2 mt-2" : "border-b border-border/20 last:border-0"}`}
            >
              <span>
                {op.operator === "ADD" && "+ "}
                {op.operator === "SUBTRACT" && "- "}
                {op.label}
              </span>
              <span className={op.operator === "SUBTRACT" ? "text-destructive" : ""}>
                {op.operator === "SUBTRACT" ? "-" : ""}
                {formatCents(Math.abs(op.amountCents))}
              </span>
            </div>
          ))}
        </div>

        {report.evidenceRequirements.length > 0 && (
          <div className="mt-8 pt-6 border-t border-border/50 print:hidden">
            <h3 className="text-sm font-semibold mb-3">Fehlende Belege</h3>
            <div className="space-y-2">
              {report.evidenceRequirements
                .filter((req) => !req.satisfied)
                .map((req, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center text-xs p-2 bg-muted/30 rounded border border-border/50"
                  >
                    <span>
                      {req.type} erforderlich für {req.movementType}
                    </span>
                    <span className="text-destructive font-medium">Fehlt</span>
                  </div>
                ))}
              {report.evidenceRequirements.filter((req) => !req.satisfied).length === 0 && (
                <div className="text-xs text-muted-foreground p-2">
                  Alle notwendigen Belege sind vorhanden.
                </div>
              )}
            </div>
          </div>
        )}

        <div className="pt-8 mt-8 border-t border-border/50 hidden print:block text-xs">
          <div className="flex justify-between">
            <div className="text-center w-48">
              <div className="border-b border-black h-8"></div>
              <div className="mt-1">Datum, Unterschrift</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
