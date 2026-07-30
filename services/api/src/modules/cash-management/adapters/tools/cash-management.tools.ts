export * from "./cash-tools.shared";
import { type DomainToolPort } from "../../../ai-copilot/application/ports/domain-tool.port";
import { type CashToolDeps } from "./cash-tools.shared";

import {
  update_cash_entryTool,
  list_cash_entriesTool,
  prepare_cash_entry_confirmationTool,
  confirm_cash_entryTool,
} from "./cash-entry.tools";

import {
  prepare_cash_day_confirmationTool,
  confirm_cash_day_draftTool,
  close_cash_dayTool,
  get_today_cash_statusTool,
  list_unclosed_daysTool,
} from "./cash-day-close.tools";

import {
  upload_receiptTool,
  attach_receipt_to_entryTool,
  find_missing_receiptsTool,
} from "./cash-receipts.tools";

import {
  generate_monthly_exportTool,
  get_dashboard_summaryTool,
  get_cash_report_previewTool,
  get_monthly_cash_reportTool,
  view_kassenberichtTool,
} from "./cash-reports.tools";

import {
  request_cash_clarificationTool,
  analyze_cash_movementTool,
  open_cash_day_workspaceTool,
  get_action_requiredTool,
} from "./cash-copilot.tools";

import { explain_cashbook_termTool, get_workflow_helpTool } from "./cash-help.tools";

export const buildCashManagementTools = (deps: CashToolDeps): DomainToolPort[] => [
  update_cash_entryTool(deps),
  list_cash_entriesTool(deps),
  prepare_cash_entry_confirmationTool(deps),
  confirm_cash_entryTool(deps),
  prepare_cash_day_confirmationTool(deps),
  confirm_cash_day_draftTool(deps),
  close_cash_dayTool(deps),
  get_today_cash_statusTool(deps),
  list_unclosed_daysTool(deps),
  upload_receiptTool(deps),
  attach_receipt_to_entryTool(deps),
  find_missing_receiptsTool(deps),
  generate_monthly_exportTool(deps),
  get_dashboard_summaryTool(deps),
  get_cash_report_previewTool(deps),
  get_monthly_cash_reportTool(deps),
  view_kassenberichtTool(deps),
  request_cash_clarificationTool(deps),
  analyze_cash_movementTool(deps),
  open_cash_day_workspaceTool(deps),
  get_action_requiredTool(deps),
  explain_cashbook_termTool(deps),
  get_workflow_helpTool(deps),
];
