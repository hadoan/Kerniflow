import type {
  PosSaleLineItem,
  PosSalePayment,
  PosSale,
  PosTicketLineItem,
} from "@corely/contracts";

/**
 * Sale Builder - Core POS sale calculation and validation logic
 * Platform-agnostic business rules for building POS sales
 */
export class SaleBuilder {
  /**
   * Calculate line total for a single line item
   */
  calculateLineTotal(qty: number, unitPriceCents: number, discountCents: number = 0): number {
    if (qty <= 0) {
      throw new Error("Quantity must be positive");
    }
    if (unitPriceCents < 0) {
      throw new Error("Unit price cannot be negative");
    }
    if (discountCents < 0) {
      throw new Error("Discount cannot be negative");
    }

    const grossTotal = qty * unitPriceCents;
    const netTotal = grossTotal - discountCents;

    if (netTotal < 0) {
      throw new Error("Discount cannot exceed line total");
    }

    return netTotal;
  }

  /**
   * Calculate subtotal from line items
   */
  calculateSubtotal(lineItems: readonly PosSaleLineItem[] | readonly PosTicketLineItem[]): number {
    if (lineItems.length === 0) {
      return 0;
    }
    return lineItems.reduce((sum, line) => sum + line.lineTotalCents, 0);
  }

  /**
   * Calculate total with cart discount and tax
   */
  calculateTotal(
    subtotalCents: number,
    cartDiscountCents: number = 0,
    taxCents: number = 0
  ): number {
    if (subtotalCents < 0) {
      throw new Error("Subtotal cannot be negative");
    }
    if (cartDiscountCents < 0) {
      throw new Error("Cart discount cannot be negative");
    }
    if (taxCents < 0) {
      throw new Error("Tax cannot be negative");
    }

    const afterDiscount = subtotalCents - cartDiscountCents;
    if (afterDiscount < 0) {
      throw new Error("Cart discount cannot exceed subtotal");
    }

    return afterDiscount + taxCents;
  }

  /**
   * Validate that payments match total
   */
  validatePayments(totalCents: number, payments: readonly PosSalePayment[]): boolean {
    if (payments.length === 0) {
      throw new Error("At least one payment is required");
    }

    const paymentSum = payments.reduce((sum, p) => sum + p.amountCents, 0);

    if (paymentSum !== totalCents) {
      throw new Error(`Payment total (${paymentSum}) does not match sale total (${totalCents})`);
    }

    return true;
  }

  /**
   * Validate complete POS sale
   */
  validateSale(
    sale: Pick<
      PosSale,
      "lineItems" | "subtotalCents" | "cartDiscountCents" | "taxCents" | "totalCents" | "payments"
    >
  ): void {
    // Validate line items exist
    if (sale.lineItems.length === 0) {
      throw new Error("Sale must have at least one line item");
    }

    // Validate line totals match subtotal
    const calculatedSubtotal = this.calculateSubtotal(sale.lineItems);
    if (calculatedSubtotal !== sale.subtotalCents) {
      throw new Error(
        `Subtotal mismatch: calculated ${calculatedSubtotal}, provided ${sale.subtotalCents}`
      );
    }

    // Validate total calculation
    const calculatedTotal = this.calculateTotal(
      sale.subtotalCents,
      sale.cartDiscountCents,
      sale.taxCents
    );
    if (calculatedTotal !== sale.totalCents) {
      throw new Error(`Total mismatch: calculated ${calculatedTotal}, provided ${sale.totalCents}`);
    }

    // Validate payments
    this.validatePayments(sale.totalCents, sale.payments);
  }

  /**
   * Calculate change for cash payment
   */
  calculateChange(totalCents: number, amountPaidCents: number): number {
    if (amountPaidCents < totalCents) {
      throw new Error("Amount paid is less than total");
    }
    return amountPaidCents - totalCents;
  }

  /**
   * Recalculate all totals for a ticket (useful when line items change)
   */
  recalculateTotals(
    lineItems: readonly PosTicketLineItem[],
    cartDiscountCents: number = 0,
    taxCents: number = 0
  ): {
    subtotalCents: number;
    totalCents: number;
  } {
    const subtotalCents = this.calculateSubtotal(lineItems);
    const totalCents = this.calculateTotal(subtotalCents, cartDiscountCents, taxCents);

    return { subtotalCents, totalCents };
  }
}
