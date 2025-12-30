# Error Handling Architecture

## Overview

Corely uses a **systematic, cross-platform error handling system** based on RFC 7807 Problem Details for HTTP APIs. This ensures predictable, consistent error responses across backend, web, and POS clients.

## Core Principles

1. **One standard wire format**: All API errors return ProblemDetails JSON
2. **Trace everything**: Every error includes a correlation ID for support/debugging
3. **Safe by default**: Internal error details are never leaked to clients in production
4. **User-friendly first**: Developers can easily create errors that are safe to show users
5. **Offline-aware**: POS handles errors differently based on connectivity and retry-ability

---

## Wire Format: ProblemDetails

All API error responses follow this structure:

```typescript
interface ProblemDetails {
  // RFC 7807 base fields
  type: string; // "https://errors.corely.com/Invoices:Locked"
  title: string; // "Conflict"
  status: number; // 409
  detail: string; // "This invoice has already been finalized"
  instance: string; // "/api/invoices/123/finalize"

  // Corely extensions
  code: string; // "Invoices:Locked" (stable machine code)
  validationErrors?: Array<{
    // Field-level validation errors
    message: string;
    members: string[]; // ["email"], ["address", "street"]
  }>;
  traceId: string; // "a1b2c3d4-..." (correlation ID)
  data?: Record<string, unknown>; // Safe metadata (never secrets)
}
```

### Error Code Convention

Error codes follow the pattern: `Module:Meaning`

**Examples:**

- `Common:UserFriendly` - Generic user-friendly business logic error
- `Common:ValidationFailed` - Request validation failure
- `Common:NotFound` - Resource not found
- `Invoices:Locked` - Invoice is finalized and cannot be modified
- `Customers:EmailExists` - Customer with this email already exists

---

## Backend: Exception Taxonomy

### Location

- **Contracts**: `packages/contracts/src/errors/` - Wire format types
- **Domain**: `packages/domain/src/errors/` - Framework-agnostic error classes
- **API**: `services/api/src/shared/exceptions/` - NestJS integration

### Error Hierarchy

```typescript
AppError (base)
├── UserFriendlyError      // Status 400, message IS safe to show
├── ValidationFailedError  // Status 400, includes validationErrors[]
├── NotFoundError          // Status 404, message NOT safe (sanitized)
├── ConflictError          // Status 409, message NOT safe
├── UnauthorizedError      // Status 401
├── ForbiddenError         // Status 403
├── ExternalServiceError   // Status 502/503, includes retryable flag
└── UnexpectedError        // Status 500, message NOT safe
```

### Usage Examples

#### User-Friendly Errors (Safe to Show)

```typescript
// Simplest usage
throw new UserFriendlyError("This invoice has already been finalized");

// With custom code
throw new UserFriendlyError("Payment amount cannot exceed invoice total", {
  code: "Invoices:PaymentExceedsTotal",
});
```

#### Validation Errors

```typescript
throw new ValidationFailedError("Validation failed", [
  { message: "Email is required", members: ["email"] },
  { message: "Amount must be positive", members: ["amount"] },
]);
```

#### Not Found / Conflict (NOT Safe - Sanitized in Production)

```typescript
// Internal message for logs, generic message to client
throw new NotFoundError("Invoice ABC-123 not found");
throw new ConflictError("Email john@example.com already exists", {
  code: "Customers:EmailExists",
});
```

### Safe vs Unsafe Errors

| Error Type              | Message Exposed to Client? | When to Use                        |
| ----------------------- | -------------------------- | ---------------------------------- |
| `UserFriendlyError`     | ✅ YES (publicMessage)     | Business logic errors safe to show |
| `ValidationFailedError` | ✅ YES                     | Form/request validation failures   |
| `UnauthorizedError`     | ✅ Generic message         | Auth required/failed               |
| `ForbiddenError`        | ✅ Generic message         | Permission denied                  |
| `NotFoundError`         | ❌ NO (sanitized)          | Resource not found                 |
| `ConflictError`         | ❌ NO (sanitized)          | Duplicates, state conflicts        |
| `ExternalServiceError`  | ❌ NO (sanitized)          | Third-party API failures           |
| `UnexpectedError`       | ❌ NO (sanitized)          | Unexpected system errors           |

---

## Backend: Global Exception Filter

### How It Works

The `ProblemDetailsExceptionFilter` in `services/api/src/shared/exceptions/` catches **ALL** exceptions and converts them to Problem Details:

