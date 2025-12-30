import { Injectable } from "@nestjs/common";
import type { CalculateTaxInput, TaxBreakdownDto } from "@corely/contracts";
import { TaxEngineService } from "../services/tax-engine.service";
import type { UseCaseContext } from "./use-case-context";

/**
 * Calculate Tax Use Case
 * Used by invoice/expense modules for draft preview
 */
@Injectable()
export class CalculateTaxUseCase {
  constructor(private readonly taxEngine: TaxEngineService) {}

  async execute(input: CalculateTaxInput, ctx: UseCaseContext): Promise<TaxBreakdownDto> {
    return this.taxEngine.calculate(input, ctx.tenantId);
  }
}
