import { TaxProfileRepoPort } from "../../domain/ports";
import type { TaxProfileEntity } from "../../domain/entities";
import { TaxProfile } from "../../domain/entities";

export class InMemoryTaxProfileRepo extends TaxProfileRepoPort {
  private profiles: TaxProfileEntity[] = [];

  async getActive(tenantId: string, at: Date): Promise<TaxProfileEntity | null> {
    const active = this.profiles.filter(
      (p) => p.tenantId === tenantId && TaxProfile.canCalculate(p, at)
    );

    // Return most recent effective profile
    active.sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime());
    return active[0] || null;
  }

  async upsert(
    profile: Omit<TaxProfileEntity, "id" | "createdAt" | "updatedAt">
  ): Promise<TaxProfileEntity> {
    const existing = this.profiles.find(
      (p) =>
        p.tenantId === profile.tenantId &&
        p.effectiveFrom.getTime() === profile.effectiveFrom.getTime()
    );

    if (existing) {
      Object.assign(existing, profile, { updatedAt: new Date() });
      return existing;
    }

    const entity: TaxProfileEntity = {
      ...profile,
      id: `profile-${this.profiles.length + 1}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.profiles.push(entity);
    return entity;
  }

  async findById(id: string, tenantId: string): Promise<TaxProfileEntity | null> {
    return this.profiles.find((p) => p.id === id && p.tenantId === tenantId) || null;
  }

  // Test helper
  reset(): void {
    this.profiles = [];
  }
}
