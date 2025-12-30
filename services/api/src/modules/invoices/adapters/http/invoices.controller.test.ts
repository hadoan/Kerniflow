import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvoicesHttpController } from "./invoices.controller";
import { InvoicesApplication } from "../../application/invoices.application";
import { HttpException } from "@nestjs/common";
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

describe("InvoicesHttpController", () => {
  let controller: InvoicesHttpController;
  const getExecute = vi.fn();
  const updateExecute = vi.fn();

  beforeEach(() => {
    getExecute.mockResolvedValue(ok({ invoice }));
    updateExecute.mockResolvedValue(ok({ invoice }));

    const app = {
      getInvoiceById: { execute: getExecute },
      updateInvoice: { execute: updateExecute },
      createInvoice: { execute: vi.fn().mockResolvedValue(ok({ invoice })) },
      finalizeInvoice: { execute: vi.fn().mockResolvedValue(ok({ invoice })) },
      sendInvoice: { execute: vi.fn().mockResolvedValue(ok({ invoice })) },
      recordPayment: { execute: vi.fn().mockResolvedValue(ok({ invoice })) },
      cancelInvoice: { execute: vi.fn().mockResolvedValue(ok({ invoice })) },
      listInvoices: {
        execute: vi.fn().mockResolvedValue(ok({ items: [invoice], nextCursor: null })),
      },
    } as unknown as InvoicesApplication;

    controller = new InvoicesHttpController(app);
  });

  it("returns invoice dto via get endpoint", async () => {
    const req = { headers: { "x-tenant-id": "tenant-1" } } as any;
    const result = await controller.getInvoice("inv-1", req);

    expect(result).toEqual(invoice);
    expect(getExecute).toHaveBeenCalledWith(
      { invoiceId: "inv-1" },
      expect.objectContaining({ tenantId: "tenant-1" })
    );
  });

  it("maps use case errors to http exceptions", async () => {
    getExecute.mockResolvedValueOnce(err(new NotFoundError("missing invoice")));
    const req = { headers: { "x-tenant-id": "tenant-1" } } as any;

    await expect(controller.getInvoice("missing", req)).rejects.toBeInstanceOf(HttpException);
  });
});
