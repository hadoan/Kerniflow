## Prompt: Implement Systematic Error Handling (Backend + Web + POS)

You are an expert TypeScript/NestJS + React + React Native architect working in the **Corely** monorepo. Implement a **systematic, cross-platform error handling system** inspired by ABP’s “UserFriendlyException” concept, but using **Problem Details** as the standard wire format. This is **infrastructure work**: do not implement domain features (invoices/expenses/etc.), only the error system and integration points.

### Context (repo + runtimes)

- **Backend:** `services/api` (NestJS) (+ optionally `services/worker` if needed for shared error model)
- **Web:** `apps/webs` (Vite + React)
- **POS Android:** `apps/pos` (React Native). POS already has `packages/offline-rn` for offline/queued actions.
- **Shared:** `packages/contracts` (shared types/schemas); `packages/domain` (pure domain concepts; no framework imports)

### Goal

Make errors predictable and consistent across:

1. Backend API responses
2. Web app UX (toasts/forms/routing)
3. POS UX (offline-aware messaging + retry discipline)

A developer should be able to do:

- `throw new UserFriendlyError("hello")`
  …and have the client reliably receive a safe, standardized error payload and show it.

---

## 1) Standard error contract (wire format)

### 1.1 Adopt Problem Details (extended)

All API errors must return a **Problem Details** JSON payload (RFC 7807-style), plus a few extra fields for product needs.

**Base fields:**

- `type` (string, stable URL or identifier)
- `title` (short summary)
- `status` (HTTP status)
- `detail` (human-readable message safe to show)
- `instance` (request path or request id reference)

**Extensions (required in our system):**

- `code` (stable machine code, e.g., `Invoices:Locked`)
- `validationErrors` (array of `{ message, members[] }`, optional)
- `traceId` (correlation id for support/debug)
- `data` (optional safe metadata; never secrets)

### 1.2 Place contract in `packages/contracts`

Create a minimal, dependency-free contract in:

- `packages/contracts/src/errors/problem-details.ts`
- export from `packages/contracts/src/index.ts` (or the existing barrel)

Include:

- Type definitions for `ProblemDetails` and `ValidationErrorItem`
- A tiny runtime helper (optional but useful): a type guard like “looks like ProblemDetails” (no external libs)

**Rules:**

- `packages/contracts` must remain dependency-free and import nothing else.
- Do not put NestJS/React-specific code here.

---

## 2) Backend: Exception taxonomy + global conversion

### 2.1 Introduce a framework-agnostic error base in `packages/domain`

Create a small error hierarchy in:

- `packages/domain/src/errors/*`

Define (conceptually) an `AppError` base with:

- `code` (string)
- `publicMessage` (string | undefined)
- `status` (number defaulted by error type)
- `details` (internal-only string, optional)
- `data` (safe metadata, optional)
- `logLevel` hint (e.g., `info|warn|error`)
- `cause` (optional)

Then define these core errors:

- `UserFriendlyError`
  - simplest usage: `new UserFriendlyError("hello")`
  - defaults: `status=400`, `code="Common:UserFriendly"` (or similar)
  - message is **safe to show** as `detail`

- `ValidationFailedError` (status 400, has `validationErrors[]`)
- `NotFoundError` (status 404)
- `ConflictError` (status 409)
- `UnauthorizedError` (401) / `ForbiddenError` (403)
- `ExternalServiceError` (502/503; includes `retryable` flag if you want)
- `UnexpectedError` (500 fallback, not public)

**Important guardrail:**
Only `UserFriendlyError` (and optionally a small whitelist of “public errors”) may expose `publicMessage` to clients. Everything else should be sanitized in production.

### 2.2 Global exception filter in `services/api`

Implement one global exception handler that converts **any thrown error** into `ProblemDetails`.

Location suggestion:

- `services/api/src/shared/exception/` (or your existing shared infra folder)
  - `problem-details.filter.ts`
  - `exception-mapper.ts` (converter / mapping rules)
  - `trace-id.ts` (correlation helper)

**Converter responsibilities:**

- If error is `AppError`: map directly using its fields.
- If error is NestJS `HttpException`: map to ProblemDetails (prefer stable `code` based on exception type).
- If error is Prisma known request error:
  - map known codes (e.g., unique constraint) to `ConflictError` with stable `code` (module-neutral default is fine)
  - never leak raw Prisma messages to clients

- For unknown errors:
  - return 500 ProblemDetails with generic `title/detail` in prod
  - include more details only in dev/test

### 2.3 Trace/correlation id

Add a request correlation id:

- Accept incoming header if present (e.g., `x-request-id`) or generate one
- Attach to logs and return as `traceId` in ProblemDetails
- Ensure worker jobs can reuse this traceId when triggered from an API request (optional but recommended)

### 2.4 Validation normalization

Wherever request validation happens (DTO/class-validator/zod/etc.), ensure validation failures are converted into **one** canonical shape:

- status 400
- `code="Common:ValidationFailed"`
- `validationErrors[]` includes field paths in `members`

