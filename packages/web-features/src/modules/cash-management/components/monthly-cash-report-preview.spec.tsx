import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MonthlyCashReportPreview } from "./monthly-cash-report-preview";
import { type MonthlyCashReportDto } from "@corely/contracts";

describe("MonthlyCashReportPreview", () => {
  const defaultReport: MonthlyCashReportDto = {
    registerId: "reg-1",
    year: 2026,
    month: 7,
    periodStart: "2026-07-01",
    periodEnd: "2026-07-31",
    openingCashCents: 10000,
    closingCashCents: 15000,
    totals: {
      cashSalesCents: 5000,
      goodsPurchasesCents: 0,
      businessExpensesCents: 0,
      privateWithdrawalsCents: 0,
      privateDepositsCents: 0,
      bankDepositsCents: 0,
      bankWithdrawalsToCashCents: 0,
      otherCashOutflowsCents: 0,
      otherNonSalesCashInflowsCents: 0,
    },
    days: [],
    warnings: [],
    coverage: {
      status: "KNOWN",
      missingDayCount: 0,
      expectedFrom: "2026-07-01",
      expectedTo: "2026-07-31",
      evaluatedDayCount: 31,
    },
    closedDayCount: 31,
    discrepancyDayCount: 0,
    isComplete: true,
    generatedAt: new Date().toISOString(),
  };

  it("should render successfully when complete", () => {
    render(<MonthlyCashReportPreview report={defaultReport} />);
    expect(screen.getByText("Kassenabrechnung - 2026-07")).toBeInTheDocument();
    expect(screen.getByText("Vollständig")).toBeInTheDocument();
    expect(screen.getByText("Abgeschlossene Tage:")).toBeInTheDocument();
    expect(screen.getByText("31")).toBeInTheDocument();
  });

  it("should render ACTIVE_PERIOD_UNKNOWN warning and hide 'Missing days: 0'", () => {
    const reportWithUnknownCoverage: MonthlyCashReportDto = {
      ...defaultReport,
      isComplete: false,
      coverage: {
        status: "ACTIVE_PERIOD_UNKNOWN",
        missingDayCount: null,
      },
      warnings: [
        {
          code: "REGISTER_ACTIVE_PERIOD_UNKNOWN",
          severity: "warning",
          message: "Cannot determine active period",
        },
      ],
    };

    render(<MonthlyCashReportPreview report={reportWithUnknownCoverage} />);

    // Status should be incomplete
    expect(screen.getByText("Unvollständig")).toBeInTheDocument();

    // Check specific warning is rendered
    expect(screen.getByText("Cannot determine active period")).toBeInTheDocument();

    // Ensure our custom empty-state string is printed instead of numeric missing days
    expect(
      screen.getByText(/Corely cannot determine whether all required days are present/)
    ).toBeInTheDocument();

    // Ensure "Fehlende Tage:" is NOT present
    expect(screen.queryByText("Fehlende Tage:")).not.toBeInTheDocument();
  });

  it("should render print-specific classes properly", () => {
    const { container } = render(
      <MonthlyCashReportPreview
        report={{
          ...defaultReport,
          coverage: { status: "ACTIVE_PERIOD_UNKNOWN", missingDayCount: null },
        }}
      />
    );
    // Specifically verify the print:border-none print:bg-transparent exists
    const warningBox = screen.getByText(
      /Corely cannot determine whether all required days are present/
    );
    expect(warningBox.className).toContain("print:border-none");
    expect(warningBox.className).toContain("print:bg-transparent");
  });
});
