import { Injectable } from "@nestjs/common";
import type { TaxProfileEntity } from "../../domain/entities";
import { TaxProfileRepoPort } from "../../domain/ports";
import type { UseCaseContext } from "./use-case-context";

@Injectable()
export class GetTaxProfileUseCase {
  constructor(private readonly repo: TaxProfileRepoPort) {}

  async execute(ctx: UseCaseContext): Promise<TaxProfileEntity | null> {
    // Get active profile for current date
    const now = new Date();
    return this.repo.getActive(ctx.tenantId, now);
  }
}
