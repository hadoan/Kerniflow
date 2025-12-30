import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomersHttpController } from "./customers.controller";
import { PartyApplication } from "../../application/party.application";
import { err, NotFoundError, ok } from "@corely/kernel";
import { HttpException } from "@nestjs/common";

const customer = {
  id: "cust-1",
  displayName: "Acme",
  email: "billing@acme.com",
  phone: "+123",
  billingAddress: { line1: "123 Main" },
  vatId: "VAT123",
  notes: "note",
  tags: ["vip"],
  archivedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("CustomersHttpController", () => {
  let controller: CustomersHttpController;
  const getExecute = vi.fn();

  beforeEach(() => {
    getExecute.mockResolvedValue(ok({ customer }));
    const app = {
      createCustomer: { execute: vi.fn().mockResolvedValue(ok({ customer })) },
      updateCustomer: { execute: vi.fn().mockResolvedValue(ok({ customer })) },
      archiveCustomer: { execute: vi.fn().mockResolvedValue(ok({ customer })) },
      unarchiveCustomer: { execute: vi.fn().mockResolvedValue(ok({ customer })) },
      getCustomerById: { execute: getExecute },
      listCustomers: { execute: vi.fn().mockResolvedValue(ok({ items: [customer] })) },
      searchCustomers: { execute: vi.fn().mockResolvedValue(ok({ items: [customer] })) },
    } as unknown as PartyApplication;

    controller = new CustomersHttpController(app);
  });

  it("returns customer dto", async () => {
    const req = { headers: { "x-tenant-id": "tenant-1" } } as any;
    const result = await controller.get("cust-1", req);

    expect(result).toEqual(customer);
    expect(getExecute).toHaveBeenCalledWith(
      { id: "cust-1" },
      expect.objectContaining({ tenantId: "tenant-1" })
    );
  });

  it("maps use case errors to http exception", async () => {
    getExecute.mockResolvedValueOnce(err(new NotFoundError("missing")));
    const req = { headers: { "x-tenant-id": "tenant-1" } } as any;
    await expect(controller.get("missing", req)).rejects.toBeInstanceOf(HttpException);
  });
});
