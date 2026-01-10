import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { PrismaService } from "@corely/data";
import { TaxReportRepoPort } from "../../domain/ports";
import type { TaxReportEntity } from "../../domain/entities";

@Injectable()
export class PrismaTaxReportRepoAdapter extends TaxReportRepoPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listByStatus(
    tenantId: string,
    status: "upcoming" | "submitted"
  ): Promise<TaxReportEntity[]> {
    const where =
      status === "submitted"
        ? { tenantId, status: { in: ["SUBMITTED"] as any } }
        : { tenantId, status: { in: ["UPCOMING", "OPEN", "OVERDUE"] as any } };

    const rows = await this.prisma.taxReport.findMany({
      where,
      orderBy: { dueDate: "asc" },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async markSubmitted(tenantId: string, id: string, submittedAt: Date): Promise<TaxReportEntity> {
    const updated = await this.prisma.taxReport.updateMany({
      where: { id, tenantId },
      data: { status: "SUBMITTED" as any, submittedAt, updatedAt: new Date() },
    });
    if (updated.count === 0) {
      throw new Error("Report not found for tenant");
    }
    const refreshed = await this.prisma.taxReport.findUnique({ where: { id } });
    if (!refreshed) {
      throw new Error("Report not found after update");
    }
    return this.toDomain(refreshed);
  }

  async seedDefaultReports(tenantId: string): Promise<void> {
    const existing = await this.prisma.taxReport.count({ where: { tenantId } });
    if (existing > 0) {
      return;
    }

    const now = new Date();
    const year = now.getUTCFullYear();
    const quarterStart = new Date(Date.UTC(year, Math.floor(now.getUTCMonth() / 3) * 3, 1));
    const quarterEnd = new Date(
      Date.UTC(quarterStart.getUTCFullYear(), quarterStart.getUTCMonth() + 3, 0)
    );
    const due = new Date(
      Date.UTC(quarterEnd.getUTCFullYear(), quarterEnd.getUTCMonth(), quarterEnd.getUTCDate() + 10)
    );

    await this.prisma.taxReport.createMany({
      data: [
        {
          id: randomUUID(),
          tenantId,
          type: "VAT_ADVANCE",
          group: "ADVANCE_VAT",
          periodLabel: `Q${Math.floor(now.getUTCMonth() / 3) + 1} ${year}`,
          periodStart: quarterStart,
          periodEnd: quarterEnd,
          dueDate: due,
          status: "OPEN",
          amountEstimatedCents: null,
          currency: "EUR",
        },
        {
          id: randomUUID(),
          tenantId,
          type: "VAT_ANNUAL",
          group: "ANNUAL_REPORT",
          periodLabel: `${year}`,
          periodStart: new Date(Date.UTC(year, 0, 1)),
          periodEnd: new Date(Date.UTC(year, 11, 31)),
          dueDate: new Date(Date.UTC(year + 1, 1, 10)),
          status: "UPCOMING",
          amountEstimatedCents: null,
          currency: "EUR",
        },
      ],
      skipDuplicates: true,
    });
  }

  private toDomain(model: any): TaxReportEntity {
    return {
      id: model.id,
      tenantId: model.tenantId,
      type: model.type,
      group: model.group,
      periodLabel: model.periodLabel,
      periodStart: model.periodStart,
      periodEnd: model.periodEnd,
      dueDate: model.dueDate,
      status: model.status,
      amountEstimatedCents: model.amountEstimatedCents ?? null,
      amountFinalCents: model.amountFinalCents ?? null,
      currency: model.currency,
      submittedAt: model.submittedAt,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };
  }
}
