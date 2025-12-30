## Prompt: Implement Role Permissions Management (Web + Backend only)

You are an expert TypeScript/NestJS + React (Vite) architect working in the **Corely pnpm monorepo**. Implement an **ABP-style “Role Permissions”** feature for **Web + Backend API only** (explicitly **NOT** in POS / React Native). Follow the repo structure and DDD/hexagonal rules: modules own their catalogs and persistence is done via ports/adapters.

### Goal

Add a complete “Roles & Permissions” capability where admins can:

- Create/edit/delete **tenant-scoped roles**
- Assign **permission grants** to roles via a grouped UI (left: groups/modules, right: permissions)
- Backend enforces permissions via guards (authorization is API-first)
- Permission definitions are **code-defined by modules** (catalog), while the database stores only **grants**

### Non-goals

- No POS/RN screens or device logic
- No complex ABAC policy engine yet (threshold rules can be future work)
- No multi-org-unit hierarchy in v1
- No experimentation/feature flag UI here (only role permissions)

---

# 0) First: Repository discovery (must do)

Before coding, scan the repo to reuse what exists:

- Backend:
  - `services/api/src/modules/auth` (how users are authenticated)
  - existing guards/pipes in `services/api/src/shared`
  - any existing role/permission concepts or DB tables

- Frontend:
  - `apps/webs/src/shared/lib/permissions.ts` (existing permission helpers)
  - how API calls are done (`apps/webs/src/shared/api/httpClient.ts`)
  - existing Settings module screens and navigation

- Shared contracts:
  - `packages/contracts` patterns for schemas/types

Document what you found (short notes) and explicitly reuse instead of reinventing.

---

# 1) Domain & Architecture decisions

## 1.1 Bounded context

Create/extend an **Identity & Access** bounded context inside the API (recommended):

- `services/api/src/modules/identity/` (new module)
  - `roles/` + `permissions/` subfolders (or keep flat but structured)

Avoid putting role-permission logic inside `auth/` if `auth/` is mainly login/session. Keep “authorization model” (roles/grants) in identity.

## 1.2 Permission model: Catalog + Grants

**Permissions are defined in code** (catalog), grouped by module.
**Grants are stored in DB** (per tenant + role).

- Permission key is a stable string: e.g. `invoices.read`, `invoices.send`, `expenses.approve`, `clients.write`, `settings.roles.manage`
- DB stores only grant decisions for `(tenantId, roleId, permissionKey)`

Design for extensibility:

- Today: `ROLE` grant provider
- Later: add `USER` overrides, `PLAN` entitlements, `LOCATION` scopes without rewriting the checker

---

# 2) Database (Prisma) changes

Implement Prisma models (names can align to your naming conventions):

### 2.1 Role

- `id`, `tenantId`
- `name` (unique per tenant)
- `description?`
- `isSystem` (for default roles you seed)
- `createdAt`, `updatedAt`

Indexes/constraints:

- unique `(tenantId, name)`
- index `(tenantId)`

### 2.2 RolePermissionGrant

- `id`
- `tenantId`
- `roleId`
- `permissionKey` (string)
- `effect` enum: `ALLOW` (and optionally `DENY` if you want deny semantics now)
- audit: `createdAt`, `createdBy?`

Constraints:

- unique `(tenantId, roleId, permissionKey)`
- index `(tenantId, roleId)`

### 2.3 Membership ↔ Role assignment (only if missing)

If your system already has membership tables, reuse them.
If not, introduce:

- `Membership` (tenantId + userId) and `MembershipRole` join table

But keep the scope tight: role permission UI can ship even if membership UI is minimal, as long as API can attach roles to the current user at auth time.

---

# 3) Backend API implementation (NestJS)

## 3.1 Contracts (shared types)

Add to `packages/contracts`:

- Permission catalog DTOs:
  - `PermissionDefinition { key, group, label, description?, danger? }`
  - `PermissionGroup { id, label, permissions: PermissionDefinition[] }`

- Role DTOs:
  - `Role { id, name, description?, isSystem }`

- Grant DTOs:
  - `RolePermissionState { key, granted: boolean, effect?: "ALLOW"|"DENY" }`
  - `UpdateRolePermissionsRequest { grants: { key, effect }[] }` (bulk replace)

Prefer Zod schemas if that’s your pattern.

## 3.2 Permission catalog registry (module-defined)

Create a simple registry that aggregates permissions contributed by modules.

Suggested approach:

- Each domain module exports a `permissionCatalog` array (in API code and/or in `packages/contracts`).
- The Identity module exposes an endpoint returning the **merged catalog**.

Rules:

- Catalog is **code-only**: no DB table for permissions in v1.
- Add a boot-time validation:
  - keys unique
  - groups non-empty
  - no forbidden characters
  - stable ordering

## 3.3 Ports & adapters (hexagonal)

Define ports in `services/api/src/modules/identity/.../ports`:

- `RoleRepositoryPort`
  - `findByTenant`, `findById`, `create`, `update`, `delete`

- `RolePermissionGrantRepositoryPort`
  - `listByRole(tenantId, roleId)`
  - `replaceAll(tenantId, roleId, grants)` (transactional)

- `PermissionCatalogPort`
  - `getCatalog()`

Adapters:

- Prisma adapters in the identity module infra folder (or wherever your data adapters live), consistent with existing patterns.

