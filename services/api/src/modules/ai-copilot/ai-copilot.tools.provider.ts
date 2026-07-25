import { type Provider } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { PromptRegistry } from "@corely/prompts";
import { PromptUsageLogger } from "../../shared/prompts/prompt-usage.logger";
import { InvoicesApplication } from "../invoices/application/invoices.application";
import { PartyApplication } from "../party/application/party.application";
import { CrmApplication } from "../crm/application/crm.application";
import { SalesApplication } from "../sales/application/sales.application";
import { PurchasingApplication } from "../purchasing/application/purchasing.application";
import { InventoryApplication } from "../inventory/application/inventory.application";
import { EngagementApplication } from "../engagement/application/engagement.application";
import { GetTeacherDashboardSummaryUseCase } from "../classes/application/use-cases/get-teacher-dashboard-summary.use-case";
import { GetTeacherDashboardUnpaidInvoicesUseCase } from "../classes/application/use-cases/get-teacher-dashboard-unpaid-invoices.use-case";
import { ListClassGroupsUseCase } from "../classes/application/use-cases/list-class-groups.usecase";
import { ListSessionsUseCase } from "../classes/application/use-cases/list-sessions.usecase";
import { GetSessionUseCase } from "../classes/application/use-cases/get-session.usecase";
import { GetSessionAttendanceUseCase } from "../classes/application/use-cases/get-session-attendance.usecase";
import { ListEnrollmentsUseCase } from "../classes/application/use-cases/list-enrollments.usecase";
import { GetClassGroupUseCase } from "../classes/application/use-cases/get-class-group.usecase";
import { UpdateSessionUseCase } from "../classes/application/use-cases/update-session.usecase";
import { BulkUpsertAttendanceUseCase } from "../classes/application/use-cases/bulk-upsert-attendance.usecase";
import { CreateExpenseUseCase } from "../expenses/application/use-cases/create-expense.usecase";
import { DocumentsApplication } from "../documents/application/documents.application";
import { ListCashRegistersQueryUseCase } from "../cash-management/application/use-cases/list-cash-registers.query";
import { GetCashRegisterQueryUseCase } from "../cash-management/application/use-cases/get-cash-register.query";
import { ListCashEntriesQueryUseCase } from "../cash-management/application/use-cases/list-cash-entries.query";
import { GetCashEntryQueryUseCase } from "../cash-management/application/use-cases/get-cash-entry.query";
import { CreateCashEntryUseCase } from "../cash-management/application/use-cases/create-cash-entry.usecase";
import { ReverseCashEntryUseCase } from "../cash-management/application/use-cases/reverse-cash-entry.usecase";
import { GetCashDayCloseQueryUseCase } from "../cash-management/application/use-cases/get-cash-day-close.query";
import { SaveCashDayCountUseCase } from "../cash-management/application/use-cases/save-cash-day-count.usecase";
import { SubmitCashDayCloseUseCase } from "../cash-management/application/use-cases/submit-cash-day-close.usecase";
import { ListCashDayClosesQueryUseCase } from "../cash-management/application/use-cases/list-cash-day-closes.query";
import { AttachBelegToCashEntryUseCase } from "../cash-management/application/use-cases/attach-beleg-to-cash-entry.usecase";
import { ListCashEntryAttachmentsQueryUseCase } from "../cash-management/application/use-cases/list-cash-entry-attachments.query";
import { ExportCashBookUseCase } from "../cash-management/application/use-cases/export-cash-book.usecase";
import { GetCashReportPreviewQueryUseCase } from "../cash-management/application/use-cases/get-cash-report-preview.query";
import { PrepareCashDayConfirmationUseCase } from "../cash-management/application/use-cases/prepare-cash-day-confirmation.usecase";
import { ConfirmCashDayDraftUseCase } from "../cash-management/application/use-cases/confirm-cash-day-draft.usecase";
import { GetMonthlyCashReportQueryUseCase } from "../cash-management/application/use-cases/get-monthly-cash-report.query";
import { CreateIncomeTaxDraftUseCase } from "../tax/application/use-cases/create-income-tax-draft.use-case";
import { GetIncomeTaxDraftUseCase } from "../tax/application/use-cases/get-income-tax-draft.use-case";
import { GenerateIncomeTaxDraftEurUseCase } from "../tax/application/use-cases/generate-income-tax-draft-eur.use-case";
import { RecomputeIncomeTaxDraftUseCase } from "../tax/application/use-cases/recompute-income-tax-draft.use-case";
import { GetIncomeTaxDraftChecklistUseCase } from "../tax/application/use-cases/get-income-tax-draft-checklist.use-case";
import { AnswerIncomeTaxDraftInterviewUseCase } from "../tax/application/use-cases/answer-income-tax-draft-interview.use-case";
import { StartIncomeTaxDraftPdfExportUseCase } from "../tax/application/use-cases/start-income-tax-draft-pdf-export.use-case";
import { PollIncomeTaxDraftPdfExportUseCase } from "../tax/application/use-cases/poll-income-tax-draft-pdf-export.use-case";
import { ConfirmIncomeTaxDraftSubmissionUseCase } from "../tax/application/use-cases/confirm-income-tax-draft-submission.use-case";
import { CoachingEngagementsApplication } from "../coaching-engagements/application/coaching-engagements.application";
import { RestaurantAiApplication } from "../restaurant/application/restaurant-ai.application";
import { CHAT_STORE_PORT, type ChatStorePort } from "./application/ports/chat-store.port";
import { COPILOT_TOOLS } from "./application/ports/tool-registry.port";
import type { DomainToolPort } from "./application/ports/domain-tool.port";

