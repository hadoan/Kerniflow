import { Controller, Get, Inject, Query } from "@nestjs/common";
import { z } from "zod";
import { GetDashboardReportUseCase } from "../../application/use-cases/get-dashboard-report.usecase";

const DashboardQuerySchema = z.object({
  tenantId: z.string().min(1),
});

@Controller("reports")
export class ReportingController {
  constructor(
    @Inject(GetDashboardReportUseCase)
    private readonly getDashboardReport: GetDashboardReportUseCase
  ) {}

  @Get("dashboard")
  async dashboard(@Query() query: unknown) {
    const { tenantId } = DashboardQuerySchema.parse(query);
    const report = await this.getDashboardReport.execute(tenantId);
    return { ...report, message: "Reporting context - dashboard" };
  }
}
