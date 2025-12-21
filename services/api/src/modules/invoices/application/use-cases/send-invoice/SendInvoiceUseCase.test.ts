import { beforeEach, describe, expect, it } from "vitest";
import { SendInvoiceUseCase } from "./SendInvoiceUseCase";
import { FakeInvoiceRepository } from "../../../testkit/fakes/fake-invoice-repo";
import { NoopNotification } from "../../../testkit/fakes/noop-notification";
import { InvoiceAggregate } from "../../../domain/invoice.aggregate";
import { FixedClock, NoopLogger, unwrap } from "@kerniflow/kernel";

describe("SendInvoiceUseCase", () => {
  let repo: FakeInvoiceRepository;
  let notification: NoopNotification;
  let useCase: SendInvoiceUseCase;
  const clock = new FixedClock(new Date("2025-01-02T00:00:00.000Z"));

  beforeEach(() => {
    repo = new FakeInvoiceRepository();
    notification = new NoopNotification();
    useCase = new SendInvoiceUseCase({
      logger: new NoopLogger(),
      invoiceRepo: repo,
      notification,
      clock,
    });
  });

  it("marks invoice as sent and records notification", async () => {
    const invoice = InvoiceAggregate.createDraft({
      id: "inv-1",
      tenantId: "tenant-1",
      customerId: "cust",
      currency: "USD",
      lineItems: [{ id: "line-1", description: "Work", qty: 1, unitPriceCents: 1000 }],
      createdAt: new Date(),
    });
    const now = clock.now();
    invoice.finalize("INV-1", now, now);
    repo.invoices = [invoice];

    const result = await useCase.execute(
      { invoiceId: invoice.id, channel: "email", emailTo: "a@b.com" },
      { tenantId: "tenant-1" }
    );

    const dto = unwrap(result).invoice;
    expect(dto.status).toBe("SENT");
    expect(notification.sent).toHaveLength(1);
  });
});