1. **AppError** → Maps directly using error properties
2. **UseCaseError** (legacy) → Converts to ProblemDetails
3. **Prisma errors** → Maps to business errors with stable codes
   - `P2002` (unique constraint) → 409 Conflict
   - `P2025` (not found) → 404 Not Found
   - `P2003` (foreign key) → 409 Conflict
4. **NestJS HttpException** → Converts with stable codes
5. **Unknown errors** → Sanitized 500 response

### Trace/Correlation IDs

Every request gets a trace ID:

- Extracted from `x-trace-id` header if present
- Generated if not present (UUID format)
- Attached to request object via middleware
- Included in all error responses
- Logged with every error for correlation

### Logging Policy

| Error Type               | Log Level        | Include Stack? |
| ------------------------ | ---------------- | -------------- |
| User-friendly errors     | `warn` or `info` | ❌ NO          |
| Validation errors        | `info`           | ❌ NO          |
| Not found                | `info`           | ❌ NO          |
| Business logic conflicts | `warn`           | ❌ NO          |
| Unexpected/system errors | `error`          | ✅ YES         |

All logs include: `traceId`, `tenantId`, `code`, `status`, HTTP method, URL

---

## Web App: Client-Side Error Handling

### Location

- **Normalizer**: `packages/api-client/src/errors/` - Shared error normalization
- **React Hooks**: `apps/web/src/shared/lib/errors/` - Web-specific helpers

### ApiError Class

The `ApiError` class provides a structured, ergonomic interface for handling errors:

```typescript
class ApiError {
  status: number;
  code: string;
  detail: string;
  validationErrors?: ValidationErrorItem[];
  traceId?: string;
  data?: Record<string, unknown>;
  isNetworkError: boolean;

  // Convenience methods
  isValidationError(): boolean;
  isUnauthorized(): boolean;
  isForbidden(): boolean;
  isNotFound(): boolean;
  isConflict(): boolean;
  isServerError(): boolean;
  isRetryable(): boolean;
}
```

### Error Normalization

The `normalizeError()` function converts any error to `ApiError`:

```typescript
import { normalizeError } from "@corely/api-client";

try {
  await apiClient.post("/invoices", data);
} catch (error) {
  const apiError = normalizeError(error);
  console.log(apiError.detail); // User-friendly message
  console.log(apiError.traceId); // For support
}
```

### UX Patterns

#### 1. Toast for Non-Validation Errors

```typescript
import { useApiErrorToast } from "@/shared/lib/errors";

function MyComponent() {
  const showError = useApiErrorToast();

  const handleSubmit = async (data) => {
    try {
      await apiClient.post("/invoices", data);
    } catch (error) {
      showError(error); // Automatically shows toast with trace ID
    }
  };
}
```

#### 2. Form Field Errors

```typescript
import { mapValidationErrorsToForm } from "@/shared/lib/errors";

try {
  await apiClient.post("/customers", formData);
} catch (error) {
  const fieldErrors = mapValidationErrorsToForm(error);
  // { email: "Email is required", name: "Name must be at least 3 characters" }

  Object.entries(fieldErrors).forEach(([field, message]) => {
    form.setError(field, { message });
  });
}
```

#### 3. Custom Error Handling

```typescript
import { ApiError, normalizeError } from "@corely/api-client";

try {
  await apiClient.delete(`/invoices/${id}`);
} catch (error) {
  const apiError = normalizeError(error);

  if (apiError.isNotFound()) {
    // Already deleted, that's fine
    return;
  }

  if (apiError.isConflict()) {
    // Show specific message for conflicts
    toast({ title: "Cannot Delete", description: apiError.detail });
    return;
  }

  // Generic error handling
  showError(error);
}
```

---

## POS (React Native): Offline-Aware Error Handling

### Location

- Shared normalizer from `packages/api-client/src/errors/`
- POS-specific: `apps/pos/src/shared/errors/` (to be implemented)

### Offline-First Rules

POS treats errors differently based on connectivity and error type:

#### Network/Offline Errors

```typescript
if (apiError.isNetworkError || !isOnline) {
  // Queue action for later sync (via packages/offline-rn)
  await offlineQueue.enqueue(action);
  showToast("Queued - will sync when online");
  return;
}
```

#### Validation/Business Rule Errors (400, 409)

```typescript
if (apiError.isValidationError() || apiError.isConflict()) {
  // Do NOT retry - show error to user
  showErrorBanner(apiError.detail, apiError.traceId);
  return; // Let user fix the issue
}
```

#### Transient Server Errors (502, 503, 504)

```typescript
if (apiError.isRetryable()) {
  // Retry with exponential backoff (if idempotent)
  await retryWithBackoff(action);
  showToast("Retrying...");
}
```

