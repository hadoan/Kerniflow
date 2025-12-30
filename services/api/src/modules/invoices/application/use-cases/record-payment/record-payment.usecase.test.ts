import { beforeEach, describe, expect, it } from "vitest";
import { RecordPaymentUseCase } from "./record-payment.usecase";
import { FakeInvoiceRepository } from "../../../testkit/fakes/fake-invoice-repo";
import { FakeIdGenerator, FixedClock, NoopLogger, unwrap } from "@corely/kernel";
import { InvoiceAggregate } from "../../../domain/invoice.aggregate";

describe("RecordPaymentUseCase", () => {
  let useCase: RecordPaymentUseCase;
  let repo: FakeInvoiceRepository;
  const clock = new FixedClock(new Date("2025-01-03T00:00:00.000Z"));

  beforeEach(() => {
    repo = new FakeInvoiceRepository();
    useCase = new RecordPaymentUseCase({
      logger: new NoopLogger(),
      invoiceRepo: repo,
      idGenerator: new FakeIdGenerator(["pay-1"]),
      clock,
    });
  });

  it("marks invoice paid when payment covers total", async () => {
    const invoice = InvoiceAggregate.createDraft({
      id: "inv-1",
      tenantId: "tenant-1",
      customerPartyId: "cust",
      currency: "USD",
      lineItems: [{ id: "line-1", description: "Work", qty: 1, unitPriceCents: 1000 }],
      createdAt: new Date(),
    });
    const now = clock.now();
    invoice.finalize("INV-1", now, now, { name: "Customer" });
    repo.invoices = [invoice];

    const result = await useCase.execute(
      { invoiceId: invoice.id, amountCents: 1000 },
      { tenantId: "tenant-1" }
    );

    const dto = unwrap(result).invoice;
    expect(dto.status).toBe("PAID");
    expect(dto.totals.paidCents).toBe(1000);
  });
});
