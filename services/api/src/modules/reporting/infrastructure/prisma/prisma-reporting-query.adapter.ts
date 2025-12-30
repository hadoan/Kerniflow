import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { ReportingQueryPort } from "../../application/ports/reporting-query.port";

@Injectable()
export class PrismaReportingQueryAdapter implements ReportingQueryPort {
  constructor(private readonly prisma: PrismaService) {}

  async countExpenses(tenantId: string): Promise<number> {
    return this.prisma.expense.count({ where: { tenantId } });
  }
}
