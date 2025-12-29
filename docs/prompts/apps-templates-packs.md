## Prompt: Implement “Apps + Templates + Packs” Tenant Entitlements + Server-Driven Menu (Core Platform)

You are an expert TypeScript/NestJS + Prisma + React (Vite) architect working in the **Kerniflow monorepo**. Implement the **core platform feature** that allows **per-tenant** enabling/disabling **Apps (modules/bounded contexts)**, installing **Templates (configuration presets)**, and installing **Packs (bundles of apps + templates)**, with a **server-driven menu** filtered by **RBAC** and tenant entitlements.

### Non-negotiable constraints (do not violate)

1. **Modular monolith + DDD boundaries**
   - Each module writes only its own tables; cross-module changes occur via **application services** + **events/outbox** (no random cross-table writes).

2. **RBAC enforced server-side**
   - Never rely on UI hiding. Every endpoint must enforce RBAC + tenant entitlements.

3. **Tenant isolation**
   - All tenant-scoped data must include `tenantId` and be filtered by it.

4. **Idempotency**
   - Enabling an app, applying a template, installing a pack must be safe to retry (important for worker retries).

5. **Template upgrades must not overwrite tenant customizations by default**
   - Follow a “do not update customized records” concept similar to the way systems preserve user-edited seeded records. ([Odoo][2])

6. **Feature flags / entitlements governance**
   - Avoid “flag debt”: implement metadata, audit, and admin-only mutation controls. ([martinfowler.com][1])

7. **Server-driven menu**
   - The menu is computed on the server, filtered by **tenant enabled apps** + **user RBAC** + **scope** (web/pos), with tenant overrides. (This is a pragmatic SDUI subset.) ([Nativeblocks SDUI Framework][3])

---

## 0) First: repo review checklist (must do before coding)

Scan the repo and document findings in an implementation note:

- Where tenant/workspace context is resolved (request context / auth token / middleware).
- Existing RBAC model and how permissions are checked (guards/interceptors).
- Existing module folder conventions in:
  - `services/api/src/modules/*`
  - `apps/webs/src/modules/*`
  - shared API layer in `apps/webs/src/shared/api/*`
  - contracts in `packages/contracts`

- Existing audit logging approach (if present) and error handling conventions.
- Any existing “feature flags” mechanism or “settings” tables.

If anything conflicts, **follow existing repo patterns** rather than inventing new ones.

---

## 1) Core concepts and definitions (must implement exactly)

### A) App (Module / Bounded Context)

- Defined in **code** via an **App Manifest** (source of truth), optionally mirrored in DB for UI listing/analytics.
- Tenant installs are stored in DB: enabled/disabled + config.

### B) Template (Configuration Preset)

- Defined in **code** as a **Template Definition** with:
  - metadata + params schema
  - **Plan → Apply** execution model
  - idempotent upserts using stable keys
  - upgrade policy that avoids overwriting customizations

### C) Pack (Bundle)

- Defined in **code** (declarative):
  - list of apps to enable
  - ordered templates to apply with params defaults
  - optional feature flags preset
  - optional menu preset

### D) Entitlement / Capability

- A resolved set of capabilities per tenant/user:
  - `tenant enabled apps` ∩ `user RBAC permissions`

- Must be enforced in API guards and used for menu composition.

---

## 2) Data model (Prisma) — create new tables + indexes

Create Prisma models (names can vary, but structure must match):

### Tenant-scoped install state

1. `TenantAppInstall`

- `tenantId`
- `appId` (string stable id)
- `enabled` (bool)
- `installedVersion` (string)
- `configJson` (json, optional)
- timestamps
- **unique**: `(tenantId, appId)`
- indexes: `(tenantId, enabled)`

2. `TenantTemplateInstall`

- `tenantId`
- `templateId`
- `version`
- `paramsJson`
- `appliedByUserId` (optional)
- `appliedAt`
- `resultSummaryJson` (diff/summary)
- unique: `(tenantId, templateId, version)` OR `(tenantId, templateId)` (choose based on upgrade approach; document decision)