## 3.4 Use-cases (application layer)

Implement use-cases that enforce invariants:

- `CreateRoleUseCase`
  - validate name uniqueness per tenant
  - prevent reserved names if needed

- `UpdateRoleUseCase`
  - block rename of system roles if policy says so

- `DeleteRoleUseCase`
  - block delete if role is system or assigned to members (unless forced)

- `GetPermissionCatalogUseCase`
- `GetRolePermissionsUseCase`
  - returns catalog + which keys are granted for that role

- `UpdateRolePermissionsUseCase`
  - **bulk replace** grants
  - validate all keys exist in catalog (reject unknown keys)
  - write an audit log event (even if minimal)

## 3.5 Controllers (HTTP endpoints)

Add endpoints under something like `/identity`:

- `GET /identity/permissions/catalog`
  - returns grouped catalog

- `GET /identity/roles`
- `POST /identity/roles`
- `PATCH /identity/roles/:roleId`
- `DELETE /identity/roles/:roleId`
- `GET /identity/roles/:roleId/permissions`
  - returns `{ role, catalog, grantedKeys/effects }`

- `PUT /identity/roles/:roleId/permissions`
  - bulk replace

### Security rules

- Only users with `settings.roles.manage` (or equivalent) can access these endpoints.
- Always tenant-scope everything (derive `tenantId` from auth context, never from client input).
- Return sanitized errors using your standard exception pattern (use your `UserFriendlyError` mechanism for validation-level messages).

## 3.6 Permission checking & guards

Implement or extend a central permission guard:

- On each request, resolve `currentUser` membership roles, then compute effective permissions:
  - union of all role grants
  - (optional deny semantics if implemented)

- Add caching only if you already have an established cache layer; otherwise keep it correct and simple first.
- Ensure this works for both:
  - route-level decorators (e.g. `@RequirePermission('settings.roles.manage')`)
  - programmatic checks inside use-cases for sensitive operations

---

# 4) Frontend (apps/webs) implementation

## 4.1 Routing & navigation

Add screens in `apps/webs/src/modules/settings`:

- `screens/RolesScreen.tsx` (list roles)
- `screens/RolePermissionsScreen.tsx` or a modal/drawer component:
  - ABP-style: left group list, right permission checkboxes

Add routes in `modules/settings/routes.tsx` and link from Settings navigation.

## 4.2 API client hooks

Create hooks under:

- `apps/webs/src/modules/settings/hooks/`
  - `useRoles()`
  - `usePermissionCatalog()` (or fetched via role permissions endpoint)
  - `useRolePermissions(roleId)`
  - `useUpdateRolePermissions(roleId)`

Use the existing `shared/api/httpClient.ts` conventions (and react-query/tanstack-query if present). Keep all fetch logic centralized.

## 4.3 UI behavior (must-have)

### Roles list

- Table with: Role name, description, system badge, actions:
  - “Edit”
  - “Permissions”
  - “Delete” (disabled if system or assigned)

- Create role button (modal)

### Role permissions editor

- Layout:
  - Left sidebar: permission groups (e.g. Invoices, Expenses, Clients, Settings)
  - Right panel:
    - search box (filters within group)
    - checkbox list
    - optional “Select all in group”

- Save model:
  - Track dirty state
  - On save: call `PUT /identity/roles/:id/permissions` with full list of granted keys
  - Optimistic UI is optional; correctness first

### UX details

- Show a count: “X / Y permissions enabled”
- Disable checkboxes if role is system and you want system roles immutable (policy decision)
- Handle API validation errors gracefully (toast/banner using your standard components)

## 4.4 No POS changes

Do not add any code under `apps/pos` or RN packages. The feature is web-only.

---

# 5) Seeding & defaults

If your tenant/workspace onboarding exists, add default roles for new tenants:

- Owner (all permissions)
- Admin (most)
- Accountant (finance-related)
- Staff (limited)
- Read-only

Implement this as:

- a backend “tenant provisioner” step, or
- a seed script used in dev/mock-server, consistent with existing patterns

Make seeding idempotent.

---

# 6) Testing requirements (minimum)

Backend:

- Unit tests:
  - catalog validation (duplicate keys fail)
  - update role permissions rejects unknown keys

- Integration tests:
  - tenant scoping cannot read/write another tenant’s role
  - authorization guard blocks non-admin

Frontend:

- Basic rendering + interaction test for permission editor (at least one happy path)
- Ensure the Settings routes are protected by permissions (or by “admin-only” guard if that’s your current model)

---

# 7) Acceptance criteria

- Admin can create a role, open permissions editor, toggle permissions, save
- After saving, API guard respects the permission immediately (e.g., remove `clients.write` and client creation fails with 403)
- Unknown permission keys cannot be saved
- Everything is tenant-scoped
- Feature exists only in **services/api** and **apps/webs** (+ `packages/contracts`), not POS

---

# 8) Deliverables

1. Prisma migration + updated schema
2. New Identity module (or clean extension) with ports/adapters/use-cases/controllers
3. Web UI under Settings: roles list + role permissions editor
4. Shared contracts updated
5. Minimal tests + short README notes (how to add permissions in a new module)

**Important implementation rule:** keep permissions **owned by modules**. When you add a new module later (e.g., Inventory), it must be able to export its permission definitions and automatically appear in the Role Permissions UI without editing the UI logic beyond adding the new group to the catalog registry.