import { buildInvoiceTools } from "../invoices/adapters/tools/invoice.tools";
import { buildInvoiceWorkflowTools } from "./infrastructure/tools/invoice-workflow.tools";
import { buildCustomerTools } from "../party/adapters/tools/customer.tools";
import { buildCrmAiTools } from "../crm/adapters/tools/crm.tools";
import { buildSalesTools } from "../sales/adapters/tools/sales.tools";
import { buildPurchasingTools } from "../purchasing/adapters/tools/purchasing.tools";
import { buildInventoryTools } from "../inventory/adapters/tools/inventory.tools";
import { buildApprovalTools } from "../approvals/adapters/tools/approval.tools";
import { buildEngagementTools } from "../engagement/adapters/tools/engagement.tools";
import { buildClassesTools } from "../classes/adapters/tools/classes.tools";
import { buildExpenseTools } from "../expenses/adapters/tools/expense.tools";
import { buildCashManagementTools } from "../cash-management/adapters/tools/cash-management.tools";
import { buildTaxAnnualFilingTools } from "../tax/adapters/tools/tax-annual-filing.tools";
import { buildCoachingTools } from "../coaching-engagements/adapters/tools/coaching.tools";
import { buildRestaurantAiTools } from "../restaurant/adapters/tools/restaurant.tools";

