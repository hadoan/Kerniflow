### Prompt: Analyze `party-crm` module and decide **Rename to `crm`** vs **Split into `party` + `crm`** (DDD + RBAC safe)

You are an expert DDD/NestJS/Prisma + Vite-React architect working in the Corely monorepo. We currently have a module folder named **`party-crm`** (or similarly named). Your task is to **analyze the actual repository state** and make a **correct, low-risk decision**:

- **Option 1:** Rename `party-crm` → `crm`
- **Option 2:** Split into two bounded contexts: `party` (Tier 0 kernel) + `crm` (Tier 2 revenue engine, depends on party)
- **Option 3:** Keep as-is for now, but introduce a migration plan

This is a **core platform decision** that impacts Apps/Templates/Packs entitlements, menu composition, and RBAC. Do not guess. Verify by scanning the repo and database schema.

---

## 0) Hard rules (must follow)

1. **Bounded-context integrity**
   - A module owns its entities/use-cases/migrations/APIs. Avoid “one giant model”.

2. **Stable identifiers**
   - Treat `appId` as stable (especially once tenant installs exist). Folder renames are cheaper than `appId` changes.

3. **RBAC & tenant isolation**
   - Any changes to module naming must not weaken authorization checks, permission namespaces, or tenant scoping.

4. **No breaking API routes by accident**
   - If there are existing route paths used by UI/POS, keep compatibility or provide redirect/migration strategy.

5. **No cross-module DB writes**
   - If splitting, move ownership cleanly; other modules integrate via APIs/events/contracts.

---

## 1) Locate the module(s) and map the current reality (no assumptions)

### A) Find actual module folders and references

Search for:

- `party-crm` folder(s) in:
  - `services/api/src/modules/**`
  - `apps/webs/src/modules/**`
  - `packages/contracts/src/**`

- Any manifest/registry entries (if already added) that reference `party-crm`
- Any routes or navigation keys referencing it (e.g., label keys, menu items)

**Output:** a short table listing:

- module folder path(s)
- current “public name” used in UI
- route prefixes (API + web)
- current permission namespace(s) (e.g., `party.*`, `crm.*`, `clients.*`)
- whether it’s included in any “menu composition” logic

### B) Identify what the module contains: Party primitives vs CRM primitives

Create an inventory of concepts in the module:

**Party primitives** (kernel/Tier 0):

- Party / Organization / Person
- PartyRole (customer/supplier/employee)
- ContactPoint (email/phone), Address
- Relationship / membership
- Notes, tags (if generic)
- Merge/dedupe, identity linking

**CRM primitives** (Tier 2):

- Lead, Deal/Opportunity
- Pipeline, Stage, Win/Loss
- Activities (calls/emails/tasks), follow-ups
- Forecasting, scoring

**Output:** a “Concept ownership map”:

- ✅ “belongs to Party”
- ✅ “belongs to CRM”
- ⚠️ “mixed/unclear” (explain why)

---

## 2) Check coupling: who depends on what (this determines the correct boundary)

### A) Dependency scan (imports + contracts)

Search for usage of `party-crm` (and related types/ports) from other modules:

- `invoices`, `expenses`, `clients/customers`, `tenants`, `auth`, `workflow`, etc.

Classify dependencies:

1. **Many modules need Party** (invoice needs customer, expense needs employee/vendor, etc.)
2. **Only sales pipeline needs CRM**
3. **Other modules import CRM stuff** (bad smell; should not happen)

**Output:** dependency graph:

- “X depends on Party”
- “Y depends on CRM”
- “Party depends on CRM” (should be NO)
- “CRM depends on Party” (expected YES)

### B) Database schema ownership

Inspect Prisma schema(s) and migrations:

- List tables/models owned by `party-crm`
- Identify which are Party vs CRM
- Check foreign keys from other modules into these tables (e.g., invoice references `partyId`)

**Output:** table ownership map + cross-module FK list.

---

## 3) Check product compatibility constraints (what would break if we rename/split)

### A) API surface compatibility

List current endpoints:

- Party-related endpoints (customers/contacts/suppliers)
- CRM endpoints (pipelines/leads/deals)
  Record:
- route prefixes
- DTOs/contracts used by frontend
- whether any endpoints are used by other services or worker jobs

### B) Frontend routing + UI labels

In `apps/webs`:

- Locate module `routes.tsx` and usage in router composition
- Identify menu/nav labels & i18n keys
- Identify any deep links/bookmarks likely to exist

### C) RBAC namespace + permission keys

Inventory permission keys and enforcement points:

- existing permission constants in frontend (`shared/lib/permissions.ts`)
- backend guards/policies for the module
- any “role templates” that include these permissions

**Output:** “Compatibility Risk Checklist” with “will break / won’t break / needs alias”.

---

## 4) Decision criteria (choose the correct option)

