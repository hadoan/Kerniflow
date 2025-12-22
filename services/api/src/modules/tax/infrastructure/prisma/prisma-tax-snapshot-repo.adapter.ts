import { Injectable } from "@nestjs/common";
import { prisma } from "@kerniflow/data";
import type { TaxSourceType } from "@kerniflow/contracts";
import { TaxSnapshotRepoPort } from "../../domain/ports";
import type { TaxSnapshotEntity } from "../../domain/entities";

@Injectable()
export class PrismaTaxSnapshotRepoAdapter extends TaxSnapshotRepoPort {
  /**
   * Lock snapshot - idempotent by (tenantId, sourceType, sourceId)
   */
  async lockSnapshot(
    snapshot: Omit<TaxSnapshotEntity, "id" | "version" | "createdAt" | "updatedAt">
  ): Promise<TaxSnapshotEntity> {
    // Use upsert to ensure idempotency
    const created = await prisma.taxSnapshot.upsert({
      where: {
        tenantId_sourceType_sourceId: {
          tenantId: snapshot.tenantId,
          sourceType: snapshot.sourceType,
          sourceId: snapshot.sourceId,
        },
      },
      update: {}, // Don't update if exists (immutable)
      create: {
        tenantId: snapshot.tenantId,
        sourceType: snapshot.sourceType,
        sourceId: snapshot.sourceId,
        jurisdiction: snapshot.jurisdiction,
        regime: snapshot.regime,
        roundingMode: snapshot.roundingMode,
        currency: snapshot.currency,
        calculatedAt: snapshot.calculatedAt,
        subtotalAmountCents: snapshot.subtotalAmountCents,
        taxTotalAmountCents: snapshot.taxTotalAmountCents,
        totalAmountCents: snapshot.totalAmountCents,
        breakdownJson: snapshot.breakdownJson,
      },
    });

    return this.toDomain(created);
  }

  async findBySource(
    tenantId: string,
    sourceType: TaxSourceType,
    sourceId: string
  ): Promise<TaxSnapshotEntity | null> {
    const snapshot = await prisma.taxSnapshot.findUnique({
      where: {
        tenantId_sourceType_sourceId: { tenantId, sourceType, sourceId },
      },
    });

    return snapshot ? this.toDomain(snapshot) : null;
  }

  async findByPeriod(
    tenantId: string,
    start: Date,
    end: Date,
    sourceType?: TaxSourceType
  ): Promise<TaxSnapshotEntity[]> {
    const snapshots = await prisma.taxSnapshot.findMany({
      where: {
        tenantId,
        calculatedAt: { gte: start, lte: end },
        ...(sourceType ? { sourceType } : {}),
      },
      orderBy: { calculatedAt: "asc" },
    });

    return snapshots.map((s) => this.toDomain(s));
  }

  private toDomain(model: any): TaxSnapshotEntity {
    return {
      id: model.id,
      tenantId: model.tenantId,
      sourceType: model.sourceType,
      sourceId: model.sourceId,
      jurisdiction: model.jurisdiction,
      regime: model.regime,
      roundingMode: model.roundingMode,
      currency: model.currency,
      calculatedAt: model.calculatedAt,
      subtotalAmountCents: model.subtotalAmountCents,
      taxTotalAmountCents: model.taxTotalAmountCents,
      totalAmountCents: model.totalAmountCents,
      breakdownJson: model.breakdownJson,
      version: model.version,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };
  }
}
