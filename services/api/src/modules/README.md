# Modules layout

We use a hexagonal layout per bounded context:

- `domain/` — entities/aggregates, value objects, invariants (no Nest/Prisma).
- `application/` — use cases + ports; depends only on domain and ports.
- `infrastructure/` — adapters that implement ports (Prisma, email, numbering, etc.).
- `adapters/` — UI-facing adapters (HTTP controllers/guards or AI tools) that validate input and call use cases.
- `testkit/` — fakes/mocks/builders for fast unit tests.

## Identity module (example)

- `identity.module.ts` wires ports to infrastructure (Prisma repos, bcrypt/jwt) and exposes controllers/guards under `adapters/http`.
- Application use cases live in `application/use-cases/*`; ports in `application/ports/*`.
- Domain rules in `domain/entities|value-objects|events`.
- Infrastructure adapters under `infrastructure/persistence|security`.
- Test helpers in `testkit/fakes|mocks|builders`.

## Invoices module (freelancer v1)

- `domain/` holds the `InvoiceAggregate` and supporting types.
- `application/` includes ports (`invoice-repo.port`, numbering, notification) and use cases (create/update/finalize/send/record payment/cancel/get/list). `invoices.application.ts` aggregates use cases for adapters.
- `infrastructure/prisma/` implements repository/numbering/notification ports.
- `adapters/http/` contains the HTTP controller and mappers; `adapters/tools/` exposes AI Copilot tools that call the same use cases.
- `testkit/` provides fakes for repo/numbering/notification to unit test use cases.

Other modules should mirror this pattern: domain + application + infrastructure + adapters, with testkit utilities for isolated tests.

## Permission catalog (roles & permissions)

- Each module owns its permissions in a `*.permissions.ts` file that exports `PermissionGroup[]`.
- Add the module catalog to `buildPermissionCatalog` in `identity/permissions/permission-catalog.ts` so it shows in the Roles UI.
- Keys must be unique, match `^[a-z][a-z0-9]*(?:[.:][a-z0-9]+)*$`, and each permission must set `group` to the group `id`.
