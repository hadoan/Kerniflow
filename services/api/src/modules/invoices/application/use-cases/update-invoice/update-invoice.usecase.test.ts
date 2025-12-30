import { beforeEach, describe, expect, it } from "vitest";
import {
  FakeIdGenerator,
  NoopLogger,
  ConflictError,
  isErr,
  unwrap,
  FixedClock,
  NotFoundError,
} from "@corely/kernel";
import { UpdateInvoiceUseCase } from "./update-invoice.usecase";
import { FakeInvoiceRepository } from "../../../testkit/fakes/fake-invoice-repo";
import { InvoiceAggregate } from "../../../domain/invoice.aggregate";
import { FakeCustomerQueryPort } from "../../../testkit/fakes/fake-customer-query";

describe("UpdateInvoiceUseCase", () => {
  let useCase: UpdateInvoiceUseCase;
  let repo: FakeInvoiceRepository;
  let customers: FakeCustomerQueryPort;

  const seedInvoice = (status: "DRAFT" | "ISSUED" | "SENT" | "PAID" | "CANCELED" = "DRAFT") => {
    const invoice = InvoiceAggregate.createDraft({
      id: "inv-1",
      tenantId: "tenant-1",
      customerPartyId: "cust-1",
      currency: "USD",
      lineItems: [
        { id: "line-1", description: "Item", qty: 1, unitPriceCents: 500 },
        { id: "line-2", description: "Item 2", qty: 1, unitPriceCents: 300 },
      ],
      createdAt: new Date("2024-01-01T00:00:00.000Z"),
    });
    invoice.status = status;
    repo.invoices = [invoice];
    return invoice;
  };

  beforeEach(() => {
    repo = new FakeInvoiceRepository();
    customers = new FakeCustomerQueryPort();
    customers.setSnapshot("tenant-1", {
      partyId: "cust-1",
      displayName: "Customer One",
    });
    const clock = new FixedClock(new Date("2025-01-04T00:00:00.000Z"));
    useCase = new UpdateInvoiceUseCase({
      logger: new NoopLogger(),
      invoiceRepo: repo,
      idGenerator: new FakeIdGenerator(["line-3"]),
      clock,
      customerQuery: customers,
    });
  });

  it("updates header and line items when draft", async () => {
    const invoice = seedInvoice("DRAFT");

    const result = await useCase.execute(
      {
        invoiceId: invoice.id,
        headerPatch: { currency: "EUR" },
        lineItems: [{ description: "New", qty: 2, unitPriceCents: 700 }],
      },
      { tenantId: invoice.tenantId }
    );

    const dto = unwrap(result).invoice;
    expect(dto.currency).toBe("EUR");
    expect(dto.lineItems[0].id).toBe("line-3");
    expect(repo.invoices[0].lineItems).toHaveLength(1);
  });

  it("fails updating line items when not draft", async () => {
    const invoice = seedInvoice("ISSUED");
    const result = await useCase.execute(
      {
        invoiceId: invoice.id,
        lineItems: [{ description: "Bad", qty: 1, unitPriceCents: 100 }],
      },
      { tenantId: invoice.tenantId }
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(ConflictError);
    }
  });

  it("requires customer to exist when changing customer", async () => {
    const invoice = seedInvoice("DRAFT");
    const result = await useCase.execute(
      {
        invoiceId: invoice.id,
        headerPatch: { customerPartyId: "missing" },
      },
      { tenantId: invoice.tenantId }
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(NotFoundError);
    }
  });
});
