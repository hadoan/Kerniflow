import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvoiceEmailRequestedHandler } from "./invoice-email-requested.handler";
import type { OutboxEvent } from "../outbox/event-handler.interface";
import type { Resend } from "resend";

// Mock prisma
const mockPrisma = {
  invoiceEmailDelivery: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  invoice: {
    findFirst: vi.fn(),
  },
};

vi.mock("@kerniflow/data", () => ({
  prisma: mockPrisma,
}));

// Mock Resend
vi.mock("resend", () => {
  return {
    Resend: vi.fn(),
  };
});

describe("InvoiceEmailRequestedHandler", () => {
  let handler: InvoiceEmailRequestedHandler;
  let mockResendInstance: {
    emails: {
      send: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup mock Resend instance
    mockResendInstance = {
      emails: {
        send: vi.fn(),
      },
    };

    // Mock the Resend constructor
    const ResendMock = vi.mocked((await import("resend")).Resend) as unknown as vi.Mock;
    ResendMock.mockImplementation(() => mockResendInstance as unknown as Resend);

    // Set env vars
    process.env.RESEND_API_KEY = "test-api-key";
    process.env.RESEND_FROM = "Test Company <test@example.com>";
    process.env.RESEND_REPLY_TO = "support@example.com";

    handler = new InvoiceEmailRequestedHandler();
  });

  it("has correct event type", () => {
    expect(handler.eventType).toBe("invoice.email.requested");
  });

  it("successfully sends email and updates delivery status", async () => {
    // Arrange
    const event: OutboxEvent = {
      id: "outbox-1",
      tenantId: "tenant-1",
      eventType: "invoice.email.requested",
      payloadJson: JSON.stringify({
        deliveryId: "delivery-1",
        invoiceId: "inv-1",
        to: "customer@example.com",
        message: "Thank you!",
        attachPdf: false,
        idempotencyKey: "key-123",
      }),
      correlationId: "corr-123",
    };

    // Mock delivery record
    mockPrisma.invoiceEmailDelivery.findUnique.mockResolvedValue({
      id: "delivery-1",
      tenantId: "tenant-1",
      invoiceId: "inv-1",
      to: "customer@example.com",
      status: "QUEUED",
      provider: "resend",
      idempotencyKey: "key-123",
    });

    // Mock invoice with lines
    mockPrisma.invoice.findFirst.mockResolvedValue({
      id: "inv-1",
      tenantId: "tenant-1",
      number: "INV-001",
      currency: "USD",
      lines: [
        {
          id: "line-1",
          invoiceId: "inv-1",
          description: "Consulting services",
          qty: 10,
          unitPriceCents: 10000,
        },
      ],
    });

    // Mock Resend API success
    mockResendInstance.emails.send.mockResolvedValue({
      data: { id: "resend-email-123" },
      error: null,
    });

    // Mock delivery update
    mockPrisma.invoiceEmailDelivery.update.mockResolvedValue({
      id: "delivery-1",
      status: "SENT",
      providerMessageId: "resend-email-123",
    });

    // Act
    await handler.handle(event);

    // Assert - Verify Resend was called correctly
    expect(mockResendInstance.emails.send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Test Company <test@example.com>",
        to: ["customer@example.com"],
        subject: "Invoice INV-001 from Your Company",
        html: expect.stringContaining("Invoice INV-001"),
        reply_to: "support@example.com",
        headers: {
          "X-Correlation-ID": "corr-123",
        },
      }),
      {
        idempotencyKey: "key-123",
      }
    );

    // Assert - Verify delivery was updated to SENT
    expect(mockPrisma.invoiceEmailDelivery.update).toHaveBeenCalledWith({
      where: { id: "delivery-1" },
      data: {
        status: "SENT",
        providerMessageId: "resend-email-123",
      },
    });
  });

  it("includes cc and bcc when provided", async () => {
    // Arrange
    const event: OutboxEvent = {
      id: "outbox-1",
      tenantId: "tenant-1",
      eventType: "invoice.email.requested",
      payloadJson: JSON.stringify({
        deliveryId: "delivery-1",
        invoiceId: "inv-1",
        to: "customer@example.com",
        cc: ["manager@example.com"],
        bcc: ["archive@example.com"],
        idempotencyKey: "key-123",
      }),
    };

    mockPrisma.invoiceEmailDelivery.findUnique.mockResolvedValue({
      id: "delivery-1",
    });

    mockPrisma.invoice.findFirst.mockResolvedValue({
      id: "inv-1",
      tenantId: "tenant-1",
      number: "INV-001",
      currency: "USD",
      lines: [{ qty: 1, unitPriceCents: 10000 }],
    });

    mockResendInstance.emails.send.mockResolvedValue({
      data: { id: "resend-email-123" },
      error: null,
    });

    mockPrisma.invoiceEmailDelivery.update.mockResolvedValue({});

    // Act
    await handler.handle(event);

    // Assert
    const sendCall = mockResendInstance.emails.send.mock.calls[0][0];
    expect(sendCall.cc).toEqual(["manager@example.com"]);
    expect(sendCall.bcc).toEqual(["archive@example.com"]);
  });

  it("updates delivery status to FAILED when Resend fails", async () => {
    // Arrange
    const event: OutboxEvent = {
      id: "outbox-1",
      tenantId: "tenant-1",
      eventType: "invoice.email.requested",
      payloadJson: JSON.stringify({
        deliveryId: "delivery-1",
        invoiceId: "inv-1",
        to: "customer@example.com",
        idempotencyKey: "key-123",
      }),
    };

    mockPrisma.invoiceEmailDelivery.findUnique.mockResolvedValue({
      id: "delivery-1",
    });

    mockPrisma.invoice.findFirst.mockResolvedValue({
      id: "inv-1",
      tenantId: "tenant-1",
      number: "INV-001",
      currency: "USD",
      lines: [{ qty: 1, unitPriceCents: 10000 }],
    });

    // Mock Resend API error
    mockResendInstance.emails.send.mockResolvedValue({
      data: null,
      error: { message: "Invalid API key" },
    });

    mockPrisma.invoiceEmailDelivery.update.mockResolvedValue({});

    // Act & Assert
    await expect(handler.handle(event)).rejects.toThrow("Resend API error: Invalid API key");

    // Verify delivery was updated to FAILED
    expect(mockPrisma.invoiceEmailDelivery.update).toHaveBeenCalledWith({
      where: { id: "delivery-1" },
      data: {
        status: "FAILED",
        lastError: "Resend API error: Invalid API key",
      },
    });
  });

  it("throws error when delivery record is not found", async () => {
    // Arrange
    const event: OutboxEvent = {
      id: "outbox-1",
      tenantId: "tenant-1",
      eventType: "invoice.email.requested",
      payloadJson: JSON.stringify({
        deliveryId: "non-existent",
        invoiceId: "inv-1",
        to: "customer@example.com",
        idempotencyKey: "key-123",
      }),
    };

    mockPrisma.invoiceEmailDelivery.findUnique.mockResolvedValue(null);

    // Act & Assert
    await expect(handler.handle(event)).rejects.toThrow("Delivery record not found: non-existent");
  });

  it("throws error when invoice is not found", async () => {
    // Arrange
    const event: OutboxEvent = {
      id: "outbox-1",
      tenantId: "tenant-1",
      eventType: "invoice.email.requested",
      payloadJson: JSON.stringify({
        deliveryId: "delivery-1",
        invoiceId: "non-existent",
        to: "customer@example.com",
        idempotencyKey: "key-123",
      }),
    };

    mockPrisma.invoiceEmailDelivery.findUnique.mockResolvedValue({
      id: "delivery-1",
    });

    mockPrisma.invoice.findFirst.mockResolvedValue(null);

    // Act & Assert
    await expect(handler.handle(event)).rejects.toThrow("Invoice not found: non-existent");
  });

  it("builds email with custom message", async () => {
    // Arrange
    const event: OutboxEvent = {
      id: "outbox-1",
      tenantId: "tenant-1",
      eventType: "invoice.email.requested",
      payloadJson: JSON.stringify({
        deliveryId: "delivery-1",
        invoiceId: "inv-1",
        to: "customer@example.com",
        message: "Custom thank you message!",
        idempotencyKey: "key-123",
      }),
    };

    mockPrisma.invoiceEmailDelivery.findUnique.mockResolvedValue({
      id: "delivery-1",
    });

    mockPrisma.invoice.findFirst.mockResolvedValue({
      id: "inv-1",
      tenantId: "tenant-1",
      number: "INV-001",
      currency: "USD",
      lines: [{ qty: 1, unitPriceCents: 10000 }],
    });

    mockResendInstance.emails.send.mockResolvedValue({
      data: { id: "resend-email-123" },
      error: null,
    });

    mockPrisma.invoiceEmailDelivery.update.mockResolvedValue({});

    // Act
    await handler.handle(event);

    // Assert
    const sendCall = mockResendInstance.emails.send.mock.calls[0][0];
    expect(sendCall.html).toContain("Custom thank you message!");
  });

  it("calculates total amount correctly", async () => {
    // Arrange
    const event: OutboxEvent = {
      id: "outbox-1",
      tenantId: "tenant-1",
      eventType: "invoice.email.requested",
      payloadJson: JSON.stringify({
        deliveryId: "delivery-1",
        invoiceId: "inv-1",
        to: "customer@example.com",
        idempotencyKey: "key-123",
      }),
    };

    mockPrisma.invoiceEmailDelivery.findUnique.mockResolvedValue({
      id: "delivery-1",
    });

    mockPrisma.invoice.findFirst.mockResolvedValue({
      id: "inv-1",
      tenantId: "tenant-1",
      number: "INV-001",
      currency: "USD",
      lines: [
        { qty: 2, unitPriceCents: 5000 }, // $100
        { qty: 3, unitPriceCents: 10000 }, // $300
      ],
    });

    mockResendInstance.emails.send.mockResolvedValue({
      data: { id: "resend-email-123" },
      error: null,
    });

    mockPrisma.invoiceEmailDelivery.update.mockResolvedValue({});

    // Act
    await handler.handle(event);

    // Assert
    const sendCall = mockResendInstance.emails.send.mock.calls[0][0];
    // Total should be $400.00
    expect(sendCall.html).toContain("$400.00");
  });
});