3. `TenantPackInstall`

- `tenantId`
- `packId`
- `version`
- `status` (`pending|running|failed|completed`)
- `paramsJson`
- `logJson` (append-only log entries)
- `startedAt`, `completedAt`
- unique: `(tenantId, packId, version)` or `(tenantId, packId)` (document)
- indexes: `(tenantId, status)`

4. `TenantMenuOverride`

- `tenantId`
- `scope` enum: `web|pos`
- `overridesJson` (hide/reorder/rename/pins)
- `updatedAt`
- unique: `(tenantId, scope)`

### Optional (recommended) catalog mirror tables

If you need “register module in DB” strongly, add:

- `AppCatalog(appId PK, name, tier, version, depsJson, permissionsJson, capabilitiesJson, menuJson, updatedAt)`
- `TemplateCatalog(templateId PK, version, paramsSchemaJson, requiresAppsJson, updatedAt)`
- `PackCatalog(packId PK, version, definitionJson, updatedAt)`
  These are **not tenant-scoped** and are synced from code (see section 6).

### Template customization protection (must-have)

To prevent upgrades overwriting tenant edits, add one of:

- A generic `SeededRecordMeta` table (recommended for cross-template safety), OR
- Per-config table fields: `sourceTemplateId`, `sourceTemplateVersion`, `isCustomized`

**Pick one approach**, apply consistently, and document it. The key behavior: do not update “customized” rows on upgrade unless explicitly forced. Inspired by “don’t update user-edited seeded records”. ([Odoo][2])

---

## 3) App Manifest / Template Definition / Pack Definition (code registries)

### A) App Manifest interface (in `packages/contracts`)

Create `AppManifest` type:

- `appId`, `name`, `tier` (0..7), `description`
- `version` (semver)
- `dependencies: string[]` (appIds)
- `capabilities: string[]` (fine-grained capability strings)
- `permissions: string[]` (RBAC permission keys used by guards/UI)
- `menu: MenuContribution[]` (see below)
- `settingsSchema?` (json schema/zod-like descriptor)

### B) MenuContribution interface

- `id` stable unique
- `scope: web|pos|both`
- `section` (finance/ops/sales/admin/settings/etc.)
- `labelKey` (i18n key) + default label
- `route` (web) and/or `screen` (pos)
- `icon` (string)
- `order` number
- `requiresApps?`, `requiresCapabilities?`, `requiresPermissions?`
- `tags?` (for search)

### C) TemplateDefinition interface

- `templateId`, `name`, `category`, `version` (semver), `description`
- `requiresApps[]`
- `paramsSchema` (zod/jsonschema)
- `plan(ctx, params) -> TemplatePlan`
- `apply(ctx, plan) -> TemplateResult`
- `upgradePolicy` metadata (skipCustomized, additiveOnly, etc.)

Use semver rules and document your template versioning policy. ([Semantic Versioning][4])

### D) PackDefinition interface

- `packId`, `name`, `version`, `description`
- `appsToEnable[]`
- `templatesToApply[]`: `{ templateId, versionRange?, defaultParams }` ordered
- `featureFlags?` preset
- `menuPresetTemplateId?` or inline menu preset
- `postInstallChecks[]`

### E) Registry loader

Implement in API:

- `AppRegistry` loads manifests from each module folder (static imports, not dynamic runtime file crawling).
- `TemplateRegistry`, `PackRegistry` similarly.

**Do not** “enable/disable Nest modules at runtime” by tenant; keep all modules in code but enforce entitlements in guards. (Dynamic modules can help with configuration but not per-tenant compilation.) ([NestJS Documentation][5])

---

## 4) Backend API module: “Catalog/Entitlements” (NestJS)

Create a platform module in `services/api/src/modules/catalog/` (or `platform/entitlements/`). It contains:

### A) Services

1. `CatalogService`

- Returns list of apps/templates/packs from registries (and/or DB mirrors)

2. `TenantEntitlementService`

