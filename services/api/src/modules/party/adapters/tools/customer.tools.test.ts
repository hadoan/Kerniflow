import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildCustomerTools } from "./customer.tools";
import { PartyApplication } from "../../application/party.application";
import { err, NotFoundError, ok } from "@corely/kernel";

const customer = {
  id: "cust-1",
  displayName: "Acme",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("customer tools", () => {
  let app: PartyApplication;
  const getExecute = vi.fn();

  beforeEach(() => {
    getExecute.mockResolvedValue(ok({ customer }));
    app = {
      createCustomer: { execute: vi.fn().mockResolvedValue(ok({ customer })) },
      updateCustomer: { execute: vi.fn().mockResolvedValue(ok({ customer })) },
      archiveCustomer: { execute: vi.fn().mockResolvedValue(ok({ customer })) },
      getCustomerById: { execute: getExecute },
      searchCustomers: { execute: vi.fn().mockResolvedValue(ok({ items: [customer] })) },
      listCustomers: { execute: vi.fn() },
      unarchiveCustomer: { execute: vi.fn() },
    } as unknown as PartyApplication;
  });

  it("executes get tool", async () => {
    const tools = buildCustomerTools(app);
    const getTool = tools.find((t) => t.name === "customer_get")!;

    const result = await getTool.execute?.({
      tenantId: "tenant-1",
      userId: "user-1",
      input: { id: "cust-1" },
      toolCallId: "tool-1",
    });

    expect(result).toEqual({ ok: true, customer });
    expect(getExecute).toHaveBeenCalledWith(
      { id: "cust-1" },
      expect.objectContaining({ tenantId: "tenant-1", correlationId: "tool-1" })
    );
  });

  it("returns structured error on use case failure", async () => {
    getExecute.mockResolvedValueOnce(err(new NotFoundError("missing")));
    const getTool = buildCustomerTools(app).find((t) => t.name === "customer_get")!;

    const result = await getTool.execute?.({
      tenantId: "tenant-1",
      userId: "user-1",
      input: { id: "missing" },
    });

    expect(result).toEqual(expect.objectContaining({ ok: false, code: "NOT_FOUND" }));
  });
});
