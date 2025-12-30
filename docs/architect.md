# Bizflow Foundation

## A scalable architecture for an AI-native modular ERP

**Version:** 1.1  
**Date:** 12 Mar 2025  
**Scope:** Kernel + module domains (finance, ops, HR, vertical packs) with clean boundaries for a growing team.

---

## Design intent

Start as a **modular monolith** (single platform) but keep boundaries so you can later split parts into services. Optimize for:

- fast product iteration today
- safe multi-tenant isolation
- team scalability (clear ownership) tomorrow

**Recommended stack:** Vite + React (web backoffice) + React Native (POS) + NestJS (API) + Worker (jobs/outbox) in a monorepo; PostgreSQL + Prisma; Redis for queues/caching; object storage for files; optional realtime provider for multi-device POS.

---

# Executive summary

Bizflow is an AI-native ERP platform designed to support multiple business types (restaurant, hotel, factory, services) **without forking code**. The foundation is a **kernel** of universal business primitives plus **module packs** that add domain-specific workflows, UI, and integrations.

**Enterprise pattern:** Modular monolith + DDD bounded contexts + Hexagonal (ports/adapters) + Event-driven automation (outbox + process managers) + CQRS-lite reads.

## Principles

| Principle                       | What it means in practice                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| Clear ownership boundaries      | Each module has domain + use-cases + infra adapters; no cross-module DB access.      |
| Stable kernel primitives        | Core models stay small; vertical packs compose kernel instead of rewriting it.       |
| Events over tight coupling      | Modules publish domain events; automation/integrations subscribe (outbox).           |
| Configuration before code forks | Custom fields/statuses/workflows cover most customization; packs only for real code. |
| Security and audit as defaults  | Tenant scoping, RBAC/ABAC, immutable audit trail, idempotency for commands/tools.    |

---

# System overview

The platform is organized into four runtime surfaces that share the same domain packages:

- **Web (Vite + React):** backoffice/admin UI for modules
- **POS (React Native):** offline-first selling UI for fast cashier workflows
- **API (NestJS):** RBAC, validation, idempotency, tool execution, domain use-cases
- **Worker (NestJS):** outbox, queues, automations, integrations, scheduled sync tasks

**Storage & infra:** PostgreSQL + Prisma • Redis (queues/cache) • Object Storage (files) • Realtime (optional for multi-device POS)

## Key boundary rules

1. **Domain logic** lives in shared packages (no framework imports).
2. Only **repositories** in the data layer talk to Prisma.
3. Modules communicate via **domain events** and stable contracts.
4. API enforces **authorization, validation, and idempotency** for every command and tool call.
5. Web and POS share contracts and client behavior; UI logic stays in apps.

---

# Architecture patterns

| Pattern                    | Why it matters                                                | How to implement                                                            |
| -------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------- |
| DDD bounded contexts       | Stops the ERP from becoming one giant model.                  | Each module owns entities, use-cases, migrations, and APIs.                 |
| Hexagonal (ports/adapters) | Swap DB/queue/LLM providers without rewriting business rules. | Use interfaces (ports) in application layer; Nest providers implement them. |
| Outbox pattern             | Reliable event publication and integration delivery.          | Write events into outbox table in same transaction; worker publishes.       |
| Process managers (sagas)   | Long workflows: approvals, multi-step ops, retries.           | WorkflowInstance + state machine; subscribe to events; emit commands.       |
| CQRS-lite reads            | Fast dashboards/reports without polluting write model.        | Read services/materialized views; keep writes strict in use-cases.          |
| Idempotent commands        | Safe retries for POS and AI tool executions.                  | Idempotency key per command; unique constraint + replay return.             |
| AI tool cards              | Keeps AI outputs structured and user-confirmed.               | Tool schemas in contracts + UI cards with explicit apply/dismiss actions.   |

### Use case kernel (standardized application layer)

- One **BaseUseCase** (`execute(input, ctx)`) that wraps optional validation, logging, transaction (`UnitOfWorkPort`), and idempotency (`IdempotencyPort`); no NestJS deps.
- **Result** helpers (`Ok/Err/isOk/isErr/unwrap`) replace thrown errors across layers; **UseCaseError** family (Validation/NotFound/Forbidden/Unauthorized/Conflict/etc.) is serializable and mapped to HTTP in API.
- Shared **ports** (Logger/Clock/IdGenerator/UnitOfWork/Idempotency) and **testing fakes** (NoopLogger, FixedClock, FakeIdGenerator, InMemoryIdempotency) live in `packages/kernel`, imported by API/Worker.
- Adapters belong to surfaces (e.g., Nest logger, Prisma $transaction UoW, DB idempotency store); keeps kernel boring and framework-agnostic.

---

## Error handling (Problem Details standard)

