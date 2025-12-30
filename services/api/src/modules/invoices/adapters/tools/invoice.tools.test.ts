import { describe, expect, it, beforeEach, vi } from "vitest";
import { buildInvoiceTools } from "./invoice.tools";
import { InvoicesApplication } from "../../application/invoices.application";
import { NotFoundError, err, ok } from "@corely/kernel";

const invoice = {
  id: "inv-1",
  tenantId: "tenant-1",
  number: null,
  status: "DRAFT" as const,
  customerPartyId: "cust-1",
  billToName: null,
  billToEmail: null,
  billToVatId: null,
  billToAddressLine1: null,
  billToAddressLine2: null,
  billToCity: null,
  billToPostalCode: null,
  billToCountry: null,
  currency: "USD",
  invoiceDate: null,
  dueDate: null,
  issuedAt: null,
  sentAt: null,
  notes: null,
  terms: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lineItems: [{ id: "line-1", description: "Item", qty: 1, unitPriceCents: 1000 }],
  payments: [],
  totals: {
    subtotalCents: 1000,
    taxCents: 0,
    discountCents: 0,
    totalCents: 1000,
    paidCents: 0,
    dueCents: 1000,
  },
};

describe("invoice tools", () => {
  let app: InvoicesApplication;
  const getExecute = vi.fn();
  const updateExecute = vi.fn();

  beforeEach(() => {
    getExecute.mockResolvedValue(ok({ invoice }));
    updateExecute.mockResolvedValue(ok({ invoice }));
    app = {
      getInvoiceById: { execute: getExecute },
      listInvoices: {
        execute: vi.fn().mockResolvedValue(ok({ items: [invoice], nextCursor: null })),
      },
      createInvoice: { execute: vi.fn().mockResolvedValue(ok({ invoice })) },
      updateInvoice: { execute: updateExecute },
      finalizeInvoice: { execute: vi.fn().mockResolvedValue(ok({ invoice })) },
      sendInvoice: {
        execute: vi.fn().mockResolvedValue(ok({ invoice: { ...invoice, status: "SENT" } })),
      },
      recordPayment: { execute: vi.fn().mockResolvedValue(ok({ invoice })) },
      cancelInvoice: { execute: vi.fn().mockResolvedValue(ok({ invoice })) },
    } as unknown as InvoicesApplication;
  });

  it("invokes get invoice use case and returns dto", async () => {
    const [getInvoiceTool] = buildInvoiceTools(app);
    const result = await getInvoiceTool.execute?.({
      tenantId: "tenant-1",
      userId: "user-1",
      input: { invoiceId: "inv-1" },
      toolCallId: "tool-1",
    });

    expect(result).toEqual({ ok: true, invoice });
    expect(getExecute).toHaveBeenCalledWith(
      { invoiceId: "inv-1" },
      expect.objectContaining({ tenantId: "tenant-1", correlationId: "tool-1" })
    );
  });

  it("returns structured validation errors for invalid payload", async () => {
    const [getInvoiceTool] = buildInvoiceTools(app);

    const result = await getInvoiceTool.execute?.({
      tenantId: "tenant-1",
      userId: "user-1",
      input: {},
    });

    expect(result).toEqual(expect.objectContaining({ ok: false }));
  });

  it("maps use case errors to tool error shape", async () => {
    getExecute.mockResolvedValueOnce(err(new NotFoundError("missing")));
    const [getInvoiceTool] = buildInvoiceTools(app);

    const result = await getInvoiceTool.execute?.({
      tenantId: "tenant-1",
      userId: "user-1",
      input: { invoiceId: "bad" },
    });

    expect(result).toEqual(expect.objectContaining({ ok: false, code: "NOT_FOUND" }));
  });
});
