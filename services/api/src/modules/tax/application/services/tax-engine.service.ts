import { Injectable, NotFoundException } from "@nestjs/common";
import type { CalculateTaxInput, TaxBreakdownDto } from "@kerniflow/contracts";
import { TaxProfileRepoPort } from "../../domain/ports";
import { TaxProfile } from "../../domain/entities";
import { DEPackV1 } from "./jurisdictions/de-pack.v1";

/**
 * Tax Engine Service
 * Coordinates tax calculations using jurisdiction-specific packs
 */
@Injectable()
export class TaxEngineService {
  constructor(
    private readonly taxProfileRepo: TaxProfileRepoPort,
    private readonly dePack: DEPackV1
  ) {}

  /**
   * Calculate tax breakdown for a document (invoice/expense draft)
   */
  async calculate(input: CalculateTaxInput, tenantId: string): Promise<TaxBreakdownDto> {
    const documentDate = new Date(input.documentDate);

    // Get active tax profile
    const profile = await this.taxProfileRepo.getActive(tenantId, documentDate);

    if (!profile) {
      throw new NotFoundException(
        `No active tax profile found for tenant ${tenantId} at ${documentDate.toISOString()}`
      );
    }

    if (!TaxProfile.canCalculate(profile, documentDate)) {
      throw new NotFoundException(
        `Tax profile is not active for date ${documentDate.toISOString()}`
      );
    }

    // Select jurisdiction pack
    const pack = this.getJurisdictionPack(input.jurisdiction || profile.country);

    // Apply rules
    return pack.applyRules({
      regime: profile.regime,
      documentDate,
      currency: input.currency || profile.currency,
      customer: input.customer,
      lines: input.lines,
      tenantId,
    });
  }

  /**
   * Get jurisdiction pack by country code
   */
  private getJurisdictionPack(jurisdiction: string) {
    // v1: only DE supported
    if (jurisdiction === "DE") {
      return this.dePack;
    }

    throw new NotFoundException(`Jurisdiction pack not found for: ${jurisdiction}`);
  }

  /**
   * List supported jurisdictions
   */
  getSupportedJurisdictions(): string[] {
    return ["DE"];
  }
}
