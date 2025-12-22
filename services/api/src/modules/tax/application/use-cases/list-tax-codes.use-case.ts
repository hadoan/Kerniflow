import { Injectable } from "@nestjs/common";
import type { TaxCodeEntity } from "../../domain/entities";
import { TaxCodeRepoPort } from "../../domain/ports";
import type { UseCaseContext } from "./use-case-context";

@Injectable()
export class ListTaxCodesUseCase {
  constructor(private readonly repo: TaxCodeRepoPort) {}

  async execute(ctx: UseCaseContext): Promise<TaxCodeEntity[]> {
    return this.repo.findAll(ctx.tenantId);
  }
}
