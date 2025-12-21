import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResendInvoiceEmailSenderAdapter } from "../resend-invoice-email-sender.adapter";
import type { Resend } from "resend";
import { Resend as ResendClass } from "resend";

// Mock Resend module
vi.mock("resend", () => {
  return {
    Resend: vi.fn(),
  };
});

describe("ResendInvoiceEmailSenderAdapter", () => {
  let adapter: ResendInvoiceEmailSenderAdapter;
  let mockResendInstance: {
    emails: {
      send: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    // Setup mock Resend instance
    mockResendInstance = {
      emails: {
        send: vi.fn(),
      },
    };

    // Mock the Resend constructor to return our mock instance
    const ResendMock = vi.mocked(ResendClass);
    ResendMock.mockImplementation(() => mockResendInstance as unknown as Resend);

    // Set required env vars
    process.env.RESEND_API_KEY = "test-api-key";
    process.env.RESEND_FROM = "Test Company <test@example.com>";
    process.env.RESEND_REPLY_TO = "support@example.com";

    adapter = new ResendInvoiceEmailSenderAdapter();
  });

  it("sends email with correct parameters", async () => {
    // Arrange
    mockResendInstance.emails.send.mockResolvedValue({
      data: { id: "email-123" },
      error: null,
    });

    // Act
    const result = await adapter.sendInvoiceEmail({
      tenantId: "tenant-1",
      invoiceId: "inv-1",
      to: ["customer@example.com"],
      subject: "Invoice INV-001",
      html: "<h1>Invoice</h1>",
      text: "Invoice",
      idempotencyKey: "key-123",
    });

    // Assert
    const call = mockResendInstance.emails.send.mock.calls[0];
    expect(call[0].from).toBe("Test Company <test@example.com>");
    expect(call[0].to).toEqual(["customer@example.com"]);
    expect(call[0].subject).toBe("Invoice INV-001");
    expect(call[0].html).toBe("<h1>Invoice</h1>");
    expect(call[0].text).toBe("Invoice");
    expect(call[0].replyTo).toBe("support@example.com");
    expect(call[1]).toEqual({
      idempotencyKey: "key-123",
    });

    expect(result).toEqual({
      provider: "resend",
      providerMessageId: "email-123",
    });
  });

  it("includes cc and bcc when provided", async () => {
    // Arrange
    mockResendInstance.emails.send.mockResolvedValue({
      data: { id: "email-123" },
      error: null,
    });

    // Act
    await adapter.sendInvoiceEmail({
      tenantId: "tenant-1",
      invoiceId: "inv-1",
      to: ["customer@example.com"],
      cc: ["manager@example.com"],
      bcc: ["archive@example.com"],
      subject: "Invoice INV-001",
      html: "<h1>Invoice</h1>",
      text: "Invoice",
      idempotencyKey: "key-123",
    });

    // Assert
    const call = mockResendInstance.emails.send.mock.calls[0];
    expect(call[0].cc).toEqual(["manager@example.com"]);
    expect(call[0].bcc).toEqual(["archive@example.com"]);
  });

  it("includes attachments when provided", async () => {
    // Arrange
    mockResendInstance.emails.send.mockResolvedValue({
      data: { id: "email-123" },
      error: null,
    });

    // Act
    await adapter.sendInvoiceEmail({
      tenantId: "tenant-1",
      invoiceId: "inv-1",
      to: ["customer@example.com"],
      subject: "Invoice INV-001",
      html: "<h1>Invoice</h1>",
      text: "Invoice",
      attachments: [
        {
          filename: "invoice.pdf",
          path: "https://example.com/invoice.pdf",
        },
      ],
      idempotencyKey: "key-123",
    });

    // Assert
    const call = mockResendInstance.emails.send.mock.calls[0];
    expect(call[0].attachments).toEqual([
      {
        filename: "invoice.pdf",
        path: "https://example.com/invoice.pdf",
      },
    ]);
  });

  it("includes correlation ID in headers when provided", async () => {
    // Arrange
    mockResendInstance.emails.send.mockResolvedValue({
      data: { id: "email-123" },
      error: null,
    });

    // Act
    await adapter.sendInvoiceEmail({
      tenantId: "tenant-1",
      invoiceId: "inv-1",
      to: ["customer@example.com"],
      subject: "Invoice INV-001",
      html: "<h1>Invoice</h1>",
      text: "Invoice",
      correlationId: "corr-123",
      idempotencyKey: "key-123",
    });

    // Assert
    const call = mockResendInstance.emails.send.mock.calls[0];
    expect(call[0].headers).toEqual({
      "X-Correlation-ID": "corr-123",
    });
  });

  it("throws error when Resend API returns error", async () => {
    // Arrange
    mockResendInstance.emails.send.mockResolvedValue({
      data: null,
      error: { message: "Invalid API key" },
    });

    // Act & Assert
    await expect(
      adapter.sendInvoiceEmail({
        tenantId: "tenant-1",
        invoiceId: "inv-1",
        to: ["customer@example.com"],
        subject: "Invoice INV-001",
        html: "<h1>Invoice</h1>",
        text: "Invoice",
        idempotencyKey: "key-123",
      })
    ).rejects.toThrow("Resend API error: Invalid API key");
  });

  it("throws error when Resend API does not return email ID", async () => {
    // Arrange
    mockResendInstance.emails.send.mockResolvedValue({
      data: {},
      error: null,
    });

    // Act & Assert
    await expect(
      adapter.sendInvoiceEmail({
        tenantId: "tenant-1",
        invoiceId: "inv-1",
        to: ["customer@example.com"],
        subject: "Invoice INV-001",
        html: "<h1>Invoice</h1>",
        text: "Invoice",
        idempotencyKey: "key-123",
      })
    ).rejects.toThrow("Resend API did not return an email ID");
  });

  it("throws error when RESEND_API_KEY is not set", () => {
    // Arrange
    delete process.env.RESEND_API_KEY;

    // Act & Assert
    expect(() => new ResendInvoiceEmailSenderAdapter()).toThrow(
      "RESEND_API_KEY environment variable is required"
    );
  });

  it("uses default FROM address when RESEND_FROM is not set", async () => {
    // Arrange
    delete process.env.RESEND_FROM;
    const adapterWithDefaults = new ResendInvoiceEmailSenderAdapter();

    mockResendInstance.emails.send.mockResolvedValue({
      data: { id: "email-123" },
      error: null,
    });

    // Act
    await adapterWithDefaults.sendInvoiceEmail({
      tenantId: "tenant-1",
      invoiceId: "inv-1",
      to: ["customer@example.com"],
      subject: "Invoice INV-001",
      html: "<h1>Invoice</h1>",
      text: "Invoice",
      idempotencyKey: "key-123",
    });

    // Assert
    const call = mockResendInstance.emails.send.mock.calls[0];
    expect(call[0].from).toBe("Qansa Billing <billing@example.com>");
  });
});