After the scan, decide using this matrix:

### Choose **Split into `party` + `crm`** if ANY is true:

- The module includes Party primitives (customers/suppliers/contacts) AND those are used outside CRM
- Invoices/Expenses/Accounting/Inventory (or soon) need Party
- You see many imports/FKs that represent _Party as a shared kernel primitive_
- You want Apps/Templates/Packs to enable CRM without affecting Party (common in SMB baseline)

**Boundary rule:** `crm` **depends on** `party`, never the reverse.

### Choose **Rename to `crm`** only if ALL are true:

- The module contains **only CRM concepts**
- Party primitives are already in a separate module (e.g., `party` or `clients`) that is the shared kernel
- There are no cross-module references implying Party is inside `party-crm`

### Choose **Keep `party-crm` for now** if:

- It’s very early and code is heavily intertwined, and splitting now would create churn
- BUT you must document a plan with milestones to split later

---

## 5) If your decision is “Split”: produce a safe refactor & migration plan

Create a step-by-step plan that minimizes breakage:

### A) Target architecture

- New module: `party`
  - owns Party entities, ports, repositories, API endpoints for Party

- New module: `crm`
  - owns pipeline/leads/deals/activities
  - references Party via `partyId` and Party read APIs/ports/contracts

### B) Migration strategy options (pick one and justify)

1. **Logical split without DB table rename (fastest)**
   - Keep existing tables but re-home repositories and API under new module boundaries
   - Later do DB rename if needed

2. **Full schema split (cleanest)**
   - Move/rename tables with expand/contract migration
   - Provide transitional views/aliases if required

### C) Compatibility layer (if needed)

If `appId="party-crm"` already exists anywhere (e.g., tenant install records / feature flags / menu overrides):

- Keep `party-crm` as a **legacy alias** `appId` or map it to new `party`+`crm` in the entitlement resolver
- Avoid breaking tenant installs by silently changing `appId`

### D) RBAC changes

- Define permission namespaces:
  - `party.*` (view/manage contacts)
  - `crm.*` (pipeline/deals)

- Provide a migration mapping:
  - old permissions → new permissions
  - ensure existing admin roles still work

### E) Menu changes

- Party shows under a “Contacts”/“Directory” section
- CRM shows under “Sales”
- Ensure server-driven menu filters by:
  - tenant app enablement
  - required permissions

**Output:** a “Split Implementation Plan” with:

- file move map (API + Web + contracts)
- DB changes (if any)
- endpoint compatibility plan
- RBAC mapping
- menu contribution updates
- testing checklist

---

## 6) If your decision is “Rename”: produce the rename plan with zero mistakes

If renaming folder/module to `crm`:

- Confirm Party is NOT inside it
- Determine whether the **stable id** remains `party-crm` or becomes `crm`
  - If any tenant install/config uses `party-crm`, keep `appId` stable and only change folder/UI label

- Update:
  - folder names
  - imports
  - routes
  - menu contribution ids (don’t change ids if persisted)
  - i18n keys (prefer not breaking keys; alias if needed)
  - docs

**Output:** “Rename Plan” with a grep-based checklist and a list of mechanical refactors.

---

## 7) Required deliverables (you must output these)

1. **Decision document (ADR)**
   Create: `docs/decisions/ADR-XXXX-party-crm-boundary.md` containing:

- Context
- Findings (inventory + dependency graph)
- Options considered (rename vs split vs keep)
- Decision
- Consequences
- Migration plan + compatibility strategy
- Risks + mitigations
- Rollback strategy

2. **Implementation checklist**
   Create: `docs/platform/party-vs-crm-implementation-checklist.md`

- step-by-step tasks
- “do not break” constraints
- test plan

3. **Concrete recommendation**
   Summarize in 10–15 lines:

- What we will do now
- What we will do later (if phased)
- What identifiers remain stable (`appId`, route prefixes, permission namespaces)

---

## 8) Tests & validation (must not skip)

- API:
  - RBAC denies unauthorized actions (party + crm)
  - tenant scoping enforced
  - no route regressions (if compatibility promised)

- UI:
  - menu renders correctly per tenant enablement and permissions
  - route guard behavior on disabled apps: friendly “not enabled” screen

- DB:
  - migration applies cleanly
  - no orphaned FKs if schema split

- Contracts:
  - any shared DTO changes are backwards compatible or versioned

---

## 9) Final instruction: do not “decide by taste”

Do not base the decision on naming preference. Base it on:

- actual entities present
- dependency graph
- DB ownership
- whether Party is a kernel primitive used widely

Make the **lowest-risk decision** that preserves DDD boundaries and keeps `appId` stable for tenant installs.

---

If you follow the above, your final output should be:
✅ ADR + checklist + a clear “Split vs Rename” decision grounded in repo evidence.
