import { beforeEach, describe, expect, it } from "vitest";
import { ListInvoicesUseCase } from "./ListInvoicesUseCase";
import { FakeInvoiceRepository } from "../../../testkit/fakes/fake-invoice-repo";
import { InvoiceAggregate } from "../../../domain/invoice.aggregate";
import { FixedClock, NoopLogger, unwrap } from "@kerniflow/kernel";
import { TimeService } from "@kerniflow/kernel";

describe("ListInvoicesUseCase", () => {
  let repo: FakeInvoiceRepository;
  let useCase: ListInvoicesUseCase;

  beforeEach(() => {
    repo = new FakeInvoiceRepository();
    const clock = new FixedClock(new Date("2025-01-04T00:00:00.000Z"));
    const timeService = new TimeService(clock, {
      async getTenantTimeZone() {
        return "UTC";
      },
    });
    useCase = new ListInvoicesUseCase({
      logger: new NoopLogger(),
      invoiceRepo: repo,
      timeService,
    });
  });

  it("filters by status", async () => {
    const inv1 = InvoiceAggregate.createDraft({
      id: "inv-1",
      tenantId: "tenant-1",
      customerId: "cust",
      currency: "USD",
      lineItems: [{ id: "l1", description: "A", qty: 1, unitPriceCents: 100 }],
      createdAt: new Date(),
    });
    inv1.status = "ISSUED";
    const inv2 = InvoiceAggregate.createDraft({
      id: "inv-2",
      tenantId: "tenant-1",
      customerId: "cust",
      currency: "USD",
      lineItems: [{ id: "l2", description: "B", qty: 2, unitPriceCents: 200 }],
      createdAt: new Date(),
    });
    repo.invoices = [inv1, inv2];

    const result = await useCase.execute({ status: "ISSUED" }, { tenantId: "tenant-1" });
    const dto = unwrap(result);
    expect(dto.items).toHaveLength(1);
    expect(dto.items[0].id).toBe("inv-1");
  });
});
