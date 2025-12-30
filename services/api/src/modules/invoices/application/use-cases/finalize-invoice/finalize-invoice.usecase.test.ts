import { beforeEach, describe, expect, it } from "vitest";
import { FinalizeInvoiceUseCase } from "./finalize-invoice.usecase";
import { FakeInvoiceRepository } from "../../../testkit/fakes/fake-invoice-repo";
import { FakeInvoiceNumbering } from "../../../testkit/fakes/fake-numbering";
import { InvoiceAggregate } from "../../../domain/invoice.aggregate";
import { FixedClock, NoopLogger, unwrap } from "@corely/kernel";
import { FakeCustomerQueryPort } from "../../../testkit/fakes/fake-customer-query";

describe("FinalizeInvoiceUseCase", () => {
  let repo: FakeInvoiceRepository;
  let numbering: FakeInvoiceNumbering;
  let useCase: FinalizeInvoiceUseCase;
  let customers: FakeCustomerQueryPort;
  const clock = new FixedClock(new Date("2025-01-02T00:00:00.000Z"));

  beforeEach(() => {
    repo = new FakeInvoiceRepository();
    numbering = new FakeInvoiceNumbering("INV");
    customers = new FakeCustomerQueryPort();
    customers.setSnapshot("tenant-1", {
      partyId: "cust",
      displayName: "Customer One",
      email: "customer@example.com",
      billingAddress: { line1: "Street 1", city: "Paris", country: "FR" },
    });
    useCase = new FinalizeInvoiceUseCase({
      logger: new NoopLogger(),
      invoiceRepo: repo,
      numbering,
      clock,
      customerQuery: customers,
    });
  });

  it("finalizes draft invoice and assigns number", async () => {
    const invoice = InvoiceAggregate.createDraft({
      id: "inv-1",
      tenantId: "tenant-1",
      customerPartyId: "cust",
      currency: "USD",
      lineItems: [{ id: "line-1", description: "Work", qty: 1, unitPriceCents: 1000 }],
      createdAt: new Date(),
    });
    repo.invoices = [invoice];

    const result = await useCase.execute({ invoiceId: invoice.id }, { tenantId: "tenant-1" });
    const dto = unwrap(result).invoice;
    expect(dto.status).toBe("ISSUED");
    expect(dto.number).toBe("INV-000001");
    expect(dto.billToName).toBe("Customer One");
    expect(dto.billToEmail).toBe("customer@example.com");
  });

  it("keeps bill-to snapshot stable after finalize", async () => {
    const invoice = InvoiceAggregate.createDraft({
      id: "inv-1",
      tenantId: "tenant-1",
      customerPartyId: "cust",
      currency: "USD",
      lineItems: [{ id: "line-1", description: "Work", qty: 1, unitPriceCents: 1000 }],
      createdAt: new Date(),
    });
    repo.invoices = [invoice];

    await useCase.execute({ invoiceId: invoice.id }, { tenantId: "tenant-1" });
    customers.setSnapshot("tenant-1", {
      partyId: "cust",
      displayName: "Changed Name",
    });

    expect(repo.invoices[0].billToName).toBe("Customer One");
  });
});
