# Backend Idempotency Audit

- **Persistence models**
  - `packages/data/prisma/schema/95_automation.prisma` → `IdempotencyKey`: `id`, `tenantId?`, `actionKey`, `key`, `responseJson?`, `statusCode?`, timestamps; unique on `(tenantId, actionKey, key)`; no user scoping or TTL/cleanup.
  - `packages/data/prisma/schema/60_billing.prisma` → `InvoiceEmailDelivery`: includes `idempotencyKey` with unique `(tenantId, idempotencyKey)`; used to dedupe invoice email sends.

- **Implementations/behavior**
  - `services/api/src/shared/infrastructure/persistence/prisma-idempotency.adapter.ts`: `IdempotencyPort` with `get/store` returning/storing parsed response JSON and optional status code; used by several modules.
  - `services/api/src/shared/idempotency/IdempotencyInterceptor.ts`: Nest interceptor that reads `X-Idempotency-Key` + `tenantId` from request body, uses `actionKey = request.route.path`, short-circuits duplicates with HTTP 200 and stored JSON; inserts new records on success. No request hash, no IN_PROGRESS state, requires tenantId in body (GETs without body are skipped).
  - `services/api/src/shared/idempotency/IdempotencyGuard.ts`: defined but not used by controllers.
  - `services/api/src/shared/adapters/idempotency/db-idempotency.adapter.ts`: wraps kernel `IdempotencyPort.run` against `IdempotencyKey` table; not wired into modules.
  - `services/api/src/modules/ai-copilot/infrastructure/idempotency/in-memory-idempotency.adapter.ts`: per-tenant in-memory `checkAndInsert`; `StreamCopilotChatUseCase` returns 409 `"Duplicate idempotency key"` when `checkAndInsert` is false; no stored response/replay, no persistence.

- **Endpoints using idempotency today**
  - **Auth** (`services/api/src/modules/identity/...`): `SignUpUseCase` caches responses via `IdempotencyPort` (action `identity.sign_up`, tenantId = null); controller defaults to `"default"` idempotency key if header/body missing. `SignInUseCase` optionally caches on provided key. Other auth endpoints lack idempotency.
  - **Expenses** (`/expenses` POST): controller wrapped in `IdempotencyInterceptor`; `CreateExpenseUseCase` uses `PrismaIdempotencyAdapter` with action `expenses.create` scoped by tenant. Duplicate keys return cached expense body (200) not 409.
  - **Tax** (`/tax/*`): controller-level `IdempotencyInterceptor` on all routes; relies on `tenantId` in body, so GETs without body skip. No explicit use-case idempotency beyond natural uniqueness (e.g., `lock-tax-snapshot` returns existing snapshot).
  - **Customization** (`/customization/custom-fields` POST/PUT, `/customization/layouts/:entityType` PUT): controllers accept `X-Idempotency-Key`; `CustomizationService` uses `PrismaIdempotencyAdapter` to return stored bodies for duplicates.
  - **Invoices**: `SendInvoiceUseCase` dedupes via `InvoiceEmailDelivery` unique `(tenantId, idempotencyKey)`; replays existing delivery status. Other invoice mutations (create/update/finalize/cancel/payment) do not use idempotency keys at the API layer.
  - **Copilot streaming** (`/copilot/chat`): requires `X-Idempotency-Key`; duplicate keys immediately return 409 rather than replaying prior response; uses in-memory store only.

- **Scope & gaps**
  - Idempotency scoped by tenantId (userId not included); sign-up uses tenantId = null, copilot uses tenantId + key in-memory.
  - No request hash/mismatch detection, no in-progress signaling or Retry-After support, no TTL cleanup.
  - 409 is currently used only by the copilot stream duplicate check; other duplicate paths return 200 with cached JSON.
