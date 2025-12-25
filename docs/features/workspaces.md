# Workspace Feature Map

## Overview

Workspaces are the fundamental organizational unit within Kerniflow, representing a legal entity (company or personal/freelancer) for which invoices, expenses, and other business operations are managed. Each workspace has its own settings, members, and data scoping.

## History / Intent

### Commit: 9c1c531 (Dec 22, 2025)

**"Add workspace frontend flows and tests"**

This commit introduced the complete frontend workspace infrastructure:

- Created comprehensive workspace contracts/schemas in `packages/contracts/src/workspaces/`
- Implemented onboarding and settings UI flows
- Added workspace provider, store, and API client
- Created E2E tests with Playwright

### Commit: 6c11bf9 (Dec 22, 2025)

**"Fix typecheck failures and add workspace module mappings"**

This commit fixed TypeScript configuration and module mappings to support the workspace types throughout the application.

### Design Intent (Inferred from Contracts & Frontend)

Based on the contracts, UI flows, and existing tenant architecture:

1. **Workspace-Tenant Relationship**: Workspaces are 1:N with Tenants
   - Multiple workspaces can exist within a single tenant
   - Each user (via tenant membership) can access/create multiple workspaces
   - Active workspace is stored client-side (localStorage) and selected per session

2. **Workspace is Required on First Login**:
   - New users without workspaces are redirected to `/onboarding`
   - Onboarding creates first workspace (3-step wizard)
   - After onboarding, user is redirected to `/dashboard`
   - The `WorkspaceOnboardingPage` component explicitly checks `if (workspaces.length > 0)` and redirects

3. **Workspace Membership Model**:
   - Each workspace has its own membership system (separate from tenant membership)
   - Roles: OWNER, ADMIN, MEMBER, ACCOUNTANT, VIEWER
   - Statuses: ACTIVE, INVITED, DISABLED
   - Creating a workspace returns both `workspace` and `membership` (creator becomes OWNER)

4. **Onboarding Status Machine**:
   - Status flow: NEW → PROFILE → TAX → BANK → DONE
   - Frontend wizard has 3 steps but backend tracks more granular progression
   - Onboarding completion is optional (workspace is usable even if status != DONE)

5. **Workspace Scope**:
   - Workspaces contain: legal details, address, tax ID, bank account, invoice settings
   - All business data (invoices, expenses, etc.) should be scoped to workspaceId (future)
   - Currently, data is scoped to tenantId; workspace adds a sub-scoping layer

## Frontend Implementation Status

### ✅ Completed (Frontend)

**Contracts (`packages/contracts/src/workspaces/`)**:

- `workspace.types.ts` - Core domain types (WorkspaceDto, WorkspaceMembershipDto, etc.)
- `create-workspace.schema.ts` - CreateWorkspaceInput/Output with idempotency support
- `update-workspace.schema.ts` - UpdateWorkspaceInput/Output (partial profile update)
- `list-workspaces.schema.ts` - ListWorkspacesOutput
- `get-workspace.schema.ts` - GetWorkspaceOutput
- `workspace-members.schema.ts` - Member listing and management
- `workspace-invites.schema.ts` - Invite creation and acceptance
- `workspace-onboarding.schema.ts` - Onboarding status tracking

**UI Components**:

- `WorkspaceOnboardingPage` - 3-step wizard (Workspace → Legal/Address → Tax/Bank)
- `WorkspaceSettingsPage` - Update workspace profile, address, tax info
- `WorkspaceMembersPage` - Manage workspace members (UI exists)
- `WorkspaceSwitcher` - Dropdown to switch between workspaces
- `workspace-provider.tsx` - React context providing workspace state
- `workspace-store.ts` - Client-side active workspace persistence (localStorage)

**API Client (`apps/web/src/shared/workspaces/workspaces-api.ts`)**:

- `listWorkspaces()` → GET /workspaces
- `createWorkspace(input)` → POST /workspaces
- `updateWorkspace(id, input)` → PATCH /workspaces/:id
- `listMembers(id)` → GET /workspaces/:id/members
- `inviteMember(id, input)` → POST /workspaces/:id/invites
- `acceptInvite(token)` → POST /invites/:token/accept
- `getOnboardingStatus(id)` → GET /workspaces/:id/onboarding

**Routing**:

- `/onboarding` - Workspace creation wizard
- `/settings/workspace` - Workspace settings
- `/settings/members` - Workspace members

**E2E Tests** (`apps/e2e/tests/workspaces.spec.ts`):

- Workspace switcher functionality
- Onboarding redirect when no workspaces
- Workspace creation flow

### ❌ Missing (Backend)

