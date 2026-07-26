import { Injectable } from "@nestjs/common";
import { type TaxCodeEntity } from "../../domain/entities";
import { TaxCodeRepoPort, TaxProfileRepoPort, TaxRateRepoPort } from "../../domain/ports";
import { ensureDeStandardVatCodes } from "../services/ensure-de-standard-vat-codes";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";

@RequireTenant()
@Injectable()
export class ListTaxCodesUseCase extends BaseUseCase<void, TaxCodeEntity[]> {
  constructor(
    private readonly repo: TaxCodeRepoPort,
    private readonly taxProfileRepo: TaxProfileRepoPort,
    private readonly taxRateRepo: TaxRateRepoPort
  ) {
    super({ logger: null as any });
  }

  protected async handle(
    _input: void,
    ctx: UseCaseContext
  ): Promise<Result<TaxCodeEntity[], UseCaseError>> {
    const scopeId = ctx.workspaceId || ctx.tenantId!;
    let codes = await this.repo.findAll(scopeId);
    if (codes.length === 0) {
      const profile = await this.taxProfileRepo.getActive(scopeId, new Date());
      if (profile?.country === "DE" && profile.regime === "STANDARD_VAT") {
        await ensureDeStandardVatCodes({
          tenantId: scopeId,
          effectiveFrom: profile.effectiveFrom,
          taxCodeRepo: this.repo,
          taxRateRepo: this.taxRateRepo,
        });
        codes = await this.repo.findAll(scopeId);
      }
    }
    return ok(codes);
  }
}