All API errors use **RFC 7807 Problem Details** as the wire format. This ensures predictable, consistent error responses across Web, POS, and any future client surfaces. Errors are safe by default: internal details never leak to clients in production.

## Wire format (all API errors)

```typescript
{
  type: "https://errors.corely.com/Invoices:Locked",
  title: "Conflict",
  status: 409,
  detail: "This invoice has already been finalized",  // safe to show
  instance: "/api/invoices/123/finalize",
  code: "Invoices:Locked",                            // stable machine code
  traceId: "a1b2c3d4-...",                            // correlation ID
  validationErrors: [{ message: "...", members: ["email"] }], // optional
  data: { invoiceId: "123" }                          // safe metadata
}
```

**Error code convention:** `Module:Meaning` (e.g., `Invoices:Locked`, `Common:ValidationFailed`, `Customers:EmailExists`).

## Backend error taxonomy (`packages/domain/src/errors`)

| Error class             | Status  | Message exposed? | When to use                                     |
| ----------------------- | ------- | ---------------- | ----------------------------------------------- |
| `UserFriendlyError`     | 400     | ✅ YES           | Business logic errors safe to show users        |
| `ValidationFailedError` | 400     | ✅ YES           | Form/request validation with field-level errors |
| `UnauthorizedError`     | 401     | ✅ Generic       | Authentication required/failed                  |
| `ForbiddenError`        | 403     | ✅ Generic       | Insufficient permissions                        |
| `NotFoundError`         | 404     | ❌ NO            | Resource not found (message sanitized)          |
| `ConflictError`         | 409     | ❌ NO            | Duplicates, state conflicts (message sanitized) |
| `ExternalServiceError`  | 502/503 | ❌ NO            | Third-party API failures (includes retry flag)  |
| `UnexpectedError`       | 500     | ❌ NO            | System errors (message sanitized)               |

**Usage example (backend):**

```typescript
// User-friendly (safe to show)
throw new UserFriendlyError("This invoice has already been finalized", {
  code: "Invoices:Locked",
});

// Validation
throw new ValidationFailedError("Validation failed", [
  { message: "Email is required", members: ["email"] },
]);

// Not safe (internal details for logs, generic message to client)
throw new NotFoundError("Invoice ABC-123 not found for tenant XYZ");
```

## Global exception filter (API layer)

The `ProblemDetailsExceptionFilter` catches **all** exceptions and converts them to Problem Details:

1. **AppError** → Maps directly using error properties
2. **Prisma errors** → Maps to business errors with stable codes:
   - `P2002` (unique constraint) → 409 Conflict
   - `P2025` (not found) → 404 Not Found
   - `P2003` (foreign key) → 409 Conflict
3. **NestJS HttpException** → Converts with stable codes
4. **Unknown errors** → Sanitized 500 response in production

**Trace/correlation IDs:** Every request gets a `traceId` (extracted from `x-trace-id` header or generated). Included in all error responses and logs for debugging/support.

**Logging policy:** User-friendly and validation errors log as `warn`/`info` (no stack); unexpected errors log as `error` (with stack). All logs include `traceId`, `tenantId`, HTTP method, and URL.

## Client-side error handling (Web + POS)

**Shared normalizer** (`packages/api-client/src/errors`): Converts HTTP errors to structured `ApiError` class with convenience methods (`isValidationError()`, `isRetryable()`, etc.).

**Web patterns** (`apps/web/src/shared/lib/errors`):

```typescript
// Automatic toast for non-validation errors
const showError = useApiErrorToast();
try {
  await apiClient.post("/invoices", data);
} catch (error) {
  showError(error); // Shows toast with trace ID
}

// Map validation errors to form fields
const fieldErrors = mapValidationErrorsToForm(error);
// → { email: "Email is required", amount: "Must be positive" }
Object.entries(fieldErrors).forEach(([field, message]) => {
  form.setError(field, { message });
});
```

**POS offline-aware rules:**

| Error type                 | POS behavior                                       |
| -------------------------- | -------------------------------------------------- |
| Network/offline            | Queue action for sync (via `packages/offline-rn`)  |
| Validation (400)           | Show error, do NOT retry (user must fix)           |
| Conflict (409)             | Show error, do NOT retry (business rule violation) |
| Auth (401/403)             | Trigger re-login flow                              |
| Transient server (502/503) | Retry with backoff (if idempotent)                 |

**Trace ID support:** All error UIs (web toasts, POS banners) display `traceId` and allow copying for support tickets.

## Developer guidelines

**DO:**

- ✅ Use `UserFriendlyError` for messages safe to show users
- ✅ Include module-specific error codes (e.g., `Invoices:Locked`)
- ✅ Log `traceId` with every error
- ✅ Handle 401/403 in global auth flow, not per-component

**DON'T:**