### 2.5 Logging policy

- Business/user-friendly errors: log as `warn` (or `info`) without noisy stack spam
- Unexpected errors: log as `error` with stack
- Always include `traceId`, `tenantId` (server logs only), and request route

### 2.6 Tests (backend)

Add automated tests that prove:

- `UserFriendlyError("hello")` returns ProblemDetails with `detail="hello"` and a `traceId`
- Validation errors always return `validationErrors[]`
- Prisma unique constraint becomes 409 with a stable code
- Unknown exceptions become 500 with sanitized message in prod mode

---

## 3) Web app: unified client-side error normalization (apps/webs)

### 3.1 Centralize HTTP error parsing

In `apps/webs/src/shared/api/` (where your http client lives), implement a single normalization step:

- If response matches `ProblemDetails` (use the shared type guard from `packages/contracts`):
  - return/throw a `ClientApiError` object that contains:
    - `status`, `code`, `detail`, `validationErrors`, `traceId`

- If network error / timeout:
  - use a `code="Common:NetworkError"` and a UX-friendly message

- If 401:
  - trigger your existing auth flow (redirect/login/refresh) consistently

- If 403:
  - show “not allowed” screen/toast consistently

### 3.2 UX patterns

Implement shared UI patterns for errors:

- `useApiErrorToast()` helper: shows toast for non-validation errors
- `mapValidationErrorsToForm()` helper: maps `validationErrors[]` to form field errors (members → input names)
- Ensure you don’t duplicate per-module parsing logic

### 3.3 Developer ergonomics

Provide a simple guideline:

- “If backend throws `UserFriendlyError`, it will show as a toast (or inline if you choose)”
- “If backend throws `ValidationFailedError`, it becomes form field errors”
- “If backend throws unknown errors, it shows generic message + traceId (for support)”

### 3.4 Tests (web)

Add a few tests around the normalizer:

- Parses ProblemDetails
- Handles network error
- Maps validation members to fields

---

## 4) POS Android (React Native): same error model + offline-aware behavior (apps/pos)

### 4.1 Shared contract + normalizer

In `apps/pos/src/shared/api/` (or equivalent), implement the **same** normalization behavior as web, reusing:

- `ProblemDetails` types from `packages/contracts`
- the same rule set for `status/code/detail/validationErrors/traceId`

Do not fork semantics between web and POS—only the UX presentation can differ.

### 4.2 Offline-first rules (must integrate with `packages/offline-rn`)

POS must treat errors differently depending on category:

**When offline or network failure:**

- Do not show scary “failed” messages for actions that can be queued.
- Use your offline infra to queue actions and show “Queued / will sync” state.

**When server returns ProblemDetails with:**

- Validation / business rule (400/409 with stable code):
  - do **not retry** automatically
  - show user-friendly message (from `detail`) and highlight fields if applicable

- Transient server failure (502/503/504):
  - safe to retry with backoff if action is idempotent / has idempotency key
  - surface “Temporary issue, retrying…” UX

### 4.3 POS UX patterns

- Standard error banner/toast component for POS
- A “Support info” affordance that displays `traceId` (copyable) for staff troubleshooting
- Consistent handling for auth failures (401) in POS (re-login flow)

### 4.4 Tests (pos)

- Unit tests for the normalizer
- A small integration test that simulates:
  - offline → queued
  - validation error → shown, not retried
  - 503 → retried (if configured)

---

## 5) Documentation + conventions (must add to docs)

Create a short doc (and keep it crisp) describing:

- The ProblemDetails payload shape used in Corely
- Error code convention (`Module:Meaning`)
- Which errors are safe to show (`UserFriendlyError`)
- Mapping table (error type → HTTP status)
- Logging policy (business vs unexpected)
- Offline POS policy (when to queue, when to fail fast)

Put it somewhere like:

- `docs/architecture/error-handling.md` (or your existing docs structure)

---

## 6) Acceptance criteria (definition of done)

- Backend returns **ProblemDetails** for all errors (no ad-hoc `{ message: ... }`).
- `throw new UserFriendlyError("hello")` results in:
  - consistent payload shape
  - client shows “hello” (web + pos) in the standard way

- Validation errors are consistently structured and mapped to form fields.
- Prisma “known errors” are mapped to stable product-level errors.
- POS offline behavior:
  - network/offline errors queue when appropriate
  - business/validation errors do not retry

- TraceId exists in every error response and is present in logs.

---

## 7) Migration plan (practical, incremental)

1. Add contracts + backend filter + basic `UserFriendlyError`
2. Update a couple representative endpoints to prove it works
3. Roll the web normalizer + replace scattered error parsing
4. Roll the POS normalizer + integrate with offline queue rules
5. Add Prisma mapping + validation mapping
6. Enforce with tests + lint rule (optional): “no throwing raw Error in app layer; use AppError or wrap”

**Do not do a big-bang refactor**—convert module by module, but keep the global filter active from day 1 so clients immediately see consistent errors.
