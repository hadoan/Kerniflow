import { beforeEach, describe, expect, it } from "vitest";
import { CreateInvoiceUseCase } from "./create-invoice.usecase";
import { FakeInvoiceRepository } from "../../../testkit/fakes/fake-invoice-repo";
import {
  FakeIdGenerator,
  FixedClock,
  NoopLogger,
  unwrap,
  isErr,
  NotFoundError,
} from "@corely/kernel";
import { TimeService } from "@corely/kernel";
import { FakeCustomerQueryPort } from "../../../testkit/fakes/fake-customer-query";

describe("CreateInvoiceUseCase", () => {
  let useCase: CreateInvoiceUseCase;
  let repo: FakeInvoiceRepository;
  let customers: FakeCustomerQueryPort;

  beforeEach(() => {
    repo = new FakeInvoiceRepository();
    customers = new FakeCustomerQueryPort();
    customers.setSnapshot("tenant-1", {
      partyId: "cust-1",
      displayName: "Acme",
      email: "billing@acme.com",
      vatId: "VAT123",
      billingAddress: { line1: "123 Main St", city: "NYC", country: "US" },
    });
    const clock = new FixedClock(new Date("2025-01-01T00:00:00.000Z"));
    const timeService = new TimeService(clock, {
      async getTenantTimeZone() {
        return "UTC";
      },
    });
    useCase = new CreateInvoiceUseCase({
      logger: new NoopLogger(),
      invoiceRepo: repo,
      idGenerator: new FakeIdGenerator(["inv-1", "line-1"]),
      clock,
      timeService,
      customerQuery: customers,
    });
  });

  it("creates a draft invoice with totals", async () => {
    const result = await useCase.execute(
      {
        customerPartyId: "cust-1",
        currency: "USD",
        lineItems: [{ description: "Work", qty: 2, unitPriceCents: 500 }],
      },
      { tenantId: "tenant-1" }
    );

    const dto = unwrap(result).invoice;
    expect(dto.status).toBe("DRAFT");
    expect(dto.totals.totalCents).toBe(1000);
    expect(repo.invoices).toHaveLength(1);
  });

  it("fails when customer snapshot is missing", async () => {
    customers.snapshots = {};
    const result = await useCase.execute(
      {
        customerPartyId: "cust-2",
        currency: "USD",
        lineItems: [{ description: "Work", qty: 1, unitPriceCents: 500 }],
      },
      { tenantId: "tenant-1" }
    );

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(NotFoundError);
    }
  });
});
