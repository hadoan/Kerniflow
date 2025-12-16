import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { IdentityModule } from "./modules/identity";
import { PartiesModule } from "./modules/parties";
import { ExpensesModule } from "./modules/expenses";
import { InvoicesModule } from "./modules/invoices";
import { WorkflowModule } from "./modules/workflow";
import { AutomationModule } from "./modules/automation";
import { ReportingModule } from "./modules/reporting";

@Module({
  controllers: [AppController],
  imports: [
    IdentityModule,
    PartiesModule,
    ExpensesModule,
    InvoicesModule,
    WorkflowModule,
    AutomationModule,
    ReportingModule,
  ],
})
export class AppModule {}
