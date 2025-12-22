import { Injectable } from "@nestjs/common";
import type { UpsertTaxProfileInput } from "@kerniflow/contracts";
import type { TaxProfileEntity } from "../../domain/entities";
import { TaxProfileRepoPort } from "../../domain/ports";
import type { UseCaseContext } from "./use-case-context";

@Injectable()
export class UpsertTaxProfileUseCase {
  constructor(private readonly repo: TaxProfileRepoPort) {}

  async execute(input: UpsertTaxProfileInput, ctx: UseCaseContext): Promise<TaxProfileEntity> {
    const effectiveFrom = new Date(input.effectiveFrom);
    const effectiveTo = input.effectiveTo ? new Date(input.effectiveTo) : null;

    const profile: Omit<TaxProfileEntity, "id" | "createdAt" | "updatedAt"> = {
      tenantId: ctx.tenantId,
      country: input.country,
      regime: input.regime,
      vatId: input.vatId || null,
      currency: input.currency,
      filingFrequency: input.filingFrequency,
      effectiveFrom,
      effectiveTo,
    };

    return this.repo.upsert(profile);
  }
}
