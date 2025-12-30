import type * as SQLite from "expo-sqlite";
import { v4 as uuidv4 } from "@lukeed/uuid";
import type { PosSale, PosSaleLineItem, PosSalePayment } from "@corely/contracts";
import { SaleBuilder } from "@corely/pos-core";

const saleBuilder = new SaleBuilder();

export interface CreateSaleParams {
  workspaceId: string;
  sessionId: string | null;
  registerId: string;
  customerId: string | null;
  lineItems: Omit<PosSaleLineItem, "lineId">[];
  payments: PosSalePayment[];
  notes: string | null;
  taxCents: number;
}

export class SalesService {
  private db: SQLite.SQLiteDatabase;

  constructor(db: SQLite.SQLiteDatabase) {
    this.db = db;
  }

  async initialize(): Promise<void> {
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS pos_sales (
        pos_sale_id TEXT PRIMARY KEY,
        workspace_id TEXT NOT NULL,
        session_id TEXT,
        register_id TEXT NOT NULL,
        customer_id TEXT,
        receipt_number TEXT NOT NULL,
        subtotal_cents INTEGER NOT NULL,
        tax_cents INTEGER NOT NULL,
        total_cents INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING_SYNC',
        idempotency_key TEXT NOT NULL UNIQUE,
        server_invoice_id TEXT,
        server_payment_id TEXT,
        sync_error TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        synced_at TEXT
      );

      CREATE TABLE IF NOT EXISTS pos_sale_line_items (
        line_id TEXT PRIMARY KEY,
        pos_sale_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price_cents INTEGER NOT NULL,
        discount_cents INTEGER NOT NULL DEFAULT 0,
        line_total_cents INTEGER NOT NULL,
        FOREIGN KEY (pos_sale_id) REFERENCES pos_sales(pos_sale_id)
      );

      CREATE TABLE IF NOT EXISTS pos_sale_payments (
        payment_id TEXT PRIMARY KEY,
        pos_sale_id TEXT NOT NULL,
        method TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
        reference TEXT,
        FOREIGN KEY (pos_sale_id) REFERENCES pos_sales(pos_sale_id)
      );

      CREATE INDEX IF NOT EXISTS idx_pos_sales_status ON pos_sales(status);
      CREATE INDEX IF NOT EXISTS idx_pos_sales_workspace ON pos_sales(workspace_id);
      CREATE INDEX IF NOT EXISTS idx_pos_sales_session ON pos_sales(session_id);
    `);
  }

  async createSale(params: CreateSaleParams): Promise<PosSale> {
    const posSaleId = uuidv4();
    const idempotencyKey = uuidv4();
    const createdAt = new Date();

    // Calculate totals
    const subtotalCents = params.lineItems.reduce((sum, item) => {
      return (
        sum + saleBuilder.calculateLineTotal(item.quantity, item.unitPriceCents, item.discountCents)
      );
    }, 0);

    const totalCents = subtotalCents + params.taxCents;

    // Generate receipt number (local format)
    const receiptNumber = this.generateReceiptNumber(params.registerId, createdAt);

    // Add line items with IDs
    const lineItems: PosSaleLineItem[] = params.lineItems.map((item) => ({
      ...item,
      lineId: uuidv4(),
    }));

    // Create the sale object
    const sale: PosSale = {
      posSaleId,
      workspaceId: params.workspaceId,
      sessionId: params.sessionId,
      registerId: params.registerId,
      customerId: params.customerId,
      receiptNumber,
      lineItems,
      payments: params.payments,
      subtotalCents,
      taxCents: params.taxCents,
      totalCents,
      status: "PENDING_SYNC",
      idempotencyKey,
      serverInvoiceId: null,
      serverPaymentId: null,
      syncError: null,
      notes: params.notes,
      createdAt,
      syncedAt: null,
    };

    // Save to SQLite
    await this.db.runAsync(
      `INSERT INTO pos_sales (
        pos_sale_id, workspace_id, session_id, register_id, customer_id,
        receipt_number, subtotal_cents, tax_cents, total_cents, status,
        idempotency_key, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        posSaleId,
        params.workspaceId,
        params.sessionId,
        params.registerId,
        params.customerId,
        receiptNumber,
        subtotalCents,
        params.taxCents,
        totalCents,
        "PENDING_SYNC",
        idempotencyKey,
        params.notes,
        createdAt.toISOString(),
      ]
    );