### POS UX Components

#### Error Banner with Trace ID

```tsx
<ErrorBanner
  message={apiError.detail}
  traceId={apiError.traceId}
  onCopy={() => Clipboard.setString(apiError.traceId)}
/>
```

The trace ID should be:

- Displayed prominently
- Copyable with one tap
- Included in support requests

---

## HTTP Status → Error Type Mapping

| Status | Error Type                 | Description                     | Auto-Retry?        |
| ------ | -------------------------- | ------------------------------- | ------------------ |
| 400    | Validation / User-Friendly | Bad request, validation failure | ❌                 |
| 401    | Unauthorized               | Auth required/failed            | ❌ (trigger login) |
| 403    | Forbidden                  | Insufficient permissions        | ❌                 |
| 404    | Not Found                  | Resource doesn't exist          | ❌                 |
| 409    | Conflict                   | Duplicate, state conflict       | ❌                 |
| 422    | Unprocessable Entity       | Business rule violation         | ❌                 |
| 429    | Rate Limited               | Too many requests               | ✅ (with backoff)  |
| 500    | Internal Server Error      | Unexpected system error         | ❌                 |
| 502    | Bad Gateway                | Upstream service error          | ✅ (if idempotent) |
| 503    | Service Unavailable        | Temporary unavailability        | ✅ (if idempotent) |
| 504    | Gateway Timeout            | Request timeout                 | ✅ (if idempotent) |

---

## Migration Strategy

### Phase 1: Infrastructure (DONE)

- ✅ Add ProblemDetails contracts
- ✅ Add AppError hierarchy
- ✅ Add global exception filter
- ✅ Add trace ID middleware
- ✅ Add web error normalizer + hooks

### Phase 2: Gradual Adoption

- Convert high-traffic endpoints to use `UserFriendlyError`
- Add Prisma error mapping
- Update validation to use `ValidationFailedError`

### Phase 3: Enforcement

- Add tests for error responses
- Optional: Lint rule to prevent throwing raw `Error` in application layer

---

## Developer Guidelines

### DO:

- ✅ Use `UserFriendlyError` for messages safe to show users
- ✅ Use `ValidationFailedError` for form validation failures
- ✅ Include module-specific error codes (e.g., `Invoices:Locked`)
- ✅ Log traceId with every error
- ✅ Handle 401/403 in auth flow, not in individual components

### DON'T:

- ❌ Throw raw `Error` with sensitive internal details
- ❌ Expose database constraint names or SQL errors to clients
- ❌ Show generic "An error occurred" when you have specific business logic errors
- ❌ Retry validation errors or permission errors

---

## Testing

### Backend Tests

```typescript
describe("UserFriendlyError", () => {
  it("returns ProblemDetails with detail exposed", async () => {
    const response = await request(app).post("/invoices/123/finalize").expect(400);

    expect(response.body).toMatchObject({
      status: 400,
      code: "Invoices:AlreadyFinalized",
      detail: "This invoice has already been finalized",
      traceId: expect.stringMatching(/^[0-9a-f-]{36}$/),
    });
  });
});
```

### Web Tests

```typescript
import { normalizeError } from "@corely/api-client";
import { mapValidationErrorsToForm } from "@/shared/lib/errors";

describe("mapValidationErrorsToForm", () => {
  it("maps validation errors to field names", () => {
    const error = new HttpError("Bad Request", 400, {
      status: 400,
      code: "Common:ValidationFailed",
      validationErrors: [{ message: "Email is required", members: ["email"] }],
    });

    const fieldErrors = mapValidationErrorsToForm(error);
    expect(fieldErrors).toEqual({ email: "Email is required" });
  });
});
```

---

## Troubleshooting

### User Reports "An Error Occurred"

1. Ask for the **trace ID** (should be shown in error message)
2. Search logs for the trace ID
3. Check the full error details, stack trace, and context (tenantId, userId, etc.)

### Errors Not Showing Properly

- Ensure backend global filter is registered: `app.useGlobalFilters(new ProblemDetailsExceptionFilter())`
- Check that error is thrown as `AppError` subclass, not raw `Error`
- Verify `isProblemDetails()` type guard matches response shape

### Tests Failing After Migration

- Update tests to expect ProblemDetails format, not legacy `{ error, message }`
- Use new error classes in test mocks
- Check that trace ID middleware is applied in tests

---

## References

- [RFC 7807: Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc7807)
- [ABP Framework: Exception Handling](https://docs.abp.io/en/abp/latest/Exception-Handling)
