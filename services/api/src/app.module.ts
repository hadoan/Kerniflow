import { Module } from "@nestjs/common";
import { EnvModule, EnvService } from "@kerniflow/config";
import { AppController } from "./app.controller";
import { IdentityModule } from "./modules/identity";
import { ExpensesModule } from "./modules/expenses";
import { InvoicesModule } from "./modules/invoices";
import { WorkflowModule } from "./modules/workflow";
import { AutomationModule } from "./modules/automation";
import { ReportingModule } from "./modules/reporting";
import { TestHarnessModule } from "./modules/test-harness";
import { AiCopilotModule } from "./modules/ai-copilot/ai-copilot.module";
import { CustomizationModule } from "./modules/customization/customization.module";
import { PartyCrmModule } from "./modules/party-crm";
import { DocumentsModule } from "./modules/documents";
import { TaxModule } from "./modules/tax/tax.module";

@Module({
  controllers: [AppController],
  imports: [
    // Config must be first to validate env before other modules use it
    EnvModule.forRoot(),
    IdentityModule,
    PartyCrmModule,
    ExpensesModule,
    InvoicesModule,
    DocumentsModule,
    TaxModule,
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