1. **Prisma Schema**: No `Workspace`, `WorkspaceMembership`, `WorkspaceInvite` models
2. **NestJS Module**: No `services/api/src/modules/workspaces/` implementation
3. **API Endpoints**: All workspace endpoints return 404
4. **Database Migration**: No migrations for workspace tables
5. **Backend Tests**: No unit/integration tests for workspace logic
6. **Mock Server**: No workspace routes in mock server

## Required API Endpoints (v1)

Based on frontend usage:

### Core Workspace Operations

1. **POST /workspaces**
   - Input: `CreateWorkspaceInput` (name, kind, legalName, address, etc.)
   - Output: `CreateWorkspaceOutput` (workspace + membership)
   - Auth: Requires authenticated user + tenant context
   - Behavior: Creates workspace, auto-creates OWNER membership for creator
   - Idempotency: Supports `idempotencyKey` in input

2. **GET /workspaces**
   - Output: `ListWorkspacesOutput` (array of workspaces)
   - Scoping: Returns workspaces user has membership in (within current tenant)

3. **GET /workspaces/:workspaceId**
   - Output: `GetWorkspaceOutput` (single workspace)
   - Auth: User must have membership in workspace

4. **PATCH /workspaces/:workspaceId**
   - Input: `UpdateWorkspaceInput` (partial profile update)
   - Output: `UpdateWorkspaceOutput` (updated workspace)
   - Auth: User must have OWNER or ADMIN role
   - Idempotency: Supports `idempotencyKey`

### Workspace Membership

5. **GET /workspaces/:workspaceId/members**
   - Output: `ListWorkspaceMembersOutput`
   - Returns members with user info (name, email)

6. **POST /workspaces/:workspaceId/invites**
   - Input: `CreateWorkspaceInviteInput` (email, role)
   - Output: `CreateWorkspaceInviteOutput` (invite with token)
   - Auth: Requires OWNER or ADMIN role

7. **POST /invites/:token/accept**
   - Input: `AcceptWorkspaceInviteInput` (token from email)
   - Output: `AcceptWorkspaceInviteOutput` (membership created)
   - Auth: Authenticated user

### Onboarding (Optional for v1)

8. **GET /workspaces/:workspaceId/onboarding**
   - Output: `WorkspaceOnboardingStatusResponse`
   - Returns status, missing fields, next step

## Data Model

### Workspace

```prisma
model Workspace {
  id                     String   @id @default(cuid())
  tenantId               String
  name                   String
  kind                   WorkspaceKind  // PERSONAL, COMPANY
  legalName              String?
  countryCode            String?  @db.Char(2)
  currency               String?  @db.Char(3)
  taxId                  String?
  onboardingStatus       WorkspaceOnboardingStatus @default(NEW)
  onboardingCompletedAt  DateTime? @db.Timestamptz(6)
  createdAt              DateTime @default(now()) @db.Timestamptz(6)
  updatedAt              DateTime @updatedAt @db.Timestamptz(6)

  // JSON fields for flexibility
  address                Json?  // WorkspaceAddress
  bankAccount            Json?  // WorkspaceBankAccount
  invoiceSettings        Json?  // WorkspaceInvoiceSettings

  // Relations
  tenant                 Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  memberships            WorkspaceMembership[]
  invites                WorkspaceInvite[]

  @@unique([tenantId, name])
  @@index([tenantId])
  @@index([tenantId, createdAt])
}
```

### WorkspaceMembership

```prisma
model WorkspaceMembership {
  id           String   @id @default(cuid())
  workspaceId  String
  userId       String
  role         WorkspaceMembershipRole  // OWNER, ADMIN, MEMBER, ACCOUNTANT, VIEWER
  status       WorkspaceMembershipStatus @default(ACTIVE)  // ACTIVE, INVITED, DISABLED
  createdAt    DateTime @default(now()) @db.Timestamptz(6)

  workspace    Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  user         User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([workspaceId, userId])
  @@index([workspaceId])
  @@index([userId])
  @@index([workspaceId, status])
}
```

### WorkspaceInvite

```prisma
model WorkspaceInvite {
  id               String   @id @default(cuid())
  workspaceId      String
  email            String
  role             WorkspaceMembershipRole
  status           WorkspaceInviteStatus @default(PENDING)
  token            String @unique
  expiresAt        DateTime @db.Timestamptz(6)
  acceptedAt       DateTime? @db.Timestamptz(6)
  createdByUserId  String?
  createdAt        DateTime @default(now()) @db.Timestamptz(6)

  workspace        Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@index([workspaceId])
  @@index([email])
  @@index([token])
  @@index([status, expiresAt])
}
```

### Enums

```prisma
enum WorkspaceKind {
  PERSONAL
  COMPANY
}

enum WorkspaceMembershipRole {
  OWNER
  ADMIN
  MEMBER
  ACCOUNTANT
  VIEWER
}

enum WorkspaceMembershipStatus {
  ACTIVE
  INVITED
  DISABLED
}

enum WorkspaceInviteStatus {
  PENDING
  ACCEPTED
  EXPIRED
  CANCELED
}

enum WorkspaceOnboardingStatus {
  NEW
  PROFILE
  TAX
  BANK
  DONE
}
```

