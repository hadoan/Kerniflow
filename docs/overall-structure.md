# Corely — Overall Structure (Frontend + Backend)

This document describes the **repo hierarchy** for Corely (pnpm monorepo) and shows file trees using a **true hierarchy format** (folders nested, files indented).

---

## Top-level layout

```text
corely/
  apps/
    webs/                              # Frontend (Vite + React + TS)

  services/
    api/                               # Backend API (NestJS)
    worker/                            # Background jobs (NestJS)
    mock-server/                       # Dedicated mock backend (for demo/dev)

  packages/
    contracts/                         # Shared FE/BE: schemas + types + enums
    domain/                            # Shared pure domain rules (optional)
    data/                              # Backend-only DB layer (optional)
    ui/                                # Frontend-only design system (optional)

  docs/
  assets/
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
```

---

## Frontend hierarchy (apps/webs)

```text
apps/webs/
  public/
  src/
    app/
      AppShell.tsx
      router/
        index.ts
      providers/
        index.ts

    modules/
      assistant/
        components/
        screens/
        hooks/
        routes.tsx
        index.ts

      expenses/
        components/
        screens/
        hooks/
        routes.tsx
        index.ts

      invoices/
        components/
        screens/
        hooks/
        routes.tsx
        index.ts

      clients/
        components/
        screens/
        hooks/
        routes.tsx
        index.ts

      settings/
        components/
        screens/
        hooks/
        routes.tsx
        index.ts

    shared/
      api/
        httpClient.ts
        index.ts

      components/
        DataTable.tsx
        Drawer.tsx
        EmptyState.tsx
        Skeleton.tsx
        index.ts

      ui/
        index.ts

      lib/
        format.ts
        idempotency.ts
        permissions.ts
        index.ts

      i18n/
        index.ts
        locales/
          en.json
          de.json

      theme/
        tokens.css
        ThemeProvider.tsx
        index.ts

    assets/
    main.tsx
    index.css

  vite.config.ts
  tsconfig.json
  package.json
```

---

## Backend API hierarchy (services/api)

```text
services/api/
  src/
    main.ts
    app.module.ts

    modules/
      auth/
      tenants/
      clients/
      expenses/
      invoices/
      tools/
      workflow/

    shared/
      config/
      logging/
      guards/
      pipes/

  package.json
  tsconfig.json
```

---

## Worker hierarchy (services/worker)

```text
services/worker/
  src/
    main.ts
    worker.module.ts

    jobs/
    consumers/

    modules/
      outbox/
      integrations/

  package.json
  tsconfig.json
```

---

## Mock server hierarchy (services/mock-server)

```text
services/mock-server/
  src/
    index.ts

    routes/
      health.ts
      expenses.ts
      invoices.ts
      clients.ts
      assistant-tools.ts

    db/
      seed.ts
      store.ts                      # memory + file persistence

    middleware/
      cors.ts
      latency.ts
      idempotency.ts
      errors.ts

  package.json
  tsconfig.json
```

### Purpose of each folder

- `routes/`: REST endpoints + tool endpoints (assistant gateway)
- `db/`: in-memory store + seed + file persistence
- `middleware/`: cross-cutting server behaviors (CORS, latency simulation, idempotency, error normalization)

---

## Shared packages hierarchy (packages/\*)

### contracts (recommended)

```text
packages/contracts/
  src/
    index.ts
    common/
    expenses/
    invoices/
    clients/
    tools/
  package.json
  tsconfig.json
```

### domain (optional, pure)

```text
packages/domain/
  src/
    index.ts
    money/
    invoice-numbering/
    policies/
  package.json
  tsconfig.json
```

### data (optional, backend-only)

```text
packages/data/
  prisma/
    schema/
      schema.prisma
      10_identity.prisma
      40_billing.prisma
  src/
    prisma.client.ts
    repositories/
  package.json
  tsconfig.json
```

### ui (optional, frontend-only)

```text
packages/ui/
  src/
    components/
    tokens/
    index.ts
  package.json
  tsconfig.json
```

---

## Dependency direction rules (keep it scalable)

Allowed:

- `apps/webs` → `packages/contracts`, `packages/domain`, `packages/ui`
- `services/api` → `packages/contracts`, `packages/domain`, `packages/data`
- `services/worker` → `packages/contracts`, `packages/domain`, `packages/data`
- `packages/domain` → `packages/contracts`

Forbidden:

- `packages/contracts` importing anything else
- frontend importing backend internals
- backend importing frontend UI
- shared packages importing module code
