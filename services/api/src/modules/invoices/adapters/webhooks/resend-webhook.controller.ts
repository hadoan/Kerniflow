import { Controller, Post, Req, Res, HttpStatus, type RawBodyRequest } from "@nestjs/common";
import { Request, type Response } from "express";
import { Resend } from "resend";
import { EnvService } from "@corely/config";
import { PrismaInvoiceEmailDeliveryRepoAdapter } from "../../infrastructure/prisma/prisma-invoice-email-delivery-repo.adapter";

type ResendWebhookEvent = {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    [key: string]: unknown;
  };
};

@Controller("webhooks/resend")
export class ResendWebhookController {
  private resend: Resend;
  private webhookSecret: string;

  constructor(
    private readonly deliveryRepo: PrismaInvoiceEmailDeliveryRepoAdapter,
    private readonly envService: EnvService
  ) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is required");
    }

    this.resend = new Resend(apiKey);

    this.webhookSecret = process.env.RESEND_WEBHOOK_SECRET ?? "";
    if (!this.webhookSecret) {
      console.warn("RESEND_WEBHOOK_SECRET not set - webhook verification disabled");
    }
  }

  @Post()
  async handleWebhook(@Req() req: RawBodyRequest<Request>, @Res() res: Response): Promise<void> {
    // Resend uses Svix for webhook verification
    // Headers: svix-id, svix-timestamp, svix-signature
    const svixId = req.headers["svix-id"] as string;
    const svixTimestamp = req.headers["svix-timestamp"] as string;
    const svixSignature = req.headers["svix-signature"] as string;

    if (!svixId || !svixTimestamp || !svixSignature) {
      res.status(HttpStatus.BAD_REQUEST).json({
        error: "Missing Svix headers",
      });
      return;
    }

    // Get raw body for verification
    const rawBody = req.rawBody?.toString("utf-8") ?? "";

    if (!rawBody) {
      res.status(HttpStatus.BAD_REQUEST).json({
        error: "Missing request body",
      });
      return;
    }

    try {
      // Verify webhook signature if secret is configured
      if (this.webhookSecret) {
        const event = this.resend.webhooks.verify({
          body: rawBody,
          headers: {
            "svix-id": svixId,
            "svix-timestamp": svixTimestamp,
            "svix-signature": svixSignature,
          },
          secret: this.webhookSecret,
        } as any) as ResendWebhookEvent;

        await this.processEvent(event);
      } else {
        // If no secret configured, parse body directly (NOT RECOMMENDED FOR PRODUCTION)
        const event = JSON.parse(rawBody) as ResendWebhookEvent;
        await this.processEvent(event);
      }

      res.status(HttpStatus.OK).json({ received: true });
    } catch (error) {
      console.error("Webhook verification failed:", error);
      res.status(HttpStatus.UNAUTHORIZED).json({
        error: "Webhook verification failed",
      });
    }
  }

  private async processEvent(event: ResendWebhookEvent): Promise<void> {
    const emailId = event.data.email_id;

    if (!emailId) {
      console.warn("Webhook event missing email_id:", event.type);
      return;
    }

    // Map Resend event types to our DeliveryStatus
    let status: "DELIVERED" | "BOUNCED" | "FAILED" | "DELAYED" | null = null;

    switch (event.type) {
      case "email.delivered":
        status = "DELIVERED";
        break;
      case "email.bounced":
      case "email.complained":
        status = "BOUNCED";
        break;
      case "email.delivery_delayed":
        status = "DELAYED";
        break;
      case "email.failed":
        status = "FAILED";
        break;
      default:
        // Ignore unhandled webhook event types
        return;
    }

    if (status) {
      try {
        await this.deliveryRepo.updateStatusByProviderMessageId(emailId, status);
      } catch (error) {
        console.error(`Failed to update delivery status for email ${emailId}:`, error);
      }
    }
  }
}
