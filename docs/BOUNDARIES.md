# Corely — Boundaries (Hard Rules)

This doc defines the hard architecture boundaries for the modular monolith.
These rules are enforced by tooling and code review.

## Frontend (apps/web)

Allowed imports:

- `app/*` → `modules/*`, `shared/*`
- `modules/*` → `shared/*`
- `shared/*` → no module imports

Forbidden:

- `shared/*` importing `modules/*`
- `modules/*` deep-importing another module's internals

Examples:

- ✅ `import { CustomersPage } from "@/modules/customers"`
- ❌ `import { customerFormSchema } from "@/modules/customers/schemas/customer-form.schema"`

## Backend (services/api)

Module structure (incremental target):

```
<module>/
  domain/
  application/
  infrastructure/
  adapters/
  index.ts
```

Rules:

- Controllers call application use cases only.
- Prisma access happens only in `infrastructure/` or `adapters/`.
- Modules do not read or write another module's tables directly.
- Cross-module collaboration uses:
  - contracts (`@corely/contracts`)
  - domain events via outbox
  - explicit ports (rare; document when used)

## Worker (services/worker)

Rules:

- Consume outbox events only.
- Any DB access should be encapsulated in infrastructure adapters.
- Deliveries are idempotent (handlers must guard against re-sends).

## Outbox & Idempotency

- All domain events are written to outbox in the same transaction as state change.
- Worker retries outbox with backoff (default 3 attempts).
- Command endpoints require idempotency keys and deterministic retries.

## Kernel (packages/kernel)

Kernel contains stable primitives used by 2+ modules:

- Party and role types
- Tenant/workspace identifiers
- Outbox and idempotency primitives
- Cross-cutting ports (logger/clock/uow/audit/outbox)

Kernel has no Nest/Prisma/React imports.
