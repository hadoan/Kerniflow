import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

const srcFile = '/Users/hadoan/Documents/GitHub/Kerniflow/services/api/src/modules/cash-management/adapters/tools/cash-management.tools.ts';
const sourceCode = fs.readFileSync(srcFile, 'utf8');

const sourceFile = ts.createSourceFile('cash-management.tools.ts', sourceCode, ts.ScriptTarget.Latest, true);

let toolsArray: ts.ArrayLiteralExpression | null = null;

function visit(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && node.name.getText() === 'buildCashManagementTools') {
    const init = node.initializer;
    if (init && ts.isArrowFunction(init) && ts.isArrayLiteralExpression(init.body)) {
      toolsArray = init.body;
    }
  }
  ts.forEachChild(node, visit);
}

visit(sourceFile);

if (!toolsArray) {
  console.error("Could not find buildCashManagementTools array");
  process.exit(1);
}

const groups: Record<string, string[]> = {
  'cash-entry.tools.ts': ['update_cash_entry', 'list_cash_entries', 'prepare_cash_entry_confirmation', 'confirm_cash_entry'],
  'cash-day-close.tools.ts': ['prepare_cash_day_confirmation', 'confirm_cash_day_draft', 'close_cash_day', 'get_today_cash_status', 'list_unclosed_days'],
  'cash-receipts.tools.ts': ['upload_receipt', 'attach_receipt_to_entry', 'find_missing_receipts'],
  'cash-reports.tools.ts': ['generate_monthly_export', 'get_dashboard_summary', 'get_cash_report_preview', 'get_monthly_cash_report', 'view_kassenbericht'],
  'cash-copilot.tools.ts': ['analyze_cash_movement', 'request_cash_clarification', 'open_cash_day_workspace', 'get_action_required'],
  'cash-help.tools.ts': ['explain_cashbook_term', 'get_workflow_help']
};

const extractedCode: Record<string, string[]> = {};
for (const file of Object.keys(groups)) {
  extractedCode[file] = [];
}

const tools = toolsArray.elements;
for (const tool of tools) {
  if (ts.isObjectLiteralExpression(tool)) {
    const nameProp = tool.properties.find(p => p.name && p.name.getText() === 'name');
    if (nameProp && ts.isPropertyAssignment(nameProp) && ts.isStringLiteral(nameProp.initializer)) {
      const toolName = nameProp.initializer.text;
      
      let targetFile = Object.keys(groups).find(file => groups[file].includes(toolName));
      if (!targetFile) {
        console.warn(`Tool ${toolName} not found in any group!`);
        continue;
      }
      
      const text = tool.getFullText(sourceFile).trim();
      extractedCode[targetFile].push(`export const ${toolName}Tool = (deps: CashToolDeps): DomainToolPort => (${text});`);
    }
  }
}

const importsCommon = `import { z } from "zod";
import { type DomainToolPort } from "../../../ai-copilot/application/ports/domain-tool.port";
import { CashEntrySource, type CashPaymentMethod, type CashEntry, type CashDayClose } from "@corely/contracts";
import { getDayCloseOrNull, listEntriesForRange, listAttachmentsByEntry } from "./cash-tools.helpers";
import { 
  type CashToolDeps, withWorkspaceContext, validationError, failure, mapToolResult, toCashToolCtx, getCtx, unwrapResult, isToolFailure, resolveRegister, assertEntryMatchesBoundRegister, buildTodayStatus, buildMonthExportStatus, toDayKey, toMonthKey,
  PrepareCashDayConfirmationInputSchema,
  ConfirmCashDayDraftInputSchema,
  CloseCashDayToolInputSchema,
  DashboardSummaryToolInputSchema,
  ListUnclosedDaysToolInputSchema,
  UpdateCashEntryToolInputSchema,
  ListCashEntriesToolInputSchema,
  PrepareCashEntryConfirmationInputSchema,
  ConfirmCashEntryInputSchema,
  UploadReceiptToolInputSchema,
  AttachReceiptToolInputSchema,
  FindMissingReceiptsToolInputSchema,
  GenerateMonthlyExportToolInputSchema,
  GetCashReportPreviewToolInputSchema,
  GetMonthlyCashReportQuerySchema,
  viewKassenberichtInputSchema,
  viewKassenberichtOutputSchema,
  CashMovementExtractionSchema,
  ActionRequiredToolInputSchema,
  ExplainCashbookTermToolInputSchema,
  WorkflowHelpToolInputSchema,
  OpenCashDayWorkspaceInputSchema,
  isSubmittedDayClose,
  requiresReceipt
} from "./cash-tools.shared";
import { cashManagementToolDescriptions } from "./cash-management.tool-copy";
import { extractLatestUserAttachments, normalizeAttachment } from "../../../../shared/adapters/tools/file-parts";
import { resolveGlossaryEntry, fuzzyResolveGlossaryEntry, glossary } from "./cash-management.glossary";
`;

for (const [file, codeChunks] of Object.entries(extractedCode)) {
  const destPath = '/Users/hadoan/Documents/GitHub/Kerniflow/services/api/src/modules/cash-management/adapters/tools/' + file;
  fs.writeFileSync(destPath, importsCommon + "\n// Add specific schemas and imports here\n\n" + codeChunks.join("\n\n"));
  console.log(`Wrote ${destPath}`);
}
