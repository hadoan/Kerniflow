import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { ReportingController } from "./adapters/http/reporting.controller";
import { REPORTING_QUERY_PORT } from "./application/ports/reporting-query.port";
import { GetDashboardReportUseCase } from "./application/use-cases/get-dashboard-report.usecase";
import { PrismaReportingQueryAdapter } from "./infrastructure/prisma/prisma-reporting-query.adapter";

@Module({
  imports: [DataModule],
  controllers: [ReportingController],
  providers: [
    PrismaReportingQueryAdapter,
    { provide: REPORTING_QUERY_PORT, useExisting: PrismaReportingQueryAdapter },
    {
      provide: GetDashboardReportUseCase,
      useFactory: (query) => new GetDashboardReportUseCase(query),
      inject: [REPORTING_QUERY_PORT],
    },
  ],
})
export class ReportingModule {}
