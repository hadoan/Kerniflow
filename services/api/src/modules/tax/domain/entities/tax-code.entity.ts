import type { TaxCodeKind } from "@corely/contracts";

export interface TaxCodeEntity {
  id: string;
  tenantId: string;
  code: string;
  kind: TaxCodeKind;
  label: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class TaxCode {
  /**
   * Check if tax code requires rate lookup
   */
  static requiresRate(kind: TaxCodeKind): boolean {
    return kind === "STANDARD" || kind === "REDUCED";
  }

  /**
   * Check if tax code results in zero tax
   */
  static isZeroTax(kind: TaxCodeKind): boolean {
    return kind === "REVERSE_CHARGE" || kind === "EXEMPT" || kind === "ZERO";
  }

  /**
   * Check if tax code requires reverse charge note
   */
  static needsReverseChargeNote(kind: TaxCodeKind): boolean {
    return kind === "REVERSE_CHARGE";
  }
}