- ❌ Expose database constraint names or SQL errors to clients
- ❌ Retry validation errors or permission errors
- ❌ Show generic "An error occurred" when you have specific business logic errors

**Full documentation:** See `docs/architecture/error-handling.md` for complete reference, testing patterns, and troubleshooting.

---

# Cross-platform sharing strategy (Web + React Native)

Web and POS are distinct client surfaces, but they share the same contracts, domain vocabulary, and workflow boundaries. Avoid duplicating business workflows across clients.

**Shared (packages):**

- `packages/contracts`: Zod schemas + request/response types (single source of truth).
- Shared API client behavior (auth, tenant scoping, idempotency, error normalization) via `apps/web/src/lib/api-client.ts` and aligned patterns in RN.
- Shared domain workflows where applicable: use-case orchestration lives in API; clients reuse the same contract shapes and command semantics.
- AI copilot tool schemas and tool-card payloads (shared types, stable outputs).

**React Native specific:**

- Device APIs (camera/scan), local storage, background sync triggers.
- Offline queue persistence via `packages/offline-rn`.
- POS navigation and touch-first UI primitives.

**Web specific:**

- Browser storage and backoffice layouts/dashboards.
- Admin workflows and reports.

**Rule:** UI logic stays in `apps/*`; shared domain, contracts, and client behavior stay in `packages/*`.

---

# POS offline-first architecture (React Native)

The POS client is **offline-first** by design. It must complete sales flows even when connectivity is intermittent.

Core concepts:

- **Register / Shift session:** scoped session for a device/cashier with opening/closing control.
- **POS ticket (draft):** editable cart state; not yet a sale.
- **POS sale (syncable transaction):** immutable local transaction created on finalize; queued for sync.

Sync behavior:

- POS queues commands locally using `packages/offline-rn`.
- Commands are **idempotent** with deterministic server responses.
- Conflict handling is explicit: reject with an actionable error; never silently drop or merge.
- When online, sync posts to Sales/Accounting through API use cases (single system of record).

---

# Multi-tenancy, security, and customization

**Tenant isolation:** every row is scoped by `tenantId`; uniqueness and indexes include `tenantId`. Sensitive actions require immutable audit logs.

**Authorization:** RBAC by default, optional ABAC policies for high-precision rules (e.g., amount thresholds).

**Customization strategy:** configuration first (custom fields, statuses, numbering, templates) + workflow definitions; only use code-level packs when you must add screens, integrations, or specialized data structures.

## Customization levels

| Level                 | Examples                                                    | Storage                                     |
| --------------------- | ----------------------------------------------------------- | ------------------------------------------- |
| Config-only (no-code) | Custom fields, labels, numbering, tax rules, roles          | TenantSetting + CustomFieldDefinition/Value |
| Workflow (low-code)   | Approvals, kitchen routing, reorder points, scheduled tasks | WorkflowDefinition JSON + instances + tasks |
| Extension pack (code) | POS modifiers, hotel room allocation, factory BOM/QA        | Module pack with migrations + tools + UI    |

---

# ERP domain module catalog

Treat each row as a bounded context with its own code ownership, migrations, and APIs.

| Module domain             | Purpose                                             | Core entities (examples)                           |
| ------------------------- | --------------------------------------------------- | -------------------------------------------------- |
| Identity & Access         | Tenants, users, roles, policies, API keys.          | Tenant, User, Membership, Role, Permission, ApiKey |
| Party & CRM               | Customers, suppliers, employees, contacts.          | Party, PartyRole, ContactPoint, Address            |
| Catalog                   | Products/services, pricing, tax, units.             | Item, Variant, PriceList, TaxCode, Unit            |
| Documents                 | Receipts, contracts, attachments, OCR metadata.     | Document, File, DocumentLink                       |
| Sales (AI-native)         | Quote-to-cash pipeline with AI drafts + postings.   | Quote, SalesOrder, Invoice, Payment, PostingLink   |
| Purchasing (AI-native)    | Procure-to-pay pipeline with AI drafts + postings.  | PurchaseOrder, VendorBill, BillPayment, Mapping    |
| Billing & Payments        | Invoices, payments, refunds, allocations.           | Invoice, InvoiceLine, Payment, Allocation, Refund  |
| Accounting Core           | Chart of accounts and journal postings.             | LedgerAccount, JournalEntry, JournalLine           |
| Expenses                  | Employee/vendor expenses and approvals.             | Expense, ExpenseLine, ReceiptLink, Approval        |
| Inventory                 | Stock ledger, reservations, reorder rules.          | Location, StockMove, Reservation, ReorderPolicy    |
| POS / Register            | Register sessions and offline sales sync.           | Register, ShiftSession, PosTicket, PosSale         |
| Assets & Maintenance      | Equipment lifecycle and servicing.                  | Asset, MaintenanceTask, WorkOrder                  |
| Projects & Jobs           | Job costing and time/material tracking.             | Project, Job, TimeEntry, CostAllocation            |
| HR (light)                | Profiles, time off, shifts (optional).              | EmployeeProfile, LeaveRequest, Shift               |
| Workflows                 | State machines, approvals, tasks.                   | WorkflowDefinition, WorkflowInstance, Task         |
| Automation & Integrations | Webhooks, connectors, outbox, retries.              | Integration, Webhook, OutboxEvent, Delivery        |
| AI Copilot                | Tool registry, runs, messages, tool execution logs. | AgentRun, Message, ToolExecution, Attachment       |
| Reporting                 | Dashboards, analytics, exports.                     | ReadModels, Snapshots, MaterializedViews           |

