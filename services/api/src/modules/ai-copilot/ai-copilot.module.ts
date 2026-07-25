import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { CopilotController } from "./adapters/http/copilot.controller";
import { EnvService } from "@corely/config";

import { StreamCopilotChatUseCase } from "./application/use-cases/stream-copilot-chat.usecase";
import { PrismaAgentRunRepository } from "./infrastructure/adapters/prisma-agent-run-repository.adapter";
import { PrismaMessageRepository } from "./infrastructure/adapters/prisma-message-repository.adapter";
import { PrismaChatStoreAdapter } from "./infrastructure/adapters/prisma-chat-store.adapter";
import { PrismaToolExecutionRepository } from "./infrastructure/adapters/prisma-tool-execution-repository.adapter";
import { PrismaThreadHistoryRepository } from "./infrastructure/adapters/prisma-thread-history-repository.adapter";
import { ToolRegistry } from "./infrastructure/tools/tool-registry";
import { AiSdkModelAdapter } from "./infrastructure/model/ai-sdk.model-adapter";
import { PrismaAuditAdapter } from "./infrastructure/audit/prisma.audit.adapter";
import { PrismaCopilotIdempotencyAdapter } from "./infrastructure/idempotency/prisma-idempotency-copilot.adapter";
import { TenantGuard } from "./adapters/http/guards/tenant.guard";
import { COPILOT_TOOLS } from "./application/ports/tool-registry.port";
import { AuditPort } from "./application/ports/audit.port";
import { OUTBOX_PORT } from "@corely/kernel";
import type { OutboxPort } from "@corely/kernel";
import { ClockPort } from "@corely/kernel/ports/clock.port";
import { IdentityModule } from "../identity/identity.module";
import { NestLoggerAdapter } from "../../shared/adapters/logger/nest-logger.adapter";
import { IdempotencyService } from "../../shared/infrastructure/idempotency/idempotency.service";
import { InvoicesModule } from "../invoices/invoices.module";
import { InvoicesApplication } from "../invoices/application/invoices.application";
import { buildInvoiceTools } from "../invoices/adapters/tools/invoice.tools";
import { buildInvoiceWorkflowTools } from "./infrastructure/tools/invoice-workflow.tools";
import { PartyModule } from "../party";
import { PartyApplication } from "../party/application/party.application";
import { buildCustomerTools } from "../party/adapters/tools/customer.tools";
import { CrmModule } from "../crm/crm.module";
import { CrmApplication } from "../crm/application/crm.application";
import { buildCrmAiTools } from "../crm/adapters/tools/crm.tools";
import { SalesModule } from "../sales";
import { SalesApplication } from "../sales/application/sales.application";
import { buildSalesTools } from "../sales/adapters/tools/sales.tools";
import { PurchasingModule } from "../purchasing";
import { PurchasingApplication } from "../purchasing/application/purchasing.application";
import { buildPurchasingTools } from "../purchasing/adapters/tools/purchasing.tools";
import { InventoryModule } from "../inventory";
import { InventoryApplication } from "../inventory/application/inventory.application";
import { buildInventoryTools } from "../inventory/adapters/tools/inventory.tools";
import { buildApprovalTools } from "../approvals/adapters/tools/approval.tools";
import { EngagementModule } from "../engagement/engagement.module";
import { EngagementApplication } from "../engagement/application/engagement.application";
import { buildEngagementTools } from "../engagement/adapters/tools/engagement.tools";
import { ClassesModule } from "../classes/classes.module";
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
import { buildClassesTools } from "../classes/adapters/tools/classes.tools";
import { OtelObservabilityAdapter } from "../../shared/observability/otel-observability.adapter";
import { type ObservabilityPort } from "@corely/kernel";
import { CreateRunUseCase } from "./application/use-cases/create-run.usecase";
import { GetRunUseCase } from "./application/use-cases/get-run.usecase";
import { ListMessagesUseCase } from "./application/use-cases/list-messages.usecase";
import { ListCopilotThreadsUseCase } from "./application/use-cases/list-copilot-threads.usecase";
import { GetCopilotThreadUseCase } from "./application/use-cases/get-copilot-thread.usecase";
import { ListCopilotThreadMessagesUseCase } from "./application/use-cases/list-copilot-thread-messages.usecase";
import { SearchCopilotMessagesUseCase } from "./application/use-cases/search-copilot-messages.usecase";
import { CreateCopilotThreadUseCase } from "./application/use-cases/create-copilot-thread.usecase";
import { PromptModule } from "../../shared/prompts/prompt.module";
import { PromptRegistry } from "@corely/prompts";
import { PromptUsageLogger } from "../../shared/prompts/prompt-usage.logger";
import { CHAT_STORE_PORT, type ChatStorePort } from "./application/ports/chat-store.port";
import {
  THREAD_HISTORY_REPOSITORY_PORT,
  type ThreadHistoryRepositoryPort,
} from "./application/ports/thread-history-repository.port";
import { CopilotContextBuilder } from "./application/services/copilot-context.builder";
import { CopilotTaskStateTracker } from "./application/services/copilot-task-state.service";
import type { DomainToolPort } from "./application/ports/domain-tool.port";
import { PlatformEntitlementsModule } from "../platform-entitlements/platform-entitlements.module";
import { ExpensesModule } from "../expenses";
import { CreateExpenseUseCase } from "../expenses/application/use-cases/create-expense.usecase";
import { buildExpenseTools } from "../expenses/adapters/tools/expense.tools";
import { DocumentsModule } from "../documents";
import { DocumentsApplication } from "../documents/application/documents.application";
import { TaxModule } from "../tax/tax.module";
import { CreateIncomeTaxDraftUseCase } from "../tax/application/use-cases/create-income-tax-draft.use-case";
import { GetIncomeTaxDraftUseCase } from "../tax/application/use-cases/get-income-tax-draft.use-case";
import { GenerateIncomeTaxDraftEurUseCase } from "../tax/application/use-cases/generate-income-tax-draft-eur.use-case";
import { RecomputeIncomeTaxDraftUseCase } from "../tax/application/use-cases/recompute-income-tax-draft.use-case";
import { GetIncomeTaxDraftChecklistUseCase } from "../tax/application/use-cases/get-income-tax-draft-checklist.use-case";
import { AnswerIncomeTaxDraftInterviewUseCase } from "../tax/application/use-cases/answer-income-tax-draft-interview.use-case";
import { StartIncomeTaxDraftPdfExportUseCase } from "../tax/application/use-cases/start-income-tax-draft-pdf-export.use-case";
import { PollIncomeTaxDraftPdfExportUseCase } from "../tax/application/use-cases/poll-income-tax-draft-pdf-export.use-case";
import { ConfirmIncomeTaxDraftSubmissionUseCase } from "../tax/application/use-cases/confirm-income-tax-draft-submission.use-case";
import { buildTaxAnnualFilingTools } from "../tax/adapters/tools/tax-annual-filing.tools";
import { CashManagementModule } from "../cash-management/cash-management.module";
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
import { buildCashManagementTools } from "../cash-management/adapters/tools/cash-management.tools";
import { BillingModule } from "../billing/billing.module";
import { CoachingEngagementsModule } from "../coaching-engagements";
import { CoachingEngagementsApplication } from "../coaching-engagements/application/coaching-engagements.application";
import { buildCoachingTools } from "../coaching-engagements/adapters/tools/coaching.tools";
import { RestaurantModule } from "../restaurant/restaurant.module";
import { RestaurantAiApplication } from "../restaurant/application/restaurant-ai.application";
import { buildRestaurantAiTools } from "../restaurant/adapters/tools/restaurant.tools";
import { PlatformModule } from "../platform/platform.module";

