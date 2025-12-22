import { Injectable } from "@nestjs/common";
import type { CreateTaxCodeInput } from "@kerniflow/contracts";
import type { TaxCodeEntity } from "../../domain/entities";
import { TaxCodeRepoPort } from "../../domain/ports";
import type { UseCaseContext } from "./use-case-context";

@Injectable()
export class CreateTaxCodeUseCase {
  constructor(private readonly repo: TaxCodeRepoPort) {}

  async execute(input: CreateTaxCodeInput, ctx: UseCaseContext): Promise<TaxCodeEntity> {
    const taxCode: Omit<TaxCodeEntity, "id" | "createdAt" | "updatedAt"> = {
      tenantId: ctx.tenantId,
      code: input.code,
      kind: input.kind,
      label: input.label,
      isActive: input.isActive ?? true,
    };

    return this.repo.create(taxCode);
  }
}
