# Resend Invoice Email Integration - Test Suite Summary

## Overview

Comprehensive test suite for the Resend invoice email sending feature, ensuring reliability, idempotency, and proper error handling.

## Test Results

✅ **All 27 tests passing**

## Test Coverage

### 1. SendInvoiceUseCase Tests (8 tests)

**Location**: `application/use-cases/send-invoice/__tests__/send-invoice.usecase.spec.ts`

**Happy Path:**

- ✅ Creates delivery record with QUEUED status and writes outbox event
- ✅ Propagates cc, bcc, and attachPdf to outbox payload

**Validation Errors:**

- ✅ Returns NotFoundError when invoice does not exist
- ✅ Returns ConflictError when invoice is DRAFT
- ✅ Returns ConflictError when invoice is CANCELED

**Idempotency:**

- ✅ Returns existing delivery when called twice with same invoice and recipient
- ✅ Respects custom idempotencyKey
- ✅ Creates separate deliveries for different recipients

### 2. ResendInvoiceEmailSenderAdapter Tests (8 tests)

**Location**: `infrastructure/resend/__tests__/resend-invoice-email-sender.adapter.spec.ts`

**Email Sending:**

- ✅ Sends email with correct parameters
- ✅ Includes cc and bcc when provided
- ✅ Includes attachments when provided
- ✅ Includes correlation ID in headers when provided

**Error Handling:**

- ✅ Throws error when Resend API returns error
- ✅ Throws error when Resend API does not return email ID
- ✅ Throws error when RESEND_API_KEY is not set
- ✅ Uses default FROM address when RESEND_FROM is not set

### 3. ResendWebhookController Tests (11 tests)

**Location**: `adapters/webhooks/__tests__/resend-webhook.controller.spec.ts`

**Webhook Verification:**

- ✅ Verifies webhook signature when secret is configured
- ✅ Returns 401 when verification fails
- ✅ Returns 400 when Svix headers are missing
- ✅ Returns 400 when request body is missing

**Event Processing:**

- ✅ Updates delivery status to DELIVERED for email.delivered event
- ✅ Updates delivery status to BOUNCED for email.bounced event
- ✅ Updates delivery status to DELAYED for email.delivery_delayed event
- ✅ Updates delivery status to FAILED for email.failed event
- ✅ Updates delivery status to BOUNCED for email.complained event
- ✅ Ignores unknown event types
- ✅ Handles webhook for non-existent delivery gracefully

## Test Infrastructure

### Fake Implementations Created

1. **FakeInvoiceEmailDeliveryRepository** ([testkit/fakes/fake-invoice-email-delivery-repo.ts](testkit/fakes/fake-invoice-email-delivery-repo.ts))
   - In-memory implementation of InvoiceEmailDeliveryRepoPort
   - Supports all repository operations for testing

2. **FakeOutbox** ([testkit/fakes/fake-outbox.ts](testkit/fakes/fake-outbox.ts))
   - In-memory outbox for testing event publishing
   - Provides helper methods for test assertions

3. **FakeInvoiceEmailSender** ([testkit/fakes/fake-invoice-email-sender.ts](testkit/fakes/fake-invoice-email-sender.ts))
   - Mock email sender with failure simulation
   - Captures sent emails for verification

4. **FakeInvoiceEmailContextQuery** ([testkit/fakes/fake-invoice-email-context-query.ts](testkit/fakes/fake-invoice-email-context-query.ts))
   - Mock invoice context query for testing email generation
   - Allows setting test data

## Running Tests

### Run all invoice tests:

```bash
cd services/api
pnpm exec vitest run src/modules/invoices
```

### Run specific test file:

```bash
pnpm exec vitest run src/modules/invoices/application/use-cases/send-invoice/__tests__/send-invoice.usecase.spec.ts
```

### Run tests in watch mode:

```bash
pnpm exec vitest src/modules/invoices
```

## Test Patterns Used

### 1. Arrange-Act-Assert (AAA)

All tests follow the AAA pattern for clarity:

```typescript
// Arrange: Set up test data
const invoice = InvoiceAggregate.createDraft({...});

// Act: Execute the use case
const result = await useCase.execute(input, ctx);

// Assert: Verify the outcome
expect(output.deliveryId).toBe("delivery-1");
```

### 2. Mocking External Dependencies

Tests mock external dependencies (Resend SDK, Prisma) to ensure:

- Tests run without network calls
- Fast execution
- Deterministic results

### 3. Behavior Verification

Tests verify behaviors, not implementation details:

- Correct outbox events created
- Delivery records updated properly
- Idempotency enforced

## Worker Handler Tests

**Location**: `services/worker/src/modules/invoices/__tests__/invoice-email-requested.handler.spec.ts`

Note: Worker tests require different setup due to Prisma mocking. Run separately:

```bash
cd services/worker
pnpm exec vitest run src/modules/invoices
```

## Coverage Goals

### Current Coverage Areas:

✅ Use case business logic
✅ Resend adapter integration
✅ Webhook verification and processing
✅ Error scenarios
✅ Idempotency enforcement

### Not Covered (Integration Tests):

- ⚠️ End-to-end flow with real database
- ⚠️ Actual Resend API calls
- ⚠️ Real webhook signature verification
- ⚠️ Worker processing actual outbox events

These require integration tests with:

- Running PostgreSQL database
- Resend test mode or sandbox
- Webhook testing tools (ngrok, etc.)

## Common Test Scenarios

### Testing Idempotency

```typescript
// Call twice with same parameters
const result1 = await useCase.execute(input, ctx);
const result2 = await useCase.execute(input, ctx);

// Should return same delivery ID
expect(result1.deliveryId).toBe(result2.deliveryId);

// Only one record created
expect(deliveryRepo.deliveries).toHaveLength(1);
```

### Testing Error Handling

```typescript
// Simulate Resend failure
mockResendInstance.emails.send.mockResolvedValue({
  data: null,
  error: { message: "Invalid API key" },
});

// Should throw and update delivery status
await expect(handler.handle(event)).rejects.toThrow();
expect(delivery.status).toBe("FAILED");
```

### Testing Webhook Verification

```typescript
// Mock verification failure
mockResendInstance.webhooks.verify.mockImplementation(() => {
  throw new Error("Invalid signature");
});

// Should return 401
expect(mockResponse.status).toHaveBeenCalledWith(401);
```

## Maintenance

### Adding New Tests

1. Follow existing test structure in `__tests__` folders
2. Use existing fake implementations when possible
3. Follow AAA pattern
4. Test both success and failure paths

### Updating Tests

When changing business logic:

1. Update corresponding tests first (TDD approach)
2. Ensure all tests pass before committing
3. Add new test cases for new behaviors

## Continuous Integration

Tests can be integrated into CI/CD pipeline:

```yaml
# Example GitHub Actions
- name: Run Tests
  run: |
    pnpm exec vitest run src/modules/invoices
```

## Related Documentation

- [RESEND_SETUP.md](RESEND_SETUP.md) - Integration setup guide
- [invoice-email-sender.port.ts](application/ports/invoice-email-sender.port.ts) - Port interfaces
- [SendInvoiceUseCase.ts](application/use-cases/send-invoice/SendInvoiceUseCase.ts) - Use case implementation
