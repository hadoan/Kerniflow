import type { PosSale, SyncPosSaleInput } from "@corely/contracts";

/**
 * Sync Command Mapper - Maps POS sale to sync command payload
 * Platform-agnostic mapping logic
 */
export class SyncCommandMapper {
  /**
   * Map PosSale to SyncPosSaleInput for server sync
   */
  toSyncPosSaleInput(posSale: PosSale): SyncPosSaleInput {
    return {
      posSaleId: posSale.posSaleId,
      workspaceId: posSale.workspaceId,
      sessionId: posSale.sessionId,
      registerId: posSale.registerId,
      saleDate: posSale.saleDate,
      cashierEmployeePartyId: posSale.cashierEmployeePartyId,
      customerPartyId: posSale.customerPartyId,
      lineItems: posSale.lineItems.map((line: PosSale["lineItems"][number]) => ({
        lineItemId: line.lineItemId,
        productId: line.productId,
        productName: line.productName,
        sku: line.sku,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        discountCents: line.discountCents,
        lineTotalCents: line.lineTotalCents,
      })),
      cartDiscountCents: posSale.cartDiscountCents,
      subtotalCents: posSale.subtotalCents,
      taxCents: posSale.taxCents,
      totalCents: posSale.totalCents,
      payments: posSale.payments.map((payment: PosSale["payments"][number]) => ({
        paymentId: payment.paymentId,
        method: payment.method,
        amountCents: payment.amountCents,
        reference: payment.reference,
      })),
      idempotencyKey: posSale.idempotencyKey,
    };
  }
}
