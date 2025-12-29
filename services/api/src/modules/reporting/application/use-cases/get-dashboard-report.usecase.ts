import type { ReportingQueryPort } from "../ports/reporting-query.port";

export class GetDashboardReportUseCase {
  constructor(private readonly reportingQuery: ReportingQueryPort) {}

  async execute(tenantId: string) {
    const totalExpenses = await this.reportingQuery.countExpenses(tenantId);
    return { totalExpenses };
  }
}