export const copilotToolsProvider: Provider = {
  provide: COPILOT_TOOLS,
  useFactory: (
    invoices: InvoicesApplication,
    partyCrm: PartyApplication,
    crm: CrmApplication,
    sales: SalesApplication,
    purchasing: PurchasingApplication,
    inventory: InventoryApplication,
    engagement: EngagementApplication,
    classSummary: GetTeacherDashboardSummaryUseCase,
    classUnpaidInvoices: GetTeacherDashboardUnpaidInvoicesUseCase,
    listClassGroups: ListClassGroupsUseCase,
    listSessions: ListSessionsUseCase,
    getSession: GetSessionUseCase,
    getSessionAttendance: GetSessionAttendanceUseCase,
    listEnrollments: ListEnrollmentsUseCase,
    getClassGroup: GetClassGroupUseCase,
    updateSession: UpdateSessionUseCase,
    bulkUpsertAttendance: BulkUpsertAttendanceUseCase,
    createExpense: CreateExpenseUseCase,
    documentsApp: DocumentsApplication,
    listCashRegisters: ListCashRegistersQueryUseCase,
    getCashRegister: GetCashRegisterQueryUseCase,
    listCashEntries: ListCashEntriesQueryUseCase,
    getCashEntry: GetCashEntryQueryUseCase,
    createCashEntry: CreateCashEntryUseCase,
    reverseCashEntry: ReverseCashEntryUseCase,
    getCashDayClose: GetCashDayCloseQueryUseCase,
    saveCashDayCount: SaveCashDayCountUseCase,
    submitCashDayClose: SubmitCashDayCloseUseCase,
    listCashDayCloses: ListCashDayClosesQueryUseCase,
    attachCashBeleg: AttachBelegToCashEntryUseCase,
    listCashEntryAttachments: ListCashEntryAttachmentsQueryUseCase,
    exportCashBook: ExportCashBookUseCase,
    getReportPreview: GetCashReportPreviewQueryUseCase,
    prepareConfirmation: PrepareCashDayConfirmationUseCase,
    confirmDraft: ConfirmCashDayDraftUseCase,
    getMonthlyReport: GetMonthlyCashReportQueryUseCase,
    createIncomeTaxDraft: CreateIncomeTaxDraftUseCase,
    getIncomeTaxDraft: GetIncomeTaxDraftUseCase,
    generateIncomeTaxDraftEur: GenerateIncomeTaxDraftEurUseCase,
    recomputeIncomeTaxDraft: RecomputeIncomeTaxDraftUseCase,
    getIncomeTaxDraftChecklist: GetIncomeTaxDraftChecklistUseCase,
    answerIncomeTaxDraftInterview: AnswerIncomeTaxDraftInterviewUseCase,
    startIncomeTaxDraftPdfExport: StartIncomeTaxDraftPdfExportUseCase,
    pollIncomeTaxDraftPdfExport: PollIncomeTaxDraftPdfExportUseCase,
    confirmIncomeTaxDraftSubmission: ConfirmIncomeTaxDraftSubmissionUseCase,
    coaching: CoachingEngagementsApplication,
    restaurantAi: RestaurantAiApplication,
    chatStore: ChatStorePort,
    env: EnvService,
    promptRegistry: PromptRegistry,
    promptUsageLogger: PromptUsageLogger
  ) => {
    const withAppId = (appId: string, tools: DomainToolPort[]): DomainToolPort[] =>
      tools.map((tool) => ({ ...tool, appId }));

    return [
      ...withAppId("invoices", buildInvoiceWorkflowTools(invoices, partyCrm)),
      ...withAppId("invoices", buildInvoiceTools(invoices)),
      ...withAppId("parties", buildCustomerTools(partyCrm)),
      ...withAppId(
        "crm",
        buildCrmAiTools({
          party: partyCrm,
          crm,
          env,
          promptRegistry,
          promptUsageLogger,
        })
      ),
      ...withAppId("sales", buildSalesTools(sales)),
      ...withAppId(
        "purchasing",
        buildPurchasingTools(purchasing, env, promptRegistry, promptUsageLogger)
      ),
      ...withAppId(
        "inventory",
        buildInventoryTools(inventory, env, promptRegistry, promptUsageLogger)
      ),
      ...withAppId("approvals", buildApprovalTools(env, promptRegistry, promptUsageLogger)),
      ...withAppId("engagement", buildEngagementTools(engagement, partyCrm)),
      ...withAppId(
        "classes",
        buildClassesTools({
          getSummary: classSummary,
          getUnpaidInvoices: classUnpaidInvoices,
          listClassGroups,
          listSessions,
          getSession,
          getSessionAttendance,
          listEnrollments,
          getClassGroup,
          updateSession,
          bulkUpsertAttendance,
        })
      ),
      ...withAppId("expenses", buildExpenseTools(createExpense, documentsApp)),
      ...withAppId(
        "cash-management",
        buildCashManagementTools({
          listRegisters: listCashRegisters,
          getRegister: getCashRegister,
          listEntries: listCashEntries,
          getEntry: getCashEntry,
          createEntry: createCashEntry,
          reverseEntry: reverseCashEntry,
          getDayClose: getCashDayClose,
          saveDayCount: saveCashDayCount,
          submitDayClose: submitCashDayClose,
          listDayCloses: listCashDayCloses,
          attachBeleg: attachCashBeleg,
          listAttachments: listCashEntryAttachments,
          exportCashBook,
          getReportPreview,
          prepareConfirmation,
          confirmDraft,
          getMonthlyReport,
          documentsApp,
        })
      ),
      ...withAppId(
        "tax",
        buildTaxAnnualFilingTools({
          createDraft: createIncomeTaxDraft,
          getDraft: getIncomeTaxDraft,
          generateEur: generateIncomeTaxDraftEur,
          recomputeDraft: recomputeIncomeTaxDraft,
          getChecklist: getIncomeTaxDraftChecklist,
          answerInterview: answerIncomeTaxDraftInterview,
          startPdfExport: startIncomeTaxDraftPdfExport,
          pollExport: pollIncomeTaxDraftPdfExport,
          confirmSubmission: confirmIncomeTaxDraftSubmission,
          chatStore,
        })
      ),
      ...withAppId("coaching-engagements", buildCoachingTools(coaching)),
      ...withAppId("restaurant", buildRestaurantAiTools(restaurantAi)),
    ];
  },
  inject: [
    InvoicesApplication,
    PartyApplication,
    CrmApplication,
    SalesApplication,
    PurchasingApplication,
    InventoryApplication,
    EngagementApplication,
    GetTeacherDashboardSummaryUseCase,
    GetTeacherDashboardUnpaidInvoicesUseCase,
    ListClassGroupsUseCase,
    ListSessionsUseCase,
    GetSessionUseCase,
    GetSessionAttendanceUseCase,
    ListEnrollmentsUseCase,
    GetClassGroupUseCase,
    UpdateSessionUseCase,
    BulkUpsertAttendanceUseCase,
    CreateExpenseUseCase,
    DocumentsApplication,
    ListCashRegistersQueryUseCase,
    GetCashRegisterQueryUseCase,
    ListCashEntriesQueryUseCase,
    GetCashEntryQueryUseCase,
    CreateCashEntryUseCase,
    ReverseCashEntryUseCase,
    GetCashDayCloseQueryUseCase,
    SaveCashDayCountUseCase,
    SubmitCashDayCloseUseCase,
    ListCashDayClosesQueryUseCase,
    AttachBelegToCashEntryUseCase,
    ListCashEntryAttachmentsQueryUseCase,
    ExportCashBookUseCase,
    GetCashReportPreviewQueryUseCase,
    PrepareCashDayConfirmationUseCase,
    ConfirmCashDayDraftUseCase,
    GetMonthlyCashReportQueryUseCase,
    CreateIncomeTaxDraftUseCase,
    GetIncomeTaxDraftUseCase,
    GenerateIncomeTaxDraftEurUseCase,
    RecomputeIncomeTaxDraftUseCase,
    GetIncomeTaxDraftChecklistUseCase,
    AnswerIncomeTaxDraftInterviewUseCase,
    StartIncomeTaxDraftPdfExportUseCase,
    PollIncomeTaxDraftPdfExportUseCase,
    ConfirmIncomeTaxDraftSubmissionUseCase,
    CoachingEngagementsApplication,
    RestaurantAiApplication,
    CHAT_STORE_PORT,
    EnvService,
    PromptRegistry,
    PromptUsageLogger,
  ],
};