- Reads `TenantAppInstall` and resolves:
  - enabled apps
  - dependency closure
  - computed capabilities

- Provides helper: `assertAppEnabled(tenantId, appId)` and `assertCapabilities(...)`

3. `MenuComposerService`

- `composeMenu({ tenantId, userId, scope })`
  - collects menu contributions for enabled apps
  - filters by RBAC permissions and required capabilities
  - applies `TenantMenuOverride`
  - returns deterministic tree (stable ordering)

4. `TemplateRunnerService`

- Executes `plan/apply` with idempotency + transaction boundaries
- Writes `TenantTemplateInstall` and audit event

5. `PackInstallService`

- Validates pack definition
- Creates `TenantPackInstall` record and enqueues a worker job

### B) Guards / interceptors

Create a generic `EntitlementGuard` usable by all modules:

- reads current tenant + user
- checks required app/capability metadata
- returns 403 with a consistent error code (e.g., `FEATURE_NOT_ENABLED`)
  Keep it composable with your existing RBAC guards (both must pass).

### C) Controllers (Endpoints)

#### Catalog (read-only)

- `GET /catalog/apps`
- `GET /catalog/templates`
- `GET /catalog/packs`

#### Tenant admin (RBAC-protected)

- `GET /tenant/apps`

- `POST /tenant/apps/:appId/enable`

- `POST /tenant/apps/:appId/disable`
  - Must handle dependencies: enable pulls dependencies; disable blocks if dependents are enabled unless `force=true` (admin-only).

- `POST /tenant/templates/:templateId/plan`

- `POST /tenant/templates/:templateId/apply`
  - Must return preview summary on plan (diff)
  - Apply must record audit + install record.

- `POST /tenant/packs/:packId/install`
  - Returns `installId`

- `GET /tenant/packs/installs/:installId`

#### Menu (user-facing)

- `GET /me/menu?scope=web|pos`
- `PUT /tenant/menu?scope=web|pos` (admin-only)

### D) Audit logging

Every enable/disable/apply/install writes:

- audit record with actor, tenant, action, payload summary

### E) Caching (safe + invalidation)

Cache `GET /me/menu` by `(tenantId, userId, scope)` with short TTL.
Invalidate when:

- TenantAppInstall changes
- RBAC role/permissions changes
- MenuOverride changes
- PackInstall completes

---

## 5) Worker: Pack installation orchestration (BullMQ)

In `services/worker`:

- Add queue `pack-install`
- Job payload: `{ tenantId, packId, installId, requestedByUserId }`

Job steps (must be resumable / idempotent):

1. Validate pack exists and status is runnable
2. Enable apps (upsert TenantAppInstall for each + dependencies)
3. Apply templates in order:
   - run `plan` then `apply`
   - store per-template step logs into `TenantPackInstall.logJson`

4. Apply feature flags preset (if you have feature flag table; if not, store in `TenantAppInstall.configJson` or a dedicated tenant settings table)
5. Apply menu preset (optional)
6. Run post-install checks
7. Mark pack install completed

On error:

- mark failed
- store error detail (safe, no secrets)
- allow re-run via retry endpoint (admin-only)

---

## 6) “Register module in DB” (Catalog sync) — implement safely

If you add catalog tables, implement a **script** (not automatic on every API boot):

- `services/api/src/scripts/catalog-sync.ts`
  Behavior:
- read registries (apps/templates/packs)
- upsert into catalog tables
- record timestamps and versions
  Run this in CI/CD after migrations.

This avoids surprising prod mutations and aligns with feature toggle governance (control who can change). ([LaunchDarkly][6])

---

## 7) Web UI (Vite + React): Settings + Server-driven sidebar

Implement UI under `apps/webs/src/modules/settings/` (or your existing settings module). Use your shared API layer.

### A) Pages

1. **Apps Manager**

- list apps (from `/catalog/apps`) + tenant state (`/tenant/apps`)
- enable/disable toggles
- dependency UI (show why enabling/disabling affects others)
- show tier and description

2. **Templates**

