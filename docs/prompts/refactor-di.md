Fix NestJS DI in Corely (modules, providers, tokens) — best-practice refactor + guardrails

You are a senior NestJS + DDD architect working inside the **Corely pnpm monorepo**. The current backend DI is brittle/broken (e.g., `UnknownDependenciesException` for `EnableAppUseCase` missing `ID_GENERATOR_TOKEN` in `PlatformModule` context). Your job is to **analyze the existing repo**, identify why DI breaks, and **refactor to a stable, scalable DI pattern** aligned with our architecture docs (modular monolith, bounded contexts, ports/adapters, API + worker). Keep behavior the same; fix wiring, boundaries, and conventions.

### Repo context you must respect

- Monorepo structure: `services/api` (NestJS API), `services/worker` (NestJS worker), `packages/*` (shared libs), `apps/webs` (Vite React). See the repo structure docs (architect / overall structure).
- Architecture principles: modular monolith, DDD bounded contexts, hexagonal ports/adapters, no cross-module DB access.
- We already use “ports” heavily; interfaces don’t exist at runtime → injection must be via **tokens or abstract classes** (runtime values). (Nest custom providers + tokens are the intended mechanism.) ([NestJS Documentation][1])

---

# Goals

1. **App must boot reliably** (no UnknownDependenciesException).
2. **Token strategy becomes consistent and safe** across API + worker and across packages (no token identity mismatch).
3. **Module boundaries become explicit**: providers are declared once, exported intentionally, imported intentionally.
4. Add **guardrails** so the same DI class of bugs can’t reappear (lint + smoke tests + docs).

---

# Non-goals

- Do not redesign domains or implement new business features.
- Do not convert to microservices.
- Avoid broad rewrites; keep changes focused on DI wiring, token hygiene, and module composition.

---

# Phase 1 — Reproduce & map the DI failure

1. Run the API entrypoint and reproduce the DI error.

2. For each failing class (start with `EnableAppUseCase`):
   - Locate its constructor dependencies and list them in order.
   - For each dependency:
     - Identify whether it’s a class provider or token provider.
     - Find where the provider is registered (`providers: []`) and where it is exported (`exports: []`).
     - Find which module should import that exporting module.

3. Generate a “DI map” for the failing chain:
   - `EnableAppUseCase` → which module provides it?
   - which module exports `ID_GENERATOR_TOKEN` (or equivalent)?
   - does the providing module import the exporting module?

4. Watch for provider duplication: the same provider declared in multiple modules can cause weird instantiation and missing dependency graphs. Nest calls this out as a common source of these errors. ([NestJS Documentation][2])

**Deliverable:** a short markdown note: `docs/di/01-current-failures.md` listing each failure and the exact missing provider/module link.

---

# Phase 2 — Audit tokens and eliminate token identity traps

## 2.1 Inventory all tokens

Search the repo for:

- `Symbol(`, `Symbol.for(`, string tokens, and `@Inject(` usages.
- Any `TOKENS`, `*_TOKEN`, `*_PORT`, `provide:` patterns.

Build a table:

- token name
- token type (string / symbol / Symbol.for / class / abstract class)
- where defined (file path)
- who imports it (list key usage sites)
- which module provides it
- which module exports it (if cross-module)

## 2.2 Fix the #1 root cause: “same-looking Symbol, different identity”

If the repo uses **`Symbol('X')`** in multiple places or compiled artifacts, DI can break because symbols are not equal unless they’re the same instance. Replace this strategy.

**Choose ONE token strategy for the whole backend:**

### Preferred strategy (recommended): namespaced string tokens

- Introduce a single source of truth file for backend tokens:
  - If tokens must be shared across API + worker: put in `packages/contracts/src/di/tokens.ts`
  - If API-only: `services/api/src/shared/di/tokens.ts`

- Use **namespaced strings** (easy to debug, stable across builds), e.g.:
  - `platform/id-generator`
  - `platform/audit-port`
  - `tenants/tenant-repo`
  - `apps/app-registry`

Nest explicitly supports string tokens (and symbols/enums) for custom providers. ([NestJS Documentation][1])

### Acceptable alternative: `Symbol.for('X')`

Only if you strongly prefer symbols. (Never use `Symbol('X')`.)

## 2.3 Prevent mixed token sources

Enforce: each token is defined exactly once and imported from exactly one canonical module/file. Do not allow “duplicate tokens” via:

- importing from `src` in one place and `dist` in another
- duplicate path aliases resolving to separate copies
- re-declaring tokens inside feature modules

**Deliverable:** `docs/di/02-token-catalog.md` listing all tokens and their canonical import paths.

