import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResendWebhookController } from "../resend-webhook.controller";
import { FakeInvoiceEmailDeliveryRepository } from "../../../testkit/fakes/fake-invoice-email-delivery-repo";
import type { Request, Response } from "express";
import type { Resend } from "resend";
import { Resend as ResendClass } from "resend";

// Mock Resend module
vi.mock("resend", () => {
  return {
    Resend: vi.fn(),
  };
});

describe("ResendWebhookController", () => {
  let controller: ResendWebhookController;
  let deliveryRepo: FakeInvoiceEmailDeliveryRepository;
  let mockResendInstance: {
    webhooks: {
      verify: ReturnType<typeof vi.fn>;
    };
  };
  let mockRequest: Partial<Request & { rawBody?: Buffer }>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    deliveryRepo = new FakeInvoiceEmailDeliveryRepository();

    // Setup mock Resend instance
    mockResendInstance = {
      webhooks: {
        verify: vi.fn(),
      },
    };

    // Mock the Resend constructor
    const ResendMock = vi.mocked(ResendClass);
    ResendMock.mockImplementation(() => mockResendInstance as unknown as Resend);

    // Set env vars
    process.env.RESEND_API_KEY = "test-api-key";
    process.env.RESEND_WEBHOOK_SECRET = "test-webhook-secret";

    controller = new ResendWebhookController(deliveryRepo as any);

    // Setup mock request and response
    mockRequest = {
      headers: {
        "svix-id": "msg_123",
        "svix-timestamp": "1234567890",
        "svix-signature": "v1,signature123",
      },
      rawBody: Buffer.from(
        JSON.stringify({
          type: "email.delivered",
          created_at: "2025-01-01T00:00:00.000Z",
          data: {
            email_id: "email-123",
            from: "sender@example.com",
            to: ["recipient@example.com"],
            subject: "Test",
          },
        })
      ),
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  describe("webhook verification", () => {
    it("verifies webhook signature when secret is configured", async () => {
      // Arrange
      mockResendInstance.webhooks.verify.mockReturnValue({
        type: "email.delivered",
        created_at: "2025-01-01T00:00:00.000Z",
        data: {
          email_id: "email-123",
          from: "sender@example.com",
          to: ["recipient@example.com"],
          subject: "Test",
        },
      });

      // Create a delivery to update
      await deliveryRepo.create({
        id: "delivery-1",
        tenantId: "tenant-1",
        invoiceId: "inv-1",
        to: "customer@example.com",
        status: "SENT",
        provider: "resend",
        providerMessageId: "email-123",
        idempotencyKey: "key-123",
      });

      // Act
      await controller.handleWebhook(mockRequest as any, mockResponse as any);

      // Assert
      expect(mockResendInstance.webhooks.verify).toHaveBeenCalledWith({
        body: mockRequest.rawBody!.toString("utf-8"),
        headers: {
          "svix-id": "msg_123",
          "svix-timestamp": "1234567890",
          "svix-signature": "v1,signature123",
        },
        secret: "test-webhook-secret",
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ received: true });
    });

    it("returns 401 when verification fails", async () => {
      // Arrange
      mockResendInstance.webhooks.verify.mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      // Act
      await controller.handleWebhook(mockRequest as any, mockResponse as any);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Webhook verification failed",
      });
    });

    it("returns 400 when Svix headers are missing", async () => {
      // Arrange
      mockRequest.headers = {};

      // Act
      await controller.handleWebhook(mockRequest as any, mockResponse as any);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Missing Svix headers",
      });
    });

    it("returns 400 when request body is missing", async () => {
      // Arrange
      delete mockRequest.rawBody;

      // Act
      await controller.handleWebhook(mockRequest as any, mockResponse as any);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Missing request body",
      });
    });
  });

  describe("event processing", () => {
    beforeEach(() => {
      // Mock verification to always succeed
      mockResendInstance.webhooks.verify.mockImplementation((arg: any) => {
        const payload = typeof arg === "string" ? arg : arg.body;
        return JSON.parse(payload);
      });
    });

    it("updates delivery status to DELIVERED for email.delivered event", async () => {
      // Arrange
      await deliveryRepo.create({
        id: "delivery-1",
        tenantId: "tenant-1",
        invoiceId: "inv-1",
        to: "customer@example.com",
        status: "SENT",
        provider: "resend",
        providerMessageId: "email-123",
        idempotencyKey: "key-123",
      });

      mockRequest.rawBody = Buffer.from(
        JSON.stringify({
          type: "email.delivered",
          created_at: "2025-01-01T00:00:00.000Z",
          data: {
            email_id: "email-123",
            from: "sender@example.com",
            to: ["recipient@example.com"],
            subject: "Test",
          },
        })
      );

      // Act
      await controller.handleWebhook(mockRequest as any, mockResponse as any);

      // Assert
      const delivery = await deliveryRepo.findByProviderMessageId("email-123");
      expect(delivery?.status).toBe("DELIVERED");
    });

    it("updates delivery status to BOUNCED for email.bounced event", async () => {
      // Arrange
      await deliveryRepo.create({
        id: "delivery-1",
        tenantId: "tenant-1",
        invoiceId: "inv-1",
        to: "customer@example.com",
        status: "SENT",
        provider: "resend",
        providerMessageId: "email-123",
        idempotencyKey: "key-123",
      });

      mockRequest.rawBody = Buffer.from(
        JSON.stringify({
          type: "email.bounced",
          created_at: "2025-01-01T00:00:00.000Z",
          data: {
            email_id: "email-123",
            from: "sender@example.com",
            to: ["recipient@example.com"],
            subject: "Test",
          },
        })
      );

      // Act
      await controller.handleWebhook(mockRequest as any, mockResponse as any);

      // Assert
      const delivery = await deliveryRepo.findByProviderMessageId("email-123");
      expect(delivery?.status).toBe("BOUNCED");
    });

    it("updates delivery status to DELAYED for email.delivery_delayed event", async () => {
      // Arrange
      await deliveryRepo.create({
        id: "delivery-1",
        tenantId: "tenant-1",
        invoiceId: "inv-1",
        to: "customer@example.com",
        status: "SENT",
        provider: "resend",
        providerMessageId: "email-123",
        idempotencyKey: "key-123",
      });

      mockRequest.rawBody = Buffer.from(
        JSON.stringify({
          type: "email.delivery_delayed",
          created_at: "2025-01-01T00:00:00.000Z",
          data: {
            email_id: "email-123",
            from: "sender@example.com",
            to: ["recipient@example.com"],
            subject: "Test",
          },
        })
      );

      // Act
      await controller.handleWebhook(mockRequest as any, mockResponse as any);

      // Assert
      const delivery = await deliveryRepo.findByProviderMessageId("email-123");
      expect(delivery?.status).toBe("DELAYED");
    });

    it("updates delivery status to FAILED for email.failed event", async () => {
      // Arrange
      await deliveryRepo.create({
        id: "delivery-1",
        tenantId: "tenant-1",
        invoiceId: "inv-1",
        to: "customer@example.com",
        status: "SENT",
        provider: "resend",
        providerMessageId: "email-123",
        idempotencyKey: "key-123",
      });

      mockRequest.rawBody = Buffer.from(
        JSON.stringify({
          type: "email.failed",
          created_at: "2025-01-01T00:00:00.000Z",
          data: {
            email_id: "email-123",
            from: "sender@example.com",
            to: ["recipient@example.com"],
            subject: "Test",
          },
        })
      );

      // Act
      await controller.handleWebhook(mockRequest as any, mockResponse as any);

      // Assert
      const delivery = await deliveryRepo.findByProviderMessageId("email-123");
      expect(delivery?.status).toBe("FAILED");
    });

    it("updates delivery status to BOUNCED for email.complained event", async () => {
      // Arrange
      await deliveryRepo.create({
        id: "delivery-1",
        tenantId: "tenant-1",
        invoiceId: "inv-1",
        to: "customer@example.com",
        status: "SENT",
        provider: "resend",
        providerMessageId: "email-123",
        idempotencyKey: "key-123",
      });

      mockRequest.rawBody = Buffer.from(
        JSON.stringify({
          type: "email.complained",
          created_at: "2025-01-01T00:00:00.000Z",
          data: {
            email_id: "email-123",
            from: "sender@example.com",
            to: ["recipient@example.com"],
            subject: "Test",
          },
        })
      );

      // Act
      await controller.handleWebhook(mockRequest as any, mockResponse as any);

      // Assert
      const delivery = await deliveryRepo.findByProviderMessageId("email-123");
      expect(delivery?.status).toBe("BOUNCED");
    });

    it("ignores unknown event types", async () => {
      // Arrange
      await deliveryRepo.create({
        id: "delivery-1",
        tenantId: "tenant-1",
        invoiceId: "inv-1",
        to: "customer@example.com",
        status: "SENT",
        provider: "resend",
        providerMessageId: "email-123",
        idempotencyKey: "key-123",
      });

      mockRequest.rawBody = Buffer.from(
        JSON.stringify({
          type: "email.unknown",
          created_at: "2025-01-01T00:00:00.000Z",
          data: {
            email_id: "email-123",
            from: "sender@example.com",
            to: ["recipient@example.com"],
            subject: "Test",
          },
        })
      );

      // Act
      await controller.handleWebhook(mockRequest as any, mockResponse as any);

      // Assert - status should remain unchanged
      const delivery = await deliveryRepo.findByProviderMessageId("email-123");
      expect(delivery?.status).toBe("SENT");
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it("handles webhook for non-existent delivery gracefully", async () => {
      // Arrange
      mockRequest.rawBody = Buffer.from(
        JSON.stringify({
          type: "email.delivered",
          created_at: "2025-01-01T00:00:00.000Z",
          data: {
            email_id: "non-existent-email",
            from: "sender@example.com",
            to: ["recipient@example.com"],
            subject: "Test",
          },
        })
      );

      // Act & Assert - should not throw
      await controller.handleWebhook(mockRequest as any, mockResponse as any);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });
});
