import { Module } from "@nestjs/common";
import { EnvModule } from "@kerniflow/config";
import { DataModule } from "@kerniflow/data";
import { AppController } from "./app.controller";
import { IdentityModule } from "./modules/identity";
import { ExpensesModule } from "./modules/expenses";
import { InvoicesModule } from "./modules/invoices";
import { WorkflowModule } from "./modules/workflow";
import { AutomationModule } from "./modules/automation";
import { ReportingModule } from "./modules/reporting";
import { TestHarnessModule } from "./modules/test-harness";
import { PartyCrmModule } from "./modules/party-crm";
import { DocumentsModule } from "./modules/documents";
import { TaxModule } from "./modules/tax/tax.module";
import { WorkspacesModule } from "./modules/workspaces";
import { AccountingModule } from "./modules/accounting";
import { SalesModule } from "./modules/sales";
import { PurchasingModule } from "./modules/purchasing";
import { InventoryModule } from "./modules/inventory";
import { ApprovalsModule } from "./modules/approvals";
import { EngagementModule } from "./modules/engagement/engagement.module";

@Module({
  controllers: [AppController],
  imports: [
    // Config must be first to validate env before other modules use it
    EnvModule.forRoot(),
    // DataModule must be imported for global providers (OUTBOX_PORT, AUDIT_PORT, etc.)
    DataModule,
    IdentityModule,
    PartyCrmModule,
    WorkspacesModule,
    ExpensesModule,
    InvoicesModule,
    DocumentsModule,
    TaxModule,
    AccountingModule,
    SalesModule,
    PurchasingModule,
    InventoryModule,
    ApprovalsModule,
    EngagementModule,
    WorkflowModule,
    AutomationModule,
    ReportingModule,
    // CustomizationModule,
    // AiCopilotModule,
    // Conditional imports based on env
    ...(function () {
      // We need to access EnvService here, but it's not available yet
      // Fall back to process.env for now (this is the only allowed usage)
      const isTest = process.env.NODE_ENV === "test";
      return isTest ? [TestHarnessModule] : [];
    })(),
  ],
})
export class AppModule {}
