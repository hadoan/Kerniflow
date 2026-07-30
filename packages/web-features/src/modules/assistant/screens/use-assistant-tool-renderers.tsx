import React from "react";
import { useTranslation } from "react-i18next";
import { type CashReportPreviewDto, type MonthlyCashReportDto } from "@corely/contracts";
import { CashReportPreview } from "../../cash-management/components/cash-report-preview";
import { MonthlyCashReportPreview } from "../../cash-management/components/monthly-cash-report-preview";
import { CashClarificationRenderer } from "../components/CashClarificationRenderer";
import { CashDayConfirmationRenderer } from "../components/CashDayConfirmationRenderer";
import { CashDayConfirmationResultRenderer } from "../components/CashDayConfirmationResultRenderer";
import { CashEntryConfirmationRenderer } from "../components/CashEntryConfirmationRenderer";
import { CashEntryConfirmationResultRenderer } from "../components/CashEntryConfirmationResultRenderer";
import { OpenCashDayWorkspaceRenderer } from "../components/OpenCashDayWorkspaceRenderer";
import { ViewKassenberichtRenderer } from "../../cash-management/components/assistant/ViewKassenberichtRenderer";
import { AnalyzeCashMovementRenderer } from "../components/AnalyzeCashMovementRenderer";

export const useAssistantToolRenderers = () => {
  const { t } = useTranslation();

  return {
    get_cash_report_preview: (props: any) => {
      if (!props.output || typeof props.output !== "object" || !("business" in props.output)) {
        return (
          <div className="p-4 border rounded bg-muted/30">
            {t("assistant.loadingPreview", "Loading preview...")}
          </div>
        );
      }
      return <CashReportPreview report={props.output as CashReportPreviewDto} />;
    },
    get_monthly_cash_report: (props: any) => {
      if (!props.output || typeof props.output !== "object" || !("totals" in props.output)) {
        return (
          <div className="p-4 border rounded bg-muted/30">
            {t("assistant.loadingMonthlyReport", "Loading monthly report...")}
          </div>
        );
      }
      return <MonthlyCashReportPreview report={props.output as MonthlyCashReportDto} />;
    },
    request_cash_clarification: (props: any) => <CashClarificationRenderer {...props} />,
    prepare_cash_day_confirmation: (props: any) => <CashDayConfirmationRenderer {...props} />,
    confirm_cash_day_draft: (props: any) => <CashDayConfirmationResultRenderer {...props} />,
    view_kassenbericht: (props: any) => <ViewKassenberichtRenderer {...props} />,
    prepare_cash_entry_confirmation: (props: any) => <CashEntryConfirmationRenderer {...props} />,
    confirm_cash_entry: (props: any) => <CashEntryConfirmationResultRenderer {...props} />,
    open_cash_day_workspace: (props: any) => <OpenCashDayWorkspaceRenderer {...props} />,
    analyze_cash_movement: (props: any) => <AnalyzeCashMovementRenderer {...props} />,
  };
};