@Module({
  imports: [
    DataModule,
    IdentityModule,
    InvoicesModule,
    PartyModule,
    CrmModule,
    SalesModule,
    PurchasingModule,
    InventoryModule,
    EngagementModule,
    ClassesModule,
    ExpensesModule,
    DocumentsModule,
    CashManagementModule,
    BillingModule,
    CoachingEngagementsModule,
    RestaurantModule,
    TaxModule,
    PlatformEntitlementsModule,
    PlatformModule,
    PromptModule,
  ],
  controllers: [CopilotController],
  providers: [
    PrismaAgentRunRepository,
    PrismaMessageRepository,
    PrismaChatStoreAdapter,
    PrismaToolExecutionRepository,
    PrismaThreadHistoryRepository,
    ToolRegistry,
    PrismaAuditAdapter,
    IdempotencyService,
    PrismaCopilotIdempotencyAdapter,
    TenantGuard,
    { provide: "COPILOT_LOGGER", useClass: NestLoggerAdapter },
    {
      provide: AiSdkModelAdapter,
      useFactory: (
        toolExec: PrismaToolExecutionRepository,
        audit: PrismaAuditAdapter,
        outbox: OutboxPort,
        env: EnvService,
        logger: NestLoggerAdapter,
        observability: ObservabilityPort,
        promptRegistry: PromptRegistry,
        promptUsageLogger: PromptUsageLogger
      ) => {
        logger.debug("Creating AiSdkModelAdapter");
        return new AiSdkModelAdapter(
          toolExec,
          audit,
          outbox,
          env,
          observability,
          promptRegistry,
          promptUsageLogger
        );
      },
      inject: [
        PrismaToolExecutionRepository,
        PrismaAuditAdapter,
        OUTBOX_PORT,
        EnvService,
        "COPILOT_LOGGER",
        "OBSERVABILITY_PORT",
        PromptRegistry,
        PromptUsageLogger,
      ],
    },
    {
      provide: "COPILOT_CLOCK",
      useValue: { now: () => new Date() },
    },
    {
      provide: CreateRunUseCase,
      useFactory: (runs: PrismaAgentRunRepository) => new CreateRunUseCase(runs),
      inject: [PrismaAgentRunRepository],
    },
    {
      provide: GetRunUseCase,
      useFactory: (runs: PrismaAgentRunRepository) => new GetRunUseCase(runs),
      inject: [PrismaAgentRunRepository],
    },
    {
      provide: ListMessagesUseCase,
      useFactory: (messages: PrismaMessageRepository) => new ListMessagesUseCase(messages),
      inject: [PrismaMessageRepository],
    },
    {
      provide: CHAT_STORE_PORT,
      useClass: PrismaChatStoreAdapter,
    },
    {
      provide: THREAD_HISTORY_REPOSITORY_PORT,
      useClass: PrismaThreadHistoryRepository,
    },
    {
      provide: ListCopilotThreadsUseCase,
      useFactory: (threads: ThreadHistoryRepositoryPort) => new ListCopilotThreadsUseCase(threads),
      inject: [THREAD_HISTORY_REPOSITORY_PORT],
    },
    {
      provide: GetCopilotThreadUseCase,
      useFactory: (threads: ThreadHistoryRepositoryPort) => new GetCopilotThreadUseCase(threads),
      inject: [THREAD_HISTORY_REPOSITORY_PORT],
    },
    {
      provide: ListCopilotThreadMessagesUseCase,
      useFactory: (threads: ThreadHistoryRepositoryPort) =>
        new ListCopilotThreadMessagesUseCase(threads),
      inject: [THREAD_HISTORY_REPOSITORY_PORT],
    },
    {
      provide: SearchCopilotMessagesUseCase,
      useFactory: (threads: ThreadHistoryRepositoryPort) =>
        new SearchCopilotMessagesUseCase(threads),
      inject: [THREAD_HISTORY_REPOSITORY_PORT],
    },
    {
      provide: CreateCopilotThreadUseCase,
      useFactory: (threads: ThreadHistoryRepositoryPort, clock: ClockPort) =>
        new CreateCopilotThreadUseCase(threads, clock),
      inject: [THREAD_HISTORY_REPOSITORY_PORT, "COPILOT_CLOCK"],
    },
    CopilotContextBuilder,
    CopilotTaskStateTracker,
    {
      provide: "OBSERVABILITY_PORT",
      useFactory: (env: EnvService) =>
        new OtelObservabilityAdapter({ maskingMode: env.OBSERVABILITY_MASKING_MODE }),
      inject: [EnvService],
    },
    {
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
    },
    {
      provide: StreamCopilotChatUseCase,
      useFactory: (
        runs: PrismaAgentRunRepository,
        chatStore: ChatStorePort,
        toolExec: PrismaToolExecutionRepository,
        tools: ToolRegistry,
        model: AiSdkModelAdapter,
        audit: PrismaAuditAdapter,
        outbox: OutboxPort,
        idem: PrismaCopilotIdempotencyAdapter,
        clock: ClockPort,
        logger: NestLoggerAdapter,
        observability: ObservabilityPort,
        contextBuilder: CopilotContextBuilder,
        taskTracker: CopilotTaskStateTracker
      ) => {
        logger.debug("Creating StreamCopilotChatUseCase");
        return new StreamCopilotChatUseCase(
          runs,
          chatStore,
          toolExec,
          tools,
          model,
          audit as AuditPort,
          outbox as OutboxPort,
          idem,
          clock,
          observability,
          contextBuilder,
          taskTracker
        );
      },
      inject: [
        PrismaAgentRunRepository,
        CHAT_STORE_PORT,
        PrismaToolExecutionRepository,
        ToolRegistry,
        AiSdkModelAdapter,
        PrismaAuditAdapter,
        OUTBOX_PORT,
        PrismaCopilotIdempotencyAdapter,
        "COPILOT_CLOCK",
        "COPILOT_LOGGER",
        "OBSERVABILITY_PORT",
        CopilotContextBuilder,
        CopilotTaskStateTracker,
      ],
    },
  ],
  exports: [],
})
export class AiCopilotModule {}
