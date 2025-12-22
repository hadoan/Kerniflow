import { Injectable } from "@nestjs/common";
import { prisma } from "@kerniflow/data";
import { TaxRateRepoPort } from "../../domain/ports";
import type { TaxRateEntity } from "../../domain/entities";

@Injectable()
export class PrismaTaxRateRepoAdapter extends TaxRateRepoPort {
  async create(
    rate: Omit<TaxRateEntity, "id" | "createdAt" | "updatedAt">
  ): Promise<TaxRateEntity> {
    const created = await prisma.taxRate.create({
      data: {
        tenantId: rate.tenantId,
        taxCodeId: rate.taxCodeId,
        rateBps: rate.rateBps,
        effectiveFrom: rate.effectiveFrom,
        effectiveTo: rate.effectiveTo,
      },
    });

    return this.toDomain(created);
  }

  async findEffectiveRate(
    taxCodeId: string,
    tenantId: string,
    at: Date
  ): Promise<TaxRateEntity | null> {
    const rate = await prisma.taxRate.findFirst({
      where: {
        tenantId,
        taxCodeId,
        effectiveFrom: { lte: at },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: at } }],
      },
      orderBy: { effectiveFrom: "desc" },
    });

    return rate ? this.toDomain(rate) : null;
  }

  async findByTaxCode(taxCodeId: string, tenantId: string): Promise<TaxRateEntity[]> {
    const rates = await prisma.taxRate.findMany({
      where: { tenantId, taxCodeId },
      orderBy: { effectiveFrom: "desc" },
    });

    return rates.map((r) => this.toDomain(r));
  }

  async update(
    id: string,
    tenantId: string,
    updates: Partial<Pick<TaxRateEntity, "rateBps" | "effectiveTo">>
  ): Promise<TaxRateEntity> {
    const updated = await prisma.taxRate.update({
      where: { id, tenantId },
      data: updates,
    });

    return this.toDomain(updated);
  }

  private toDomain(model: any): TaxRateEntity {
    return {
      id: model.id,
      tenantId: model.tenantId,
      taxCodeId: model.taxCodeId,
      rateBps: model.rateBps,
      effectiveFrom: model.effectiveFrom,
      effectiveTo: model.effectiveTo,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };
  }
}
