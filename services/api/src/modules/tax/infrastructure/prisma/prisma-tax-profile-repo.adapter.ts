import { Injectable } from "@nestjs/common";
import { prisma } from "@kerniflow/data";
import { TaxProfileRepoPort } from "../../domain/ports";
import type { TaxProfileEntity } from "../../domain/entities";

@Injectable()
export class PrismaTaxProfileRepoAdapter extends TaxProfileRepoPort {
  async getActive(tenantId: string, at: Date): Promise<TaxProfileEntity | null> {
    const profile = await prisma.taxProfile.findFirst({
      where: {
        tenantId,
        effectiveFrom: { lte: at },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: at } }],
      },
      orderBy: { effectiveFrom: "desc" },
    });

    return profile ? this.toDomain(profile) : null;
  }

  async upsert(
    profile: Omit<TaxProfileEntity, "id" | "createdAt" | "updatedAt">
  ): Promise<TaxProfileEntity> {
    // Check if profile exists for this tenant and effective date
    const existing = await prisma.taxProfile.findFirst({
      where: {
        tenantId: profile.tenantId,
        effectiveFrom: profile.effectiveFrom,
      },
    });

    if (existing) {
      // Update existing
      const updated = await prisma.taxProfile.update({
        where: { id: existing.id },
        data: {
          country: profile.country,
          regime: profile.regime,
          vatId: profile.vatId,
          currency: profile.currency,
          filingFrequency: profile.filingFrequency,
          effectiveTo: profile.effectiveTo,
        },
      });
      return this.toDomain(updated);
    }

    // Create new
    const created = await prisma.taxProfile.create({
      data: {
        tenantId: profile.tenantId,
        country: profile.country,
        regime: profile.regime,
        vatId: profile.vatId,
        currency: profile.currency,
        filingFrequency: profile.filingFrequency,
        effectiveFrom: profile.effectiveFrom,
        effectiveTo: profile.effectiveTo,
      },
    });

    return this.toDomain(created);
  }

  async findById(id: string, tenantId: string): Promise<TaxProfileEntity | null> {
    const profile = await prisma.taxProfile.findUnique({
      where: { id, tenantId },
    });

    return profile ? this.toDomain(profile) : null;
  }

  private toDomain(model: any): TaxProfileEntity {
    return {
      id: model.id,
      tenantId: model.tenantId,
      country: model.country,
      regime: model.regime,
      vatId: model.vatId,
      currency: model.currency,
      filingFrequency: model.filingFrequency,
      effectiveFrom: model.effectiveFrom,
      effectiveTo: model.effectiveTo,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };
  }
}
