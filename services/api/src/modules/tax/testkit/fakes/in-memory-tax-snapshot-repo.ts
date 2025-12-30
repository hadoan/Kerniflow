import type { TaxSourceType } from "@corely/contracts";
import { TaxSnapshotRepoPort } from "../../domain/ports";
import type { TaxSnapshotEntity } from "../../domain/entities";

export class InMemoryTaxSnapshotRepo extends TaxSnapshotRepoPort {
  private snapshots: TaxSnapshotEntity[] = [];

  async lockSnapshot(
    snapshot: Omit<TaxSnapshotEntity, "id" | "version" | "createdAt" | "updatedAt">
  ): Promise<TaxSnapshotEntity> {
    // Check if already exists (idempotency)
    const existing = await this.findBySource(
      snapshot.tenantId,
      snapshot.sourceType,
      snapshot.sourceId
    );

    if (existing) {
      return existing;
    }

    const entity: TaxSnapshotEntity = {
      ...snapshot,
      id: `snapshot-${this.snapshots.length + 1}`,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.snapshots.push(entity);
    return entity;
  }

  async findBySource(
    tenantId: string,
    sourceType: TaxSourceType,
    sourceId: string
  ): Promise<TaxSnapshotEntity | null> {
    return (
      this.snapshots.find(
        (s) => s.tenantId === tenantId && s.sourceType === sourceType && s.sourceId === sourceId
      ) || null
    );
  }

  async findByPeriod(
    tenantId: string,
    start: Date,
    end: Date,
    sourceType?: TaxSourceType
  ): Promise<TaxSnapshotEntity[]> {
    return this.snapshots.filter(
      (s) =>
        s.tenantId === tenantId &&
        s.calculatedAt >= start &&
        s.calculatedAt <= end &&
        (!sourceType || s.sourceType === sourceType)
    );
  }

  // Test helper
  reset(): void {
    this.snapshots = [];
  }
}
