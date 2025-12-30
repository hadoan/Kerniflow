import type {
  VendorBillLineItem,
  VendorBillTotals,
  PurchaseOrderTotals,
  BillPayment,
} from "./purchasing.types";

type LineItemAmount = {
  quantity: number;
  unitCostCents: number;
};

export const calculatePurchaseOrderTotals = (lineItems: LineItemAmount[]): PurchaseOrderTotals => {
  const subtotalCents = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitCostCents,
    0
  );
  const taxCents = 0;
  const totalCents = Math.max(subtotalCents + taxCents, 0);
  return { subtotalCents, taxCents, totalCents };
};

export const calculateVendorBillTotals = (
  lineItems: VendorBillLineItem[],
  payments: BillPayment[]
): VendorBillTotals => {
  const base = calculatePurchaseOrderTotals(lineItems);
  const paidCents = payments.reduce((sum, payment) => sum + payment.amountCents, 0);
  const dueCents = Math.max(base.totalCents - paidCents, 0);
  return { ...base, paidCents, dueCents };
};
