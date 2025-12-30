import { Inject, Injectable } from "@nestjs/common";
import type { SyncPosSaleInput, SyncPosSaleOutput } from "@corely/contracts";
import {
  BaseUseCase,
  ConflictError,
  NoopLogger,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  err,
  ok,
} from "@corely/kernel";
import {
  POS_SALE_IDEMPOTENCY_PORT,
  type PosSaleIdempotencyPort,
} from "../ports/pos-sale-idempotency.port";

// Note: In production, inject SalesApplication for creating invoices/payments
// For now, this is a placeholder structure showing the integration pattern

@Injectable()
export class SyncPosSaleUseCase extends BaseUseCase<SyncPosSaleInput, SyncPosSaleOutput> {
  constructor(
    @Inject(POS_SALE_IDEMPOTENCY_PORT) private idempotencyStore: PosSaleIdempotencyPort
    // TODO: Inject SalesApplication, InventoryApplication (for product validation)
    // TODO: Inject PartyApplication (for customer validation)
  ) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: SyncPosSaleInput,
    ctx: UseCaseContext
  ): Promise<Result<SyncPosSaleOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    // 1. Check idempotency - return cached result if duplicate
    const cached = await this.idempotencyStore.get(ctx.tenantId, input.idempotencyKey);
    if (cached) {
      // Duplicate request - return cached result
      return ok(cached);
    }

    // 2. Validate products exist and are active
    // TODO: Use InventoryApplication to validate products
    // const productIds = input.lineItems.map(l => l.productId);
    // const products = await this.inventoryApp.validateProducts(productIds, ctx);
    // if (!products.ok) {
    //   return Err(new ConflictError("PRODUCT_NOT_FOUND", products.error.message));
    // }

    // 3. Validate customer exists (if provided)
    // TODO: Use PartyApplication to validate customer
    // if (input.customerPartyId) {
    //   const customer = await this.partyCrmApp.getParty(input.customerPartyId, ctx);
    //   if (!customer.ok) {
    //     return Err(new ConflictError("CUSTOMER_NOT_FOUND", "Customer not found or inactive"));
    //   }
    // }

    // 4. Create Sales Invoice via Sales module
    // TODO: Use SalesApplication.createInvoice
    // const invoiceResult = await this.salesApp.createInvoice({
    //   customerPartyId: input.customerPartyId,
    //   invoiceDate: input.saleDate,
    //   lineItems: input.lineItems.map(line => ({
    //     productId: line.productId,
    //     description: line.productName,
    //     quantity: line.quantity,
    //     unitPriceCents: line.unitPriceCents,
    //     discountCents: line.discountCents,
    //   })),
    //   // ... other fields
    // }, ctx);
    //
    // if (!invoiceResult.ok) {
    //   return Err(invoiceResult.error);
    // }

    // 5. Issue invoice immediately (POS sales are instant)
    // TODO: Use SalesApplication.issueInvoice
    // const issueResult = await this.salesApp.issueInvoice({
    //   invoiceId: invoiceResult.value.invoiceId,
    // }, ctx);

    // 6. Record payment(s)
    // TODO: Use SalesApplication.recordPayment for each payment
    // const paymentResult = await this.salesApp.recordPayment({
    //   invoiceId: invoiceResult.value.invoiceId,
    //   paymentDate: input.saleDate,
    //   amountCents: input.totalCents,
    //   method: input.payments[0].method,
    //   reference: input.payments[0].reference,
    // }, ctx);

    // 7. Generate receipt number
    // TODO: Implement receipt numbering service
    const receiptNumber = this.generateReceiptNumber(input.registerId, input.saleDate);

    // 8. Store idempotency mapping
    const result: SyncPosSaleOutput = {
      ok: true,
      serverInvoiceId: "mock-invoice-id", // TODO: invoiceResult.value.invoiceId,
      serverPaymentId: "mock-payment-id", // TODO: paymentResult.value.paymentId,
      receiptNumber,
    };

    await this.idempotencyStore.store(ctx.tenantId, input.idempotencyKey, input.posSaleId, result);

    // 9. TODO: Update shift session totals (if sessionId provided)
    // if (input.sessionId) {
    //   const session = await this.shiftRepo.findById(ctx.workspaceId, input.sessionId);
    //   if (session && session.isOpen()) {
    //     session.totalSalesCents += input.totalCents;
    //     if (input.payments.some(p => p.method === "CASH")) {
    //       const cashAmount = input.payments
    //         .filter(p => p.method === "CASH")
    //         .reduce((sum, p) => sum + p.amountCents, 0);
    //       session.totalCashReceivedCents += cashAmount;
    //     }
    //     await this.shiftRepo.update(session);
    //   }
    // }

    return ok(result);
  }

  /**
   * Generate receipt number (temporary implementation)
   * TODO: Move to dedicated receipt numbering service
   */
  private generateReceiptNumber(registerId: string, saleDate: Date): string {
    const dateStr = saleDate.toISOString().split("T")[0].replace(/-/g, "");
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `POS-${registerId.slice(0, 8)}-${dateStr}-${random}`;
  }
}
