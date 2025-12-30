Refactor Corely NestJS DI (tokens + modules + providers) into a stable best-practice pattern

You are a senior NestJS architect working inside the **Corely pnpm monorepo**. The backend DI is currently brittle and failing with `UnknownDependenciesException` (e.g., `EnableAppUseCase` cannot resolve `ID_GENERATOR_TOKEN` in `PlatformModule` context). Your task is to **analyze the current repository** and refactor DI into a scalable best-practice setup:

- **Cross-module tokens are centralized** (single canonical source of truth).
- **Module-private tokens remain local** to their bounded context/module.
- Use **namespaced string tokens** (stable across builds) and inject with `@Inject(token)` for custom providers ([NestJS Documentation][3]).
- Fix module wiring (providers declared once, exported intentionally, imported explicitly) per Nest module encapsulation rules ([NestJS Documentation][1]).
- Add guardrails (tests + lint rules) so the same DI class of bugs doesn’t reappear.

### Repo context you must respect

- Repo structure includes:
  - `services/api` (NestJS API), `services/worker` (NestJS worker),
  - backend modules under `services/api/src/modules/*` (e.g., auth, tenants, clients, expenses, invoices, tools, workflow),
  - shared packages under `packages/*`,
  - frontend under `apps/webs`.

- Follow the architecture rules from `architect.md` (DDD bounded contexts, hexagonal ports/adapters, no framework imports in pure domain packages, modules communicate via stable contracts and events).
- Keep behavior unchanged; this is a **wiring + structure** refactor.

---

# Outcomes (what “done” means)

1. `services/api` boots with **zero** DI resolution errors.
2. `services/worker` boots with **zero** DI resolution errors.
3. All use cases (starting with `EnableAppUseCase`) resolve their dependencies reliably.
4. There is a single canonical token catalog for **cross-module** injection.
5. No `Symbol('…')` DI tokens remain (they cause identity mismatch issues in linked/monorepo setups) ([GitHub][2]).
6. Guardrails are in place: DI smoke tests + lint rules + minimal docs.

---

# Phase 0 — Baseline & diagnosis

1. Run `services/api` and `services/worker` locally to reproduce the DI errors.
2. For each failing provider (start with `EnableAppUseCase`):
   - List all constructor dependencies (in order).
   - For each dependency, determine:
     - Is it a class provider or custom token provider?
     - Where is it registered (`providers`)?
     - Where is it exported (`exports`)?
     - Which module imports that exporting module?

3. Produce a short “DI failure map”:
   - **consumer provider → expected token → actual providing module → export/import path**

4. Identify whether the failure is:
   - missing provider registration,
   - missing export,
   - missing import,
   - token mismatch (same-looking token but not identical runtime value),
   - duplicate provider declarations across modules.

Deliverable: `docs/di/01-di-failures.md`

---

# Phase 1 — Token audit & standardization

## 1.1 Inventory all injection tokens

Search for:

- `Symbol(` and `Symbol.for(`
- `@Inject(`
- constants like `*_TOKEN`, `*_PORT`, `*_REPOSITORY_TOKEN`
- `provide:` blocks in module provider arrays

Create a table (markdown) with:

- token name
- type (string / symbol / Symbol.for / class)
- canonical definition file path
- all import locations (top offenders)
- which module binds it (provider)
- which module exports it (if cross-module)

Deliverable: `docs/di/02-token-inventory.md`

## 1.2 Choose the canonical location for **cross-module** tokens

Create a backend-only canonical token package so **API and Worker share tokens** but frontend doesn’t import them accidentally.

Preferred:

- Create a new package `packages/server-di/` (or similar backend-only name).
  - `packages/server-di/src/tokens.ts`
  - `packages/server-di/src/index.ts` re-exporting tokens

- Ensure dependency direction:
  - `services/api` and `services/worker` may import `packages/server-di`
  - `apps/webs` should not depend on it

Update workspace tooling (pnpm workspace, tsconfig path aliases, package.json) accordingly.

## 1.3 Replace symbol tokens with namespaced string tokens

Implement a single `TOKENS` map in `packages/server-di/src/tokens.ts`.

Rules:

- Tokens are **namespaced strings**: `"<context>/<capability>"`.
  - examples: `platform/id-generator`, `platform/audit`, `tenants/repository`, `apps/app-registry`

- Do **not** define tokens inline anywhere else.
- Add a strict convention:
  - “public tokens” = exported from `packages/server-di`
  - “private tokens” = defined inside a module’s `di/tokens.ts` and never imported across modules

Refactor all providers and injections to use:

- `provide: TOKENS.X`
- `@Inject(TOKENS.X)` for custom providers ([NestJS Documentation][3])

Important: Nest common errors highlight that injecting interfaces/types without proper provider tokens is a frequent root cause—ensure all interface-like dependencies use these tokens or abstract classes ([NestJS Documentation][4]).

Deliverable: `docs/di/03-token-catalog.md` (clean, final list)

---

# Phase 2 — Fix module wiring with a clean composition root

## 2.1 Introduce a stable Platform/Kernel module (explicit imports/exports)

