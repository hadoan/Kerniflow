import { beforeEach, describe, expect, it } from "vitest";
import { FinalizeInvoiceUseCase } from "./FinalizeInvoiceUseCase";
import { FakeInvoiceRepository } from "../../../testkit/fakes/fake-invoice-repo";
import { FakeInvoiceNumbering } from "../../../testkit/fakes/fake-numbering";
import { InvoiceAggregate } from "../../../domain/invoice.aggregate";
import { FixedClock, NoopLogger, unwrap } from "@kerniflow/kernel";

describe("FinalizeInvoiceUseCase", () => {
  let repo: FakeInvoiceRepository;
  let numbering: FakeInvoiceNumbering;
  let useCase: FinalizeInvoiceUseCase;
  const clock = new FixedClock(new Date("2025-01-02T00:00:00.000Z"));

  beforeEach(() => {
    repo = new FakeInvoiceRepository();
    numbering = new FakeInvoiceNumbering("INV");
    useCase = new FinalizeInvoiceUseCase({
      logger: new NoopLogger(),
      invoiceRepo: repo,
      numbering,
      clock,
    });
  });

  it("finalizes draft invoice and assigns number", async () => {
    const invoice = InvoiceAggregate.createDraft({
      id: "inv-1",
      tenantId: "tenant-1",
      customerId: "cust",
      currency: "USD",
      lineItems: [{ id: "line-1", description: "Work", qty: 1, unitPriceCents: 1000 }],
      createdAt: new Date(),
    });
    repo.invoices = [invoice];

    const result = await useCase.execute({ invoiceId: invoice.id }, { tenantId: "tenant-1" });
    const dto = unwrap(result).invoice;
    expect(dto.status).toBe("ISSUED");
    expect(dto.number).toBe("INV-000001");
  });
});