    // Save line items
    for (const item of lineItems) {
      const lineTotal = saleBuilder.calculateLineTotal(
        item.quantity,
        item.unitPriceCents,
        item.discountCents
      );

      await this.db.runAsync(
        `INSERT INTO pos_sale_line_items (
          line_id, pos_sale_id, product_id, name, quantity,
          unit_price_cents, discount_cents, line_total_cents
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.lineId,
          posSaleId,
          item.productId,
          item.name,
          item.quantity,
          item.unitPriceCents,
          item.discountCents,
          lineTotal,
        ]
      );
    }

    // Save payments
    for (const payment of params.payments) {
      await this.db.runAsync(
        `INSERT INTO pos_sale_payments (
          payment_id, pos_sale_id, method, amount_cents, reference
        ) VALUES (?, ?, ?, ?, ?)`,
        [payment.paymentId, posSaleId, payment.method, payment.amountCents, payment.reference]
      );
    }

    return sale;
  }

  async getSaleById(posSaleId: string): Promise<PosSale | null> {
    const sale = await this.db.getFirstAsync<any>("SELECT * FROM pos_sales WHERE pos_sale_id = ?", [
      posSaleId,
    ]);

    if (!sale) {
      return null;
    }

    const lineItems = await this.db.getAllAsync<any>(
      "SELECT * FROM pos_sale_line_items WHERE pos_sale_id = ?",
      [posSaleId]
    );

    const payments = await this.db.getAllAsync<any>(
      "SELECT * FROM pos_sale_payments WHERE pos_sale_id = ?",
      [posSaleId]
    );

    return this.mapSaleFromDb(sale, lineItems, payments);
  }

  async getPendingSales(workspaceId: string): Promise<PosSale[]> {
    const sales = await this.db.getAllAsync<any>(
      `SELECT * FROM pos_sales
       WHERE workspace_id = ? AND status = 'PENDING_SYNC'
       ORDER BY created_at ASC`,
      [workspaceId]
    );

    const result: PosSale[] = [];

    for (const sale of sales) {
      const lineItems = await this.db.getAllAsync<any>(
        "SELECT * FROM pos_sale_line_items WHERE pos_sale_id = ?",
        [sale.pos_sale_id]
      );

      const payments = await this.db.getAllAsync<any>(
        "SELECT * FROM pos_sale_payments WHERE pos_sale_id = ?",
        [sale.pos_sale_id]
      );

      result.push(this.mapSaleFromDb(sale, lineItems, payments));
    }

    return result;
  }

  async markSynced(
    posSaleId: string,
    serverInvoiceId: string,
    serverPaymentId: string | null
  ): Promise<void> {
    await this.db.runAsync(
      `UPDATE pos_sales
       SET status = 'SYNCED',
           server_invoice_id = ?,
           server_payment_id = ?,
           synced_at = ?
       WHERE pos_sale_id = ?`,
      [serverInvoiceId, serverPaymentId, new Date().toISOString(), posSaleId]
    );
  }

  async markFailed(posSaleId: string, error: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE pos_sales
       SET status = 'FAILED',
           sync_error = ?
       WHERE pos_sale_id = ?`,
      [error, posSaleId]
    );
  }

  private generateReceiptNumber(registerId: string, date: Date): string {
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    return `${registerId.slice(0, 6).toUpperCase()}-${dateStr}-${randomSuffix}`;
  }

  private mapSaleFromDb(sale: any, lineItems: any[], payments: any[]): PosSale {
    return {
      posSaleId: sale.pos_sale_id,
      workspaceId: sale.workspace_id,
      sessionId: sale.session_id,
      registerId: sale.register_id,
      customerId: sale.customer_id,
      receiptNumber: sale.receipt_number,
      lineItems: lineItems.map((item) => ({
        lineId: item.line_id,
        productId: item.product_id,
        name: item.name,
        quantity: item.quantity,
        unitPriceCents: item.unit_price_cents,
        discountCents: item.discount_cents,
      })),
      payments: payments.map((p) => ({
        paymentId: p.payment_id,
        method: p.method,
        amountCents: p.amount_cents,
        reference: p.reference,
      })),
      subtotalCents: sale.subtotal_cents,
      taxCents: sale.tax_cents,
      totalCents: sale.total_cents,
      status: sale.status,
      idempotencyKey: sale.idempotency_key,
      serverInvoiceId: sale.server_invoice_id,
      serverPaymentId: sale.server_payment_id,
      syncError: sale.sync_error,
      notes: sale.notes,
      createdAt: new Date(sale.created_at),
      syncedAt: sale.synced_at ? new Date(sale.synced_at) : null,
    };
  }
}
