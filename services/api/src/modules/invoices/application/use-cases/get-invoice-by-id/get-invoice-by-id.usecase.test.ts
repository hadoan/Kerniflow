import { beforeEach, describe, expect, it } from "vitest";
import { GetInvoiceByIdUseCase } from "./get-invoice-by-id.usecase";
import { FakeInvoiceRepository } from "../../../testkit/fakes/fake-invoice-repo";
import { InvoiceAggregate } from "../../../domain/invoice.aggregate";
import { NoopLogger, NotFoundError, unwrap, isErr } from "@corely/kernel";

describe("GetInvoiceByIdUseCase", () => {
  let useCase: GetInvoiceByIdUseCase;
  let repo: FakeInvoiceRepository;

  beforeEach(() => {
    repo = new FakeInvoiceRepository();
    useCase = new GetInvoiceByIdUseCase({ logger: new NoopLogger(), invoiceRepo: repo });
  });

  it("returns invoice for tenant", async () => {
    const invoice = InvoiceAggregate.createDraft({
      id: "inv-1",
      tenantId: "tenant-1",
      customerPartyId: "cust-1",
      currency: "USD",
      lineItems: [{ id: "line-1", description: "Item", qty: 1, unitPriceCents: 1000 }],
      createdAt: new Date(),
    });
    await repo.save("tenant-1", invoice);

    const result = await useCase.execute({ invoiceId: invoice.id }, { tenantId: "tenant-1" });
    const dto = unwrap(result).invoice;

    expect(dto.id).toBe(invoice.id);
    expect(dto.lineItems[0].description).toBe("Item");
  });

  it("returns not found when invoice is missing", async () => {
    const result = await useCase.execute({ invoiceId: "missing" }, { tenantId: "tenant-1" });

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(NotFoundError);
    }
  });
});