Create or refactor a `PlatformModule` (or `KernelModule`) in `services/api/src/shared/platform/` with **ONLY cross-cutting infrastructure providers**:

- id generator
- audit port
- clock/time provider
- config wrapper
- logging/correlation context (if applicable)

Best practice structure:

- Break into small submodules:
  - `IdGeneratorModule`
  - `AuditModule`
  - `TimeModule`
  - etc.

- `PlatformModule` imports and re-exports submodules (re-export = simple consumption for feature modules).

Follow Nest module encapsulation rules:

- Providers are visible only inside their module unless exported; exported providers are the module’s “public API” ([NestJS Documentation][1]).

## 2.2 Feature module rules (bounded contexts)

For each module under `services/api/src/modules/<bounded-context>`:

- Create a `di/` folder:
  - `di/providers.ts` (provider array)
  - `di/tokens.ts` (ONLY private tokens; avoid if possible)
  - `di/index.ts` (re-export)

- Module file (`*.module.ts`) must:
  - `imports: [PlatformModule, ...]` (explicit)
  - `providers: [...useCases, ...providers]`
  - `exports: [public use cases only]` (avoid exporting adapters unless intentionally shared)

Strict rules:

- No provider duplication across modules (each provider bound once, exported from its owning module if needed).
- No “grab bag” modules that export everything.
- Avoid `@Global()` except where absolutely necessary (prefer explicit imports for clarity).

## 2.3 Worker module alignment

In `services/worker`:

- Mirror the same token catalog (`packages/server-di`) and platform providers where relevant.
- Create a `WorkerPlatformModule` if needed, or reuse the same patterns.
- Ensure outbox/integrations modules import the worker platform module explicitly.

---

# Phase 3 — Fix the concrete failing chain (EnableAppUseCase first)

For `EnableAppUseCase` specifically:

1. Identify the module that declares it as a provider.
2. Ensure that module imports `PlatformModule`.
3. Ensure `TOKENS.ID_GENERATOR` is provided in the platform layer, exported, and imported properly.
4. Repeat for other dependencies in the same error:
   - `APP_REGISTRY_TOKEN`
   - `TENANT_APP_INSTALL_REPOSITORY_TOKEN`
   - `AUDIT_PORT`

5. Ensure every one of these tokens is either:
   - provided locally + used locally (private), or
   - provided in owning module + exported + imported (public)

---

# Phase 4 — Guardrails (prevent regressions)

## 4.1 DI smoke tests

Add a test in `services/api` that:

- bootstraps `AppModule`
- resolves a short allowlist of critical use cases (including `EnableAppUseCase`)
- fails fast if DI breaks

Add a similar smoke test in `services/worker` for `WorkerModule`.

## 4.2 Lint rules

Add ESLint rules (backend scope):

- forbid `Symbol(` usage for DI tokens (hard ban) ([GitHub][2])
- forbid defining cross-module tokens outside `packages/server-di`
- optionally forbid string literals inside `@Inject('...')` (must use `TOKENS.*`)

## 4.3 Docs

Add `docs/di/04-module-wiring-rules.md` with:

- token strategy
- what is “public token” vs “private token”
- module import/export rules
- provider ownership rules
- examples from your repo modules (auth/tenants/apps)

---

# Deliverables

1. Code changes implementing:
   - `packages/server-di` token catalog
   - token replacements repo-wide
   - platform module + submodules
   - cleaned feature module `di/` wiring
   - worker alignment

2. New docs:
   - `docs/di/01-di-failures.md`
   - `docs/di/02-token-inventory.md`
   - `docs/di/03-token-catalog.md`
   - `docs/di/04-module-wiring-rules.md`

3. Guardrails:
   - API DI smoke test
   - Worker DI smoke test
   - ESLint rules (or equivalent)

---

# Acceptance checklist

- [ ] `pnpm -C services/api start` succeeds with no DI errors.
- [ ] `pnpm -C services/worker start` succeeds with no DI errors.
- [ ] DI smoke tests pass in CI.
- [ ] No `Symbol(` DI tokens remain (except possibly non-DI usage).
- [ ] All cross-module tokens come from `packages/server-di`.
- [ ] Feature modules explicitly import `PlatformModule` (or the relevant platform submodule).
- [ ] Provider duplication removed.

---

If you want, paste the current locations of `ID_GENERATOR_TOKEN` + `PlatformModule` + `EnableAppUseCase` module file, and I’ll tighten this prompt with exact file paths and a token naming map matching your actual bounded-context names.

[1]: https://docs.nestjs.com/modules?utm_source=chatgpt.com "Modules | NestJS - A progressive Node.js framework"
[2]: https://github.com/nestjs/nest/issues/2260?utm_source=chatgpt.com "Use strings rather than symbols as DI tokens #2260"
[3]: https://docs.nestjs.com/fundamentals/custom-providers?utm_source=chatgpt.com "Custom providers | NestJS - A progressive Node.js ..."
[4]: https://docs.nestjs.com/faq/common-errors?utm_source=chatgpt.com "Common errors - FAQ | NestJS - A progressive Node.js ..."
