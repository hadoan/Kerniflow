import { Injectable } from "@nestjs/common";
import type {
  TaxBreakdownDto,
  TaxCodeKind,
  TaxTotalsByKind,
  TaxLineResultDto,
} from "@corely/contracts";
import { TaxJurisdictionPack, type ApplyRulesParams } from "./tax-jurisdiction-pack";
import { TaxCodeRepoPort, TaxRateRepoPort } from "../../../domain/ports";
import { TaxCode, TaxRate } from "../../../domain/entities";
import { RoundingPolicy } from "../rounding.policy";

/**
 * Germany (DE) Tax Pack - v1
 * Implements German VAT rules for freelancers
 */
@Injectable()
export class DEPackV1 extends TaxJurisdictionPack {
  readonly code = "DE";

  constructor(
    private readonly taxCodeRepo: TaxCodeRepoPort,
    private readonly taxRateRepo: TaxRateRepoPort
  ) {
    super();
  }

  /**
   * Get rate in basis points for a tax code kind/ID
   */
  async getRateBps(taxCodeKindOrId: string, documentDate: Date, tenantId: string): Promise<number> {
    // Check if it's a TaxCodeKind enum value
    const validKinds = ["STANDARD", "REDUCED", "REVERSE_CHARGE", "EXEMPT", "ZERO"];
    const isKind = validKinds.includes(taxCodeKindOrId);

    if (!isKind) {
      // Treat as tax code ID
      const effectiveRate = await this.taxRateRepo.findEffectiveRate(
        taxCodeKindOrId,
        tenantId,
        documentDate
      );
      return effectiveRate?.rateBps ?? 0;
    }

    // Otherwise treat as kind
    const kind = taxCodeKindOrId as TaxCodeKind;

    // Zero-tax kinds
    if (TaxCode.isZeroTax(kind)) {
      return 0;
    }

    // Look up standard/reduced rates from tenant's tax codes
    const codes = await this.taxCodeRepo.findByKind(kind, tenantId);
    if (codes.length === 0) {
      // No tax code configured - fall back to German defaults
      if (kind === "STANDARD") {
        return 1900;
      } // 19%
      if (kind === "REDUCED") {
        return 700;
      } // 7%
      return 0;
    }

    // Get the first active code's effective rate
    const activeCode = codes.find((c) => c.isActive) || codes[0];
    const effectiveRate = await this.taxRateRepo.findEffectiveRate(
      activeCode.id,
      tenantId,
      documentDate
    );

    return effectiveRate?.rateBps ?? 0;
  }

  /**
   * Apply German VAT rules
   */
  async applyRules(params: ApplyRulesParams): Promise<TaxBreakdownDto> {
    const { regime, documentDate, currency, customer, lines, tenantId } = params;

    // Small business: no VAT charged
    if (regime === "SMALL_BUSINESS") {
      return this.applySmallBusinessRules(lines, currency);
    }

    // Standard VAT
    return this.applyStandardVat(lines, documentDate, tenantId, currency, customer);
  }

  /**
   * Small business regime (§19 UStG) - no VAT
   */
  private applySmallBusinessRules(lines: any[], currency: string): TaxBreakdownDto {
    const lineResults: TaxLineResultDto[] = lines.map((line) => ({
      lineId: line.id || null,
      taxCodeId: null,
      kind: "EXEMPT",
      rateBps: 0,
      netAmountCents: line.netAmountCents,
      taxAmountCents: 0,
      grossAmountCents: line.netAmountCents,
    }));

    const subtotalAmountCents = lines.reduce((sum, line) => sum + line.netAmountCents, 0);

    return {
      subtotalAmountCents,
      taxTotalAmountCents: 0,
      totalAmountCents: subtotalAmountCents,
      roundingMode: "PER_LINE",
      lines: lineResults,
      totalsByKind: {
        EXEMPT: {
          netAmountCents: subtotalAmountCents,
          taxAmountCents: 0,
          grossAmountCents: subtotalAmountCents,
        },
      },
      flags: {
        needsReverseChargeNote: false,
        isSmallBusinessNoVatCharged: true,
      },
    };
  }

  /**
   * Standard VAT regime
   */
  private async applyStandardVat(
    lines: any[],
    documentDate: Date,
    tenantId: string,
    currency: string,
    customer: any
  ): Promise<TaxBreakdownDto> {
    const lineResults: TaxLineResultDto[] = [];
    let needsReverseChargeNote = false;

    // Process each line
    for (const line of lines) {
      const taxCodeId = line.taxCodeId;
      let kind: TaxCodeKind = "STANDARD"; // default
      let rateBps = 0;

      if (taxCodeId) {
        // Look up the tax code
        const taxCode = await this.taxCodeRepo.findById(taxCodeId, tenantId);
        if (taxCode) {
          kind = taxCode.kind;

          // Get rate if needed
          if (TaxCode.requiresRate(kind)) {
            rateBps = await this.getRateBps(taxCodeId, documentDate, tenantId);
          } else if (TaxCode.needsReverseChargeNote(kind)) {
            needsReverseChargeNote = true;
          }
        }
      } else {
        // No tax code specified - default to STANDARD with standard rate
        rateBps = await this.getRateBps("STANDARD", documentDate, tenantId);
      }

      // Calculate tax
      const taxAmountCents = RoundingPolicy.calculateTaxCents(line.netAmountCents, rateBps);
      const grossAmountCents = line.netAmountCents + taxAmountCents;

      lineResults.push({
        lineId: line.id || null,
        taxCodeId: taxCodeId || null,
        kind,
        rateBps,
        netAmountCents: line.netAmountCents,
        taxAmountCents,
        grossAmountCents,
      });
    }

    // Aggregate totals by kind
    const totalsByKind: TaxTotalsByKind = {};
    for (const line of lineResults) {
      const bucket =
        totalsByKind[line.kind] ??
        (totalsByKind[line.kind] = {
          netAmountCents: 0,
          taxAmountCents: 0,
          grossAmountCents: 0,
          rateBps: line.rateBps,
        });
      bucket.netAmountCents += line.netAmountCents;
      bucket.taxAmountCents += line.taxAmountCents;
      bucket.grossAmountCents += line.grossAmountCents;
    }

    const subtotalAmountCents = lineResults.reduce((sum, line) => sum + line.netAmountCents, 0);
    const taxTotalAmountCents = lineResults.reduce((sum, line) => sum + line.taxAmountCents, 0);
    const totalAmountCents = subtotalAmountCents + taxTotalAmountCents;

    return {
      subtotalAmountCents,
      taxTotalAmountCents,
      totalAmountCents,
      roundingMode: "PER_LINE",
      lines: lineResults,
      totalsByKind,
      flags: {
        needsReverseChargeNote,
        isSmallBusinessNoVatCharged: false,
      },
    };
  }
}
