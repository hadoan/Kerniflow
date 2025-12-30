import { beforeEach, describe, expect, it } from "vitest";
import { SendInvoiceUseCase } from "../send-invoice.usecase";
import { FakeInvoiceRepository } from "../../../../testkit/fakes/fake-invoice-repo";
import { FakeInvoiceEmailDeliveryRepository } from "../../../../testkit/fakes/fake-invoice-email-delivery-repo";
import { FakeOutbox } from "../../../../testkit/fakes/fake-outbox";
import { InvoiceAggregate } from "../../../../domain/invoice.aggregate";
import { FakeIdGenerator, NoopLogger, unwrap, isErr } from "@corely/kernel";

describe("SendInvoiceUseCase", () => {
  let invoiceRepo: FakeInvoiceRepository;
  let deliveryRepo: FakeInvoiceEmailDeliveryRepository;
  let outbox: FakeOutbox;
  let idGenerator: FakeIdGenerator;
  let useCase: SendInvoiceUseCase;

  beforeEach(() => {
    invoiceRepo = new FakeInvoiceRepository();
    deliveryRepo = new FakeInvoiceEmailDeliveryRepository();
    outbox = new FakeOutbox();
    idGenerator = new FakeIdGenerator(["delivery-1", "delivery-2", "delivery-3"]);

    useCase = new SendInvoiceUseCase({
      logger: new NoopLogger(),
      invoiceRepo,
      deliveryRepo,
      outbox,
      idGenerator,
    });
  });

  describe("happy path", () => {
    it("creates delivery record with QUEUED status and writes outbox event", async () => {
      // Arrange: Create an issued invoice
      const invoice = InvoiceAggregate.createDraft({
        id: "inv-1",
        tenantId: "tenant-1",
        customerPartyId: "cust-1",
        currency: "USD",
        lineItems: [{ id: "line-1", description: "Work", qty: 1, unitPriceCents: 10000 }],
        createdAt: new Date(),
      });
      invoice.finalize("INV-001", new Date(), new Date(), { name: "Customer" });
      invoiceRepo.invoices = [invoice];

      // Act
      const result = await useCase.execute(
        {
          invoiceId: "inv-1",
          to: "customer@example.com",
          message: "Thank you!",
          attachPdf: false,
        },
        { tenantId: "tenant-1", correlationId: "corr-123" }
      );

      // Assert
      const output = unwrap(result);
      expect(output.deliveryId).toBe("delivery-1");
      expect(output.status).toBe("QUEUED");

      // Check delivery record was created
      const delivery = await deliveryRepo.findById("tenant-1", "delivery-1");
      expect(delivery).toBeDefined();
      expect(delivery?.status).toBe("QUEUED");
      expect(delivery?.to).toBe("customer@example.com");
      expect(delivery?.provider).toBe("resend");
      expect(delivery?.idempotencyKey).toMatch(/^invoice-send\/inv-1\//);

      // Check outbox event was written
      const events = outbox.getEventsByType("invoice.email.requested");
      expect(events).toHaveLength(1);
      expect(events[0].tenantId).toBe("tenant-1");
      expect(events[0].correlationId).toBe("corr-123");

      const payload = events[0].payload as any;
      expect(payload.deliveryId).toBe("delivery-1");
      expect(payload.invoiceId).toBe("inv-1");
      expect(payload.to).toBe("customer@example.com");
      expect(payload.message).toBe("Thank you!");
      expect(payload.attachPdf).toBe(false);
    });

    it("propagates cc, bcc, and attachPdf to outbox payload", async () => {
      // Arrange
      const invoice = InvoiceAggregate.createDraft({
        id: "inv-1",
        tenantId: "tenant-1",
        customerPartyId: "cust-1",
        currency: "USD",
        lineItems: [{ id: "line-1", description: "Work", qty: 1, unitPriceCents: 1000 }],
        createdAt: new Date(),
      });
      invoice.finalize("INV-001", new Date(), new Date(), { name: "Customer" });
      invoiceRepo.invoices = [invoice];

      // Act
      await useCase.execute(
        {
          invoiceId: "inv-1",
          to: "customer@example.com",
          cc: ["manager@example.com"],
          bcc: ["archive@example.com"],
          attachPdf: true,
        },
        { tenantId: "tenant-1" }
      );

      // Assert
      const events = outbox.getEventsByType("invoice.email.requested");
      const payload = events[0].payload as any;
      expect(payload.cc).toEqual(["manager@example.com"]);
      expect(payload.bcc).toEqual(["archive@example.com"]);
      expect(payload.attachPdf).toBe(true);
    });
  });

  describe("validation errors", () => {
    it("returns NotFoundError when invoice does not exist", async () => {
      const result = await useCase.execute(
        { invoiceId: "non-existent", to: "customer@example.com", attachPdf: false },
        { tenantId: "tenant-1" }
      );

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe("NOT_FOUND");
        expect(result.error.message).toBe("Invoice not found");
      }
    });

    it("returns ConflictError when invoice is DRAFT", async () => {
      // Arrange: Create draft invoice (not finalized)
      const invoice = InvoiceAggregate.createDraft({
        id: "inv-1",
        tenantId: "tenant-1",
        customerPartyId: "cust-1",
        currency: "USD",
        lineItems: [{ id: "line-1", description: "Work", qty: 1, unitPriceCents: 1000 }],
        createdAt: new Date(),
      });
      invoiceRepo.invoices = [invoice];

      // Act
      const result = await useCase.execute(
        { invoiceId: "inv-1", to: "customer@example.com", attachPdf: false },
        { tenantId: "tenant-1" }
      );

      // Assert
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe("CONFLICT");
        expect(result.error.message).toContain("Cannot send a draft invoice");
      }
    });

    it("returns ConflictError when invoice is CANCELED", async () => {
      // Arrange: Create and cancel invoice
      const invoice = InvoiceAggregate.createDraft({
        id: "inv-1",
        tenantId: "tenant-1",
        customerPartyId: "cust-1",
        currency: "USD",
        lineItems: [{ id: "line-1", description: "Work", qty: 1, unitPriceCents: 1000 }],
        createdAt: new Date(),
      });
      invoice.finalize("INV-001", new Date(), new Date(), { name: "Customer" });
      invoice.cancel(undefined, undefined, new Date());
      invoiceRepo.invoices = [invoice];

      // Act
      const result = await useCase.execute(
        { invoiceId: "inv-1", to: "customer@example.com", attachPdf: false },
        { tenantId: "tenant-1" }
      );

      // Assert
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.code).toBe("CONFLICT");
        expect(result.error.message).toContain("Cannot send a canceled invoice");
      }
    });
  });

  describe("idempotency", () => {
    it("returns existing delivery when called twice with same invoice and recipient", async () => {
      // Arrange
      const invoice = InvoiceAggregate.createDraft({
        id: "inv-1",
        tenantId: "tenant-1",
        customerPartyId: "cust-1",
        currency: "USD",
        lineItems: [{ id: "line-1", description: "Work", qty: 1, unitPriceCents: 1000 }],
        createdAt: new Date(),
      });
      invoice.finalize("INV-001", new Date(), new Date(), { name: "Customer" });
      invoiceRepo.invoices = [invoice];

      // Act: Call twice
      const result1 = await useCase.execute(
        { invoiceId: "inv-1", to: "customer@example.com", attachPdf: false },
        { tenantId: "tenant-1" }
      );
      const result2 = await useCase.execute(
        { invoiceId: "inv-1", to: "customer@example.com", attachPdf: false },
        { tenantId: "tenant-1" }
      );

      // Assert: Same delivery ID returned
      const output1 = unwrap(result1);
      const output2 = unwrap(result2);
      expect(output1.deliveryId).toBe(output2.deliveryId);
      expect(output1.deliveryId).toBe("delivery-1");

      // Only one delivery record created
      expect(deliveryRepo.deliveries).toHaveLength(1);

      // Only one outbox event created
      expect(outbox.getEventsByType("invoice.email.requested")).toHaveLength(1);
    });

    it("respects custom idempotencyKey", async () => {
      // Arrange
      const invoice = InvoiceAggregate.createDraft({
        id: "inv-1",
        tenantId: "tenant-1",
        customerPartyId: "cust-1",
        currency: "USD",
        lineItems: [{ id: "line-1", description: "Work", qty: 1, unitPriceCents: 1000 }],
        createdAt: new Date(),
      });
      invoice.finalize("INV-001", new Date(), new Date(), { name: "Customer" });
      invoiceRepo.invoices = [invoice];

      const customKey = "my-custom-idempotency-key";

      // Act: Call twice with custom key
      const result1 = await useCase.execute(
        {
          invoiceId: "inv-1",
          to: "customer@example.com",
          attachPdf: false,
          idempotencyKey: customKey,
        },
        { tenantId: "tenant-1" }
      );
      const result2 = await useCase.execute(
        {
          invoiceId: "inv-1",
          to: "customer@example.com",
          attachPdf: false,
          idempotencyKey: customKey,
        },
        { tenantId: "tenant-1" }
      );

      // Assert
      const output1 = unwrap(result1);
      const output2 = unwrap(result2);
      expect(output1.deliveryId).toBe(output2.deliveryId);

      const delivery = deliveryRepo.deliveries[0];
      expect(delivery.idempotencyKey).toBe(customKey);
    });

    it("creates separate deliveries for different recipients", async () => {
      // Arrange
      const invoice = InvoiceAggregate.createDraft({
        id: "inv-1",
        tenantId: "tenant-1",
        customerPartyId: "cust-1",
        currency: "USD",
        lineItems: [{ id: "line-1", description: "Work", qty: 1, unitPriceCents: 1000 }],
        createdAt: new Date(),
      });
      invoice.finalize("INV-001", new Date(), new Date(), { name: "Customer" });
      invoiceRepo.invoices = [invoice];

      // Act: Send to different recipients
      const result1 = await useCase.execute(
        { invoiceId: "inv-1", to: "customer1@example.com", attachPdf: false },
        { tenantId: "tenant-1" }
      );
      const result2 = await useCase.execute(
        { invoiceId: "inv-1", to: "customer2@example.com", attachPdf: false },
        { tenantId: "tenant-1" }
      );

      // Assert: Different delivery IDs
      const output1 = unwrap(result1);
      const output2 = unwrap(result2);
      expect(output1.deliveryId).not.toBe(output2.deliveryId);

      // Two delivery records created
      expect(deliveryRepo.deliveries).toHaveLength(2);

      // Two outbox events created
      expect(outbox.getEventsByType("invoice.email.requested")).toHaveLength(2);
    });
  });
});
