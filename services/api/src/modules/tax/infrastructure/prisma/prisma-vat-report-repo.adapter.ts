import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { VatReportRepoPort } from "../../domain/ports";
import type { VatPeriodSummaryEntity } from "../../domain/entities";

@Injectable()
export class PrismaVatReportRepoAdapter extends VatReportRepoPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async upsert(
    summary: Omit<VatPeriodSummaryEntity, "id" | "createdAt" | "updatedAt">
  ): Promise<VatPeriodSummaryEntity> {
    const created = await this.prisma.vatPeriodSummary.upsert({
      where: {
        tenantId_periodStart_periodEnd: {
          tenantId: summary.tenantId,
          periodStart: summary.periodStart,
          periodEnd: summary.periodEnd,
        },
      },
      update: {
        totalsByKindJson: summary.totalsByKindJson,
        generatedAt: summary.generatedAt,
        status: summary.status,
      },
      create: {
        tenantId: summary.tenantId,
        periodStart: summary.periodStart,
        periodEnd: summary.periodEnd,
        currency: summary.currency,
        totalsByKindJson: summary.totalsByKindJson,
        generatedAt: summary.generatedAt,
        status: summary.status,
      },
    });

    return this.toDomain(created);
  }

  async findByPeriod(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<VatPeriodSummaryEntity | null> {
    const summary = await this.prisma.vatPeriodSummary.findUnique({
      where: {
        tenantId_periodStart_periodEnd: { tenantId, periodStart, periodEnd },
      },
    });

    return summary ? this.toDomain(summary) : null;
  }

  async findAll(tenantId: string, from?: Date, to?: Date): Promise<VatPeriodSummaryEntity[]> {
    const summaries = await this.prisma.vatPeriodSummary.findMany({
      where: {
        tenantId,
        ...(from ? { periodStart: { gte: from } } : {}),
        ...(to ? { periodEnd: { lte: to } } : {}),
      },
      orderBy: { periodStart: "desc" },
    });

    return summaries.map((s) => this.toDomain(s));
  }

  async finalize(id: string, tenantId: string): Promise<VatPeriodSummaryEntity> {
    const updated = await this.prisma.vatPeriodSummary.update({
      where: { id, tenantId },
      data: { status: "FINALIZED" },
    });

    return this.toDomain(updated);
  }

  private toDomain(model: any): VatPeriodSummaryEntity {
    return {
      id: model.id,
      tenantId: model.tenantId,
      periodStart: model.periodStart,
      periodEnd: model.periodEnd,
      currency: model.currency,
      totalsByKindJson: model.totalsByKindJson,
      generatedAt: model.generatedAt,
      status: model.status,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };
  }
}