---

# Phase 3 — Standardize module composition (imports/exports/providers)

## 3.1 Create a stable “PlatformModule” composition root

Create or refactor `PlatformModule` (or `KernelModule`) whose job is to:

- own cross-cutting infrastructure providers (id generator, audit, clock, config wrappers, logger, correlation id context, etc.)
- export only what other modules need

Use “small submodules” to keep it clean:

- `IdGeneratorModule`
- `AuditModule`
- `TimeModule`
- `ConfigModuleWrapper` (if needed)
  …and `PlatformModule` imports and re-exports them.

## 3.2 Feature module rules (bounded context modules)

For each module under `services/api/src/modules/<bounded-context>`:

- The module provides:
  - use-cases (application services)
  - adapter implementations (repositories, external clients)
  - controller layer

- The module exports:
  - only what other modules truly need (usually use-cases or a small “public API”, not DB adapters)

- The module imports:
  - `PlatformModule` for cross-cutting services
  - its own infra modules only

## 3.3 Make provider wiring explicit and local

In each bounded context module, create a `di/` folder (or `providers.ts`) that centralizes the module’s providers, for consistency:

- `tokens.ts` (only if the module has private tokens; otherwise use global token catalog)
- `providers.ts` (array of `{ provide, useClass/useFactory }`)
- module file imports those arrays

This makes it obvious what is registered and reduces accidental duplication.

## 3.4 Eliminate provider duplication

If a provider is used by multiple modules:

- move it into the module that “owns” it (often Platform)
- export it from there
- remove duplicated entries elsewhere

Nest warns duplication is a common reason for dependency resolution issues. ([NestJS Documentation][2])

---

# Phase 4 — Decide between “token DI” vs “abstract class DI” for ports (optional but recommended)

You may keep tokens for ports, but consider improving robustness by defining ports as **abstract classes** (runtime values), e.g. `export abstract class IdGeneratorPort { abstract nextId(): string }` and bind:

- `{ provide: IdGeneratorPort, useClass: CuidIdGenerator }`

This reduces string-token sprawl and prevents typos. Only do this if it doesn’t break your existing architecture constraints (domain packages must stay framework-free; abstract classes are fine). If you don’t adopt it everywhere, don’t partially mix it—apply consistently per layer/module.

**Deliverable:** `docs/di/03-ports-and-injection.md` explaining the chosen approach and why.

---

# Phase 5 — Fix the concrete failing chain (EnableAppUseCase)

After the refactor groundwork:

1. Ensure `ID_GENERATOR` provider exists exactly once and is exported from `PlatformModule` (or submodule).
2. Ensure the module that provides `EnableAppUseCase` imports `PlatformModule`.
3. Ensure the token used in `@Inject(...)` is the canonical token (string or Symbol.for) imported from the canonical tokens file.
4. Validate the other dependencies in the same error (`APP_REGISTRY_TOKEN`, repo token, `AUDIT_PORT`, etc.) are also resolved by the same import/export rules.

---

# Phase 6 — Add guardrails (tests + lint + CI checks)

## 6.1 DI smoke test

Add a test that bootstraps `AppModule` and asserts key providers resolve:

- `EnableAppUseCase` resolves
- all “public” use-cases resolve (optionally iterate an allowlist)
- optionally resolve critical platform tokens (id generator, audit)

This catches missing exports/imports early.

## 6.2 Lint rules to prevent regression

Add ESLint rules (repo-wide or backend-only) that:

- forbid `Symbol(` usage for DI tokens (allow only `Symbol.for` if chosen)
- forbid defining tokens outside the canonical token module(s)
- forbid deep imports that create duplicate token instances (e.g., importing a token from a module’s internal path)

## 6.3 CI: dependency graph sanity

Add checks:

- no circular dependency spikes (use `madge` or similar)
- `pnpm -C services/api test` includes DI smoke test
- `pnpm -r lint` must pass

---

# Acceptance criteria

- `services/api` boots with zero DI resolution errors.
- `EnableAppUseCase` and all other critical use-cases resolve.
- Token catalog is canonical and consistent; no duplicate tokens.
- `PlatformModule` is the single home of cross-cutting infra providers.
- Provider duplication removed.
- Docs + lint + smoke tests added.

---

# Output format required

1. A PR-style change plan (bullet list of commits).
2. Updated/added docs under `docs/di/`:
   - `01-current-failures.md`
   - `02-token-catalog.md`
   - `03-ports-and-injection.md`
   - `04-module-wiring-rules.md`

3. Code changes implementing the plan.