- list templates
- template details
- params form generated from schema
- “Plan” preview shows diff summary
- “Apply” executes and shows result

3. **Packs**

- list packs
- pack details show apps+templates included
- install pack -> show progress (poll install status endpoint)
- show logs and errors

4. **Menu Customizer**

- load computed menu preview + overrides
- drag/drop reorder per section
- hide/show
- rename label (tenant-specific)
- pin favorites (optional)
- save overrides

### B) App shell integration (sidebar)

- Replace static sidebar entries with `GET /me/menu?scope=web`
- Render tree
- Route guards:
  - Use existing auth guard
  - Add a lightweight client check to hide inaccessible routes
  - But **server remains authority**: 403 must be handled gracefully (show “Feature not enabled / request admin”)

### C) UX details (must include)

- When a user hits a route of a disabled app: show “This feature is not enabled for your workspace” with a link to Apps settings (if permitted).
- When user lacks permission: show “You don’t have access” (do not reveal admin-only links).

---

## 8) Template authoring rules (must codify + test)

Implement and document these rules:

- Templates must use **stable keys** and **upsert** (Prisma unique constraints) to be idempotent. ([Prisma][7])
- Templates must be **plan/apply** for preview and safety.
- Upgrade policy:
  - Additive changes auto-apply
  - Do not overwrite customized records (tracked via metadata)

- “Noupdate-like” behavior: once tenant edits seeded records, upgrades skip them by default. ([Odoo][2])
- Validate inputs strictly; reject unknown params.
- Every apply writes audit log and stores plan summary.

Add unit tests for:

- idempotent re-apply
- customized record skip
- deterministic plan output ordering

---

## 9) Security, governance, and “don’t make mistake” checklist

- All admin endpoints require explicit RBAC permissions (define new permissions if needed):
  - `platform.apps.manage`
  - `platform.templates.apply`
  - `platform.packs.install`
  - `platform.menu.manage`

- Log every change (who/when/what)
- Do not allow normal users to infer hidden apps via error messages (use consistent 403).
- Ensure tenantId is taken from auth context, not from request body.
- Validate appId/templateId/packId exist in registry before writes.
- Dependency cycles must be detected and rejected with clear error.

Feature toggle complexity warning: keep metadata + ownership + cleanup strategy. ([martinfowler.com][1])

---

## 10) Docs output (must generate Markdown in repo)

Create these docs (short but concrete, with examples):

1. `docs/platform/apps-templates-packs.md`
   - definitions, lifecycle, tenant installs

2. `docs/platform/app-manifest.md`
   - manifest schema + menu contributions

3. `docs/platform/template-authoring.md`
   - plan/apply, idempotency, upgrade policy, customization protection

4. `docs/platform/pack-authoring.md`
   - pack schema, install workflow, best practices

5. `docs/platform/menu-system.md`
   - server-driven menu algorithm, override schema, caching/invalidation

6. `docs/platform/api-reference.md`
   - endpoints + permissions table + example payloads

---

## 11) Acceptance criteria (must pass)

- Tenant admin can enable/disable apps; dependencies handled correctly.
- Tenant admin can plan/apply a template; apply is idempotent and audited.
- Tenant admin can install a pack; progress visible; job retry safe.
- `/me/menu` returns correct menu for:
  - disabled apps (not present)
  - lacking RBAC permission (not present)
  - different scope (web vs pos)

- Menu overrides persist and apply deterministically.
- Hitting an API endpoint for a disabled app returns 403 `FEATURE_NOT_ENABLED`.
- Tests cover dependency resolution, menu composition, template idempotency.

---

### Notes you must respect (best-practice rationale)

- Feature toggles/entitlements add complexity; treat them as first-class with governance and audit. ([martinfowler.com][1])
- Server-driven UI requires validation and careful evolution; keep the menu schema versioned and additive. ([Nativeblocks SDUI Framework][3])
- Template upgrades must protect tenant customization (skip customized records by default). ([Odoo][2])
- Use semver consistently for manifests/templates/packs and document your policy. ([Semantic Versioning][4])