## Authorization Rules

1. **Workspace Creation**: Any authenticated user with tenant membership can create workspaces
2. **Workspace Read**: User must have active membership in the workspace
3. **Workspace Update**: User must have OWNER or ADMIN role
4. **Workspace Delete**: OWNER only (future feature)
5. **Member Management**: OWNER or ADMIN can invite/remove members
6. **Invite Acceptance**: Any authenticated user can accept invite sent to their email

## Tenant Scoping

**Critical**: All workspace queries MUST filter by `tenantId` from auth context.

- User's tenant is derived from JWT/session
- Workspace creation auto-assigns `tenantId` from auth context
- List/Get operations filter by both tenantId AND user membership
- No workspace data should leak across tenant boundaries

## Implementation Status

### ✅ Completed

1. **Documentation**: Created comprehensive feature map with history/intent
2. **Prisma Schema**:
   - Added `LegalEntity` model (normalized table for legal/tax identity)
   - Added `Workspace` model (references LegalEntity)
   - Added `WorkspaceMembership` model
   - Added `WorkspaceInvite` model
   - Migration generated: `20251225_add_workspaces_and_legal_entities`
3. **Backend Implementation**:
   - ✅ Domain entities ([workspace.entity.ts](../../services/api/src/modules/workspaces/domain/workspace.entity.ts))
   - ✅ Repository port ([workspace-repository.port.ts](../../services/api/src/modules/workspaces/application/ports/workspace-repository.port.ts))
   - ✅ Prisma adapter ([prisma-workspace-repository.adapter.ts](../../services/api/src/modules/workspaces/infrastructure/adapters/prisma-workspace-repository.adapter.ts))
   - ✅ Use cases:
     - CreateWorkspaceUseCase (with idempotency)
     - ListWorkspacesUseCase
     - GetWorkspaceUseCase (with authorization)
     - UpdateWorkspaceUseCase (with idempotency)
   - ✅ HTTP Controller ([workspaces.controller.ts](../../services/api/src/modules/workspaces/adapters/http/workspaces.controller.ts))
   - ✅ NestJS Module ([workspaces.module.ts](../../services/api/src/modules/workspaces/workspaces.module.ts))
   - ✅ Registered in AppModule
4. **Frontend**: Already implemented (contracts, UI, API client)
5. **Tests**:
   - ✅ Unit test for CreateWorkspaceUseCase
   - ✅ Integration test for full workspace flow
   - ⏳ E2E tests for API endpoints (pending)
6. **Build**: TypeScript compilation passes (no workspace errors)

### ⏳ Pending / Future Work

1. **Mock Server**: Add workspace routes to `services/mock-server` (if it exists)
2. **Additional Use Cases** (not required for v1):
   - Invite management (CreateInviteUseCase, AcceptInviteUseCase)
   - Member management (ListMembersUseCase, RemoveMemberUseCase)
   - Onboarding status tracking (GetOnboardingStatusUseCase)
3. **Seed Data**: Add test workspaces to dev/test seeding scripts
4. **Future Enhancements**:
   - Workspace deletion (soft delete)
   - Cross-workspace data queries for tenant admins
   - Workspace-scoped data (add `workspaceId` to Invoice, Expense, etc.)

## Open Questions / Future Enhancements

1. **Workspace-scoped data**: Should invoices/expenses be scoped to workspace instead of tenant?
   - Currently all data is tenant-scoped
   - Workspace adds a "company" grouping layer
   - Future: Add `workspaceId` to Invoice, Expense, Customer models

2. **Default workspace**: Should tenant have a default workspace concept?
   - Currently active workspace is client-side only
   - Backend could persist user's last selected workspace

3. **Workspace deletion**: What happens to workspace data on delete?
   - Soft delete vs hard delete?
   - Cascade to members, invites?
   - What about invoices/expenses if workspace-scoped?

4. **Cross-workspace visibility**: Can ADMIN users see all workspaces in tenant?
   - Current design: No (membership required)
   - Alternative: Tenant OWNER sees all workspaces

## References

- Frontend Contracts: [packages/contracts/src/workspaces/](../../packages/contracts/src/workspaces/)
- Frontend UI: [apps/web/src/modules/workspaces/](../../apps/web/src/modules/workspaces/)
- API Client: [apps/web/src/shared/workspaces/workspaces-api.ts](../../apps/web/src/shared/workspaces/workspaces-api.ts)
- E2E Tests: [apps/e2e/tests/workspaces.spec.ts](../../apps/e2e/tests/workspaces.spec.ts)
