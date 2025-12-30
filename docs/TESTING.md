## Test Taxonomy

- Unit: `*.test.ts` (default suite; no network/DB)
- Integration (DB): `*.int.test.ts` (real Postgres via testcontainers)
- API (HTTP): `*.api.test.ts` (Nest app + supertest)
- Contract: `*.contract.test.ts` (validate responses against `packages/contracts`)
- Adapter/Provider: `*.adapter.test.ts` (mock HTTP; no real provider calls)
- Outbox/Worker: `*.outbox.int.test.ts` (DB-backed reliability checks)
- Frontend components: `*.component.test.tsx`

## Commands

- `pnpm test:unit` — unit only (DB/HTTP/adapters excluded)
- `pnpm test:int` — DB integrations + outbox (explicit key suites listed in script)
- `pnpm test:api` — HTTP-level tests
- `pnpm test:contract` — contract validations
- `pnpm test:adapters` — provider/adapters with mocked HTTP
- `pnpm test:ui` — frontend component suites
- `pnpm test:all` / `pnpm test` — everything

## Environments

- Integration/API/outbox suites use Postgres testcontainers. Requires Docker available to the runner.
- `DATABASE_URL` is set automatically by `@corely/testkit`; do not point at a shared DB.
- Optional provider live runs can be gated with `RUN_LIVE_PROVIDER_TESTS=1` (not enabled by default).
- JWT secrets fall back to defaults for tests; override via `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` if needed.

## Shared Testkit (`@corely/testkit`)

- `createTestDb()` — starts Postgres container, runs Prisma migrations from `@corely/data`, returns `PostgresTestDb` with `client`, `reset()`, `down()`.
- Factories: `createTenant`, `createUser`, `createCustomerParty`, `createInvoice`, `createExpense`.
- API helpers: `createApiTestApp(db)` bootstraps Nest `AppModule` against the test DB; `seedDefaultTenant(app)` uses the test harness seeder.
- Remember to `await stopSharedContainer()` after suites to free Docker resources.

## Patterns for new tests

- Integration/service boundary: use `createTestDb()` in `beforeAll`, `reset()` in `beforeEach`, then compose real adapters (Prisma repos, idempotency, outbox, audit) instead of mocks.
- API tests: spin `createApiTestApp(db)`, seed data, then hit controllers with `supertest`. Use `JwtTokenService` to mint tenant-scoped tokens for guarded routes.
- Contracts: validate `res.body` with the matching Zod schema from `packages/contracts` via `safeParse`; fail fast on `parsed.success === false`.
- Adapters: use `msw` node server to assert outgoing request shape/headers and map provider errors to thrown exceptions.
- Outbox reliability: assert enqueue + domain write inside one transaction and that `fetchPending/markSent/markFailed` behave with attempt counters.

## CI Notes

- Unit/contract tests do not require Docker.
- Integration/api/outbox suites require Docker-enabled runners; they spin a temporary Postgres 16 container and run Prisma migrations automatically.
