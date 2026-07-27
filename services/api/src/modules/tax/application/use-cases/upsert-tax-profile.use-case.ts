import { Injectable } from "@nestjs/common";
import { type UpsertTaxProfileInput } from "@corely/contracts";
import { type TaxProfileEntity } from "../../domain/entities";
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
export class UpsertTaxProfileUseCase extends BaseUseCase<UpsertTaxProfileInput, TaxProfileEntity> {
  constructor(
    private readonly repo: TaxProfileRepoPort,
    private readonly taxCodeRepo: TaxCodeRepoPort,
    private readonly taxRateRepo: TaxRateRepoPort
  ) {
    super({ logger: null as any });
  }

  protected async handle(
    input: UpsertTaxProfileInput,
    ctx: UseCaseContext
  ): Promise<Result<TaxProfileEntity, UseCaseError>> {
    const tenantId = ctx.tenantId!;
    const workspaceId = ctx.workspaceId || tenantId;

    const saved = await this.repo.upsert({
      tenantId: workspaceId,
      country: input.country,
      regime: input.regime,
      vatEnabled: input.vatEnabled,
      vatId: input.vatId || null,
      currency: input.currency,
      filingFrequency: input.filingFrequency,
      vatAccountingMethod: input.vatAccountingMethod,
      taxYearStartMonth: input.taxYearStartMonth,
      localTaxOfficeName: input.localTaxOfficeName,
      vatExemptionParagraph: input.vatExemptionParagraph || null,
      euB2BSales: input.euB2BSales ?? false,
      hasEmployees: input.hasEmployees ?? false,
      usesTaxAdvisor: input.usesTaxAdvisor ?? false,
      effectiveFrom: new Date(input.effectiveFrom),
      effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
    });

    if (saved.country === "DE" && saved.regime === "STANDARD_VAT") {
      await ensureDeStandardVatCodes({
        tenantId: workspaceId,
        effectiveFrom: saved.effectiveFrom,
        taxCodeRepo: this.taxCodeRepo,
        taxRateRepo: this.taxRateRepo,
      });
    }

    return ok(saved);
  }
}
