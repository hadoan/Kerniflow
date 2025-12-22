import { Module } from "@nestjs/common";
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
    ...(process.env.NODE_ENV === "test" ? [TestHarnessModule] : []),
  ],
})
export class AppModule {}
