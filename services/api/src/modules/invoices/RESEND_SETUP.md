# Resend Invoice Email Integration

This document describes how to set up and use the Resend integration for sending invoice emails.

## Overview

The invoice sending feature uses:

- **Resend** as the email provider
- **Outbox pattern** for reliable delivery
- **Webhook verification** for delivery status updates
- **Idempotency** to prevent duplicate sends

## Prerequisites

1. **Create a Resend account** at [https://resend.com](https://resend.com)
2. **Verify your sending domain** in the Resend dashboard
3. **Create an API key** in Resend dashboard → API Keys
4. **Set up a webhook endpoint** (optional but recommended):
   - In Resend dashboard → Webhooks
   - Add endpoint: `https://yourdomain.com/webhooks/resend`
   - Select events: `email.delivered`, `email.bounced`, `email.delivery_delayed`, `email.failed`
   - Copy the signing secret

## Environment Variables

Add the following to your `.env` file:

```bash
# Required
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Recommended
RESEND_FROM="Your Company <billing@yourdomain.com>"
RESEND_REPLY_TO="support@yourdomain.com"

# Optional (for webhook verification)
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### Variable Descriptions

- **RESEND_API_KEY** (required): Your Resend API key
- **RESEND_FROM** (optional): The sender email address and name. Defaults to `"Qansa Billing <billing@example.com>"`
- **RESEND_REPLY_TO** (optional): Reply-to email address
- **RESEND_WEBHOOK_SECRET** (optional): Webhook signing secret from Resend. If not set, webhook signature verification is skipped (NOT recommended for production)

## Database Migration

Before using the feature, run the Prisma migration to create the `InvoiceEmailDelivery` table:

```bash
cd packages/data
npx prisma migrate dev
# Or for production:
npx prisma migrate deploy
```

This creates:

- `InvoiceEmailDelivery` table for tracking email deliveries
- `DeliveryStatus` enum: QUEUED, SENT, DELIVERED, BOUNCED, FAILED, DELAYED

## Architecture

### Flow

1. **User action**: HTTP `POST /invoices/:id/send` or AI tool calls `invoice.send`
2. **Use case**: `SendInvoiceUseCase` validates, creates delivery record with status `QUEUED`, writes to outbox
3. **Worker**: `InvoiceEmailRequestedHandler` picks up outbox event, sends email via Resend, updates status to `SENT`
4. **Webhook**: Resend sends delivery updates → `ResendWebhookController` updates delivery status

### Components

#### API Service

- **Contract**: `packages/contracts/src/invoices/send-invoice.schema.ts`
  - Input: invoiceId, to, cc?, bcc?, message?, attachPdf?, idempotencyKey?, locale?
  - Output: deliveryId, status

- **Use Case**: `SendInvoiceUseCase`
  - Validates invoice exists and is sendable (not DRAFT or CANCELED)
  - Enforces idempotency via `idempotencyKey`
  - Creates delivery record
  - Queues outbox event `invoice.email.requested`

- **HTTP Controller**: `POST /invoices/:id/send`
  - Thin adapter calling SendInvoiceUseCase
  - Returns: `{ deliveryId, status }`

- **Webhook Controller**: `POST /webhooks/resend`
  - Verifies Svix signature
  - Maps Resend events to delivery statuses
  - Updates `InvoiceEmailDelivery` by `providerMessageId`

#### Worker Service

- **Handler**: `InvoiceEmailRequestedHandler`
  - Processes `invoice.email.requested` outbox events
  - Loads invoice data, builds email HTML
  - Sends email via Resend SDK with idempotency key
  - Updates delivery status to SENT or FAILED

## Usage

### HTTP API

```bash
POST /invoices/inv_123/send
Content-Type: application/json

{
  "to": "customer@example.com",
  "cc": ["manager@example.com"],
  "message": "Thank you for your business!",
  "attachPdf": false
}
```

Response:

```json
{
  "deliveryId": "del_xyz",
  "status": "QUEUED"
}
```

### AI Tool

The AI copilot can send invoices using the `invoice.send` tool:

```
AI: "I'll send invoice INV-001 to customer@example.com"
→ Calls invoice.send tool
→ Returns delivery ID and status
```

## Idempotency

Duplicate sends are prevented via idempotency keys:

1. **Automatic**: System generates key as `invoice-send/{invoiceId}/{sha256(to).slice(0,16)}`
2. **Manual**: Client provides `idempotencyKey` in request

If a delivery with the same `(tenantId, idempotencyKey)` exists, the existing delivery is returned instead of creating a new one.

Resend also respects idempotency keys, so retrying a failed outbox event won't send duplicate emails.

## Delivery Statuses

| Status      | Description                                     |
| ----------- | ----------------------------------------------- |
| `QUEUED`    | Delivery record created, waiting for worker     |
| `SENT`      | Email sent to Resend successfully               |
| `DELIVERED` | Email delivered to recipient (webhook update)   |
| `BOUNCED`   | Email bounced or recipient complained (webhook) |
| `DELAYED`   | Delivery delayed (webhook update)               |
| `FAILED`    | Failed to send (worker error)                   |

## Monitoring

### Check delivery status

Query the `InvoiceEmailDelivery` table:

```sql
SELECT id, status, to, provider_message_id, last_error, created_at
FROM "InvoiceEmailDelivery"
WHERE invoice_id = 'inv_123'
ORDER BY created_at DESC;
```

### Worker logs

The worker logs outbox event processing:

```
Publishing outbox event: invoice.email.requested {...}
Updated delivery status for email re_abc123 to DELIVERED
```

### Webhook logs

The webhook controller logs status updates:

```
Updated delivery status for email re_abc123 to DELIVERED
```

## Testing

### Manual testing (without database)

1. Start the API service: `cd services/api && pnpm dev`
2. Start the worker service: `cd services/worker && pnpm dev`
3. Send a test invoice (requires valid invoice in DB)
4. Check worker logs for email sending
5. Use Resend dashboard to see sent emails

### Webhook testing

Use tools like [ngrok](https://ngrok.com/) to expose localhost:

```bash
ngrok http 3000
# Use ngrok URL in Resend webhook settings
# Test with Resend's webhook testing tool
```

## Troubleshooting

### Email not sending

1. Check worker is running and processing outbox events
2. Check `RESEND_API_KEY` is set correctly
3. Check outbox events: `SELECT * FROM "OutboxEvent" WHERE status = 'FAILED'`
4. Check delivery records: `SELECT * FROM "InvoiceEmailDelivery" WHERE status = 'FAILED'`
5. Review `lastError` field in delivery record

### Webhook not working

1. Verify webhook endpoint is publicly accessible
2. Check `RESEND_WEBHOOK_SECRET` is set correctly
3. Check API logs for webhook verification errors
4. Test webhook using Resend dashboard webhook testing tool

### Duplicate emails

- If using custom `idempotencyKey`, ensure it's unique per send attempt
- Check `InvoiceEmailDelivery` table for duplicate records
- Resend's idempotency window is 24 hours

## Future Enhancements

- [ ] React Email templates for richer formatting
- [ ] Multi-language email subjects and content
- [ ] PDF attachment generation and signing
- [ ] Email delivery analytics dashboard
- [ ] Retry policy for failed deliveries
- [ ] Customer-specific email customization
- [ ] Email preview before sending