---

# AI-native revenue + expense flows

Sales and Purchasing are AI-native by default: the Copilot proposes structured drafts (quotes, orders,
vendor bills, line items, pricing) and never mutates records silently. Every mutation is explicit and
user-confirmed, while deterministic auto-posting to Accounting Core produces auditable journal entries
with source links and explanations.

# AI copilot for Web and POS

We use the existing **ai-copilot** module and **ai-sdk.dev** tool-calling patterns. Web and POS both render
the same tool cards and apply actions explicitly.

Rules:

- AI proposes structured actions only (tool cards).
- Cashier/user must confirm apply actions.
- AI never finalizes a sale, never posts inventory moves.
- All AI interactions are logged (confidence, provenance, accepted/dismissed).

---

# Vertical packs (restaurant, hotel, factory)

Vertical packs extend the kernel and baseline modules with specialized workflows, UI, and data structures. They should be **additive and isolated**: new tables live in the pack, while shared primitives remain in the kernel. We ship a baseline POS v1 in `apps/pos` (generic quick sale); packs later extend it for hospitality/retail flows.

| Pack                    | Adds (examples)                                                    | Composes kernel primitives                      |
| ----------------------- | ------------------------------------------------------------------ | ----------------------------------------------- |
| Restaurant POS          | Floor plan, table checks, modifiers, kitchen tickets, cash drawer. | Location(TABLE), Order, Item, Payment, Workflow |
| Hotel Ops               | Room inventory, reservations, check-in/out, folio billing.         | Location(ROOM), Party, Order/Invoice, Workflow  |
| Factory / Manufacturing | BOM, work orders, routing, QA, batch tracking.                     | Item, Inventory, Asset, Workflow, Domain Events |

## POS minimum build (restaurant pack)

- Screens: floor plan, table order entry, payment/close, optional kitchen display
- Realtime: broadcast `OrderOpened/Updated/SentToKitchen/Paid` events to connected devices
- Safety: manager approvals for voids/discounts; idempotency on pay/close

---

# Operational readiness

**Observability:** structured logs with correlation IDs (`tenantId`, `requestId`, `traceId`), metrics (latency, error rate), and tracing across API/worker. Persist tool execution logs for Copilot runs.

**Data safety:** backups + PITR, migration discipline (expand/contract), and strict CI checks (`prisma validate`, drift checks).

**Deployments:** keep infra simple: one Postgres, one Redis, one object store. Deploy web separately from API/worker so you can scale POS traffic independently from automation workloads.

| Area        | Baseline                                                                       |
| ----------- | ------------------------------------------------------------------------------ |
| CI/CD       | Lint + tests + `prisma validate`; migration PR checks; seed scripts for packs. |
| Security    | RBAC/ABAC, audit log, secrets management, encrypted storage for files.         |
| Performance | Read models for dashboards; caching for menus/POS; indexes include `tenantId`. |
| Reliability | Outbox + retries; idempotency; dead-letter queue; incident playbooks.          |

---

# Appendix: governance rules for a growing team

1. **Module ownership:** every module has an owner; only owners approve cross-cutting changes.
2. **No shared DB writes:** a module writes only its own tables; other modules integrate via API/events.
3. **Contracts are versioned:** breaking changes require a deprecation window.
4. **Events are stable:** treat domain events as public APIs; add fields, do not rename/remove lightly.
5. **Keep the kernel small:** promote something into kernel only when at least two packs need it.
6. **Cross-platform contracts:** Web + POS consume versioned contracts; no client-specific wire formats.
7. **Shared client behavior:** auth/idempotency/error mapping lives in shared client patterns.
8. **Offline queue stability:** queued command semantics remain backward compatible.
9. **Tool-card schemas are public APIs:** Web + POS share tool definitions and card payloads.

> This foundation is intentionally practical: strong enough for enterprise needs, while avoiding early microservice overhead. When parts grow (integrations, reporting, POS realtime), these boundaries let you extract services safely.
