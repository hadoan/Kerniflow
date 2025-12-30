# Corely

Corely is an **AI-native modular ERP kernel** designed to start small (freelancer workflows like **expenses + invoices + assistant**) and scale into full ERP domains (restaurant/hotel/factory packs) without forking code.

This repo is a **pnpm monorepo** with clear boundaries:

- **DDD bounded contexts** per module
- **Hexagonal** ports/adapters (domain + use-cases are framework-free)
- **Outbox + Worker** for reliable async workflows
- **CQRS-lite reads** for dashboards
- **Idempotency + Audit** as defaults

---

## Repo structure

```text
apps/
  web/                      # Frontend (Vite/Next.js depending on your setup)

services/
  api/                      # NestJS API (RBAC, tools, workflows, use-cases)
  worker/                   # NestJS Worker (outbox, jobs, automations)
  mock-server/              # Dedicated mock backend for frontend demo/dev

packages/
  contracts/                # Shared FE/BE: schemas + types + tool contracts
  domain/                   # Optional shared pure domain rules (no Prisma/Nest/React)
  data/                     # Backend-only Prisma + repositories

docs/                       # Architecture docs
assets/                     # Brand/logo assets
```

---

## Prerequisites

- **Node.js** (recommended: latest LTS)
- **pnpm** (workspace package manager)
- **Docker** (optional, for Postgres/Redis via compose)

---

## Quick start (local dev)

### 1) Install

```bash
pnpm install
```

### 2) Run frontend with dedicated mock server (recommended for UI work)

```bash
pnpm dev:mock
pnpm dev:web
```

Or run everything together if you have a combined script:

```bash
pnpm dev
```

### 3) Run backend stack (API + Worker)

```bash
pnpm dev:api
pnpm dev:worker
```

---

## Common scripts (root)

> Scripts may vary slightly depending on current repo state.

```bash
pnpm dev           # start main dev environment (often web + mock)
pnpm dev:web       # start frontend
pnpm dev:mock      # start mock server
pnpm dev:api       # start NestJS API
pnpm dev:worker    # start NestJS worker

pnpm build         # build all packages/apps
pnpm typecheck     # typecheck all packages
pnpm lint          # lint (if configured)
pnpm format        # format (if configured)
```

---

## Environment variables

Create a `.env` (or per-service env files) from `.env.example`:

Typical values:

- `DATABASE_URL` (Postgres connection)
- `REDIS_URL` (Redis connection)
- `VITE_API_BASE_URL` (frontend → mock server or api)

---

## Development modes

### UI-first (recommended)

- Frontend calls `services/mock-server`
- Mock server simulates:
  - latency
  - pagination/filtering
  - idempotency
  - assistant tool endpoints

### Full stack

- Frontend calls `services/api`
- API uses Postgres + Prisma
- Worker publishes outbox events and runs jobs

---

## Architecture rules (do not break)

### Dependency direction

✅ Allowed:

- `apps/web` → `packages/contracts`, `packages/domain`
- `services/api` → `packages/contracts`, `packages/domain`, `packages/data`
- `services/worker` → `packages/contracts`, `packages/domain`, `packages/data`
- `packages/domain` → `packages/contracts`

🚫 Forbidden:

- `packages/contracts` importing anything else
- frontend importing backend internals
- shared packages importing feature modules
- cross-module direct DB writes (no “shared DB access”)

### Domain boundaries

- **Domain + use-cases**: no framework imports (no NestJS, no Prisma)
- **Infra adapters** implement ports (Prisma/JWT/queues/etc.)
- **Outbox** written in the same transaction as state changes
- **Worker** publishes/retries outbox events
- **Idempotency** required for write commands/tools
- **AuditLog** for security-sensitive actions

---

## Where to add new features

### Add a new ERP module (example: inventory)

1. Backend:
   - `services/api/src/modules/inventory/*`
   - Prisma tables in `packages/data/prisma/schema/*`

2. Contracts:
   - `packages/contracts/src/inventory/*`

3. Frontend:
   - `apps/web/src/modules/inventory/*`

4. Optional: mock server routes
   - `services/mock-server/src/routes/inventory.ts`

---

## Troubleshooting

### pnpm workspace import issues

- Ensure `pnpm-workspace.yaml` includes `apps/*`, `services/*`, `packages/*`
- Run a clean install:

```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### CORS errors (frontend ↔ api/mock)

- Confirm mock/api enables CORS for the frontend origin
- Confirm frontend uses the correct `VITE_API_BASE_URL`

### Prisma schema split

- If using multi-file Prisma schema, ensure Prisma is configured to load the schema directory (and your generator scripts point to it).

---

## License

TBD
