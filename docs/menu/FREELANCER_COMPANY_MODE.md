# Freelancer vs Company UI Mode Implementation

## Overview

This implementation provides a **server-driven, template-based UI configuration system** that adapts the entire application's navigation, features, and terminology based on the workspace's business mode (**PERSONAL** = Freelancer, **COMPANY** = Company).

**Key Principle:** **Configuration before forks** - No code duplication, no parallel UIs, just smart server-driven configuration.

---

## Architecture

### Core Concept: WorkspaceConfig

The `WorkspaceConfig` is a single server-computed response that contains everything the frontend needs to render the entire AppShell:

```typescript
interface WorkspaceConfig {
  workspaceId: string;
  kind: "PERSONAL" | "COMPANY";
  navigation: NavigationConfig; // Grouped menu structure
  home: HomeConfig; // Dashboard widgets
  capabilities: Capabilities; // Feature flags (workspace.multiUser, sales.quotes, etc.)
  terminology: Terminology; // UI labels (Client vs Customer, etc.)
  currentUser: {
    membershipRole: "OWNER" | "ADMIN" | "MEMBER" | "ACCOUNTANT" | "VIEWER";
    isWorkspaceAdmin: boolean;
  };
}
```

### Server-Side Computation

**Location:** [services/api/src/modules/platform/application/use-cases/get-workspace-config.usecase.ts](./services/api/src/modules/platform/application/use-cases/get-workspace-config.usecase.ts)

The `GetWorkspaceConfigUseCase` computes configuration from:

1. **Workspace.legalEntity.kind** → determines base template (PERSONAL/COMPANY)
2. **TenantAppInstall** → which modules are enabled
3. **RBAC permissions** → filters navigation items user can't access
4. **TenantMenuOverride** → applies customizations (hide/reorder/rename)

---

## File Locations

### Backend

| File                                                                                      | Purpose                                     |
| ----------------------------------------------------------------------------------------- | ------------------------------------------- |
| `packages/contracts/src/workspaces/workspace-config.schema.ts`                            | **WorkspaceConfig contract** (shared FE/BE) |
| `services/api/src/modules/platform/application/services/workspace-template.service.ts`    | **Templates** for Freelancer/Company modes  |
| `services/api/src/modules/platform/application/use-cases/get-workspace-config.usecase.ts` | **Use case** to compute WorkspaceConfig     |
| `services/api/src/modules/platform/adapters/http/workspace-config.controller.ts`          | **Endpoint:** `GET /workspaces/:id/config`  |
| `services/api/src/modules/platform/platform.module.ts`                                    | DI registration                             |

### Frontend

| File                                                           | Purpose                                                     |
| -------------------------------------------------------------- | ----------------------------------------------------------- |
| `apps/web/src/shared/workspaces/workspace-config-provider.tsx` | **WorkspaceConfig provider** + hooks (`useWorkspaceConfig`) |
| `apps/web/src/shared/workspaces/navigation.ts`                 | **Navigation filtering** for capability-gated groups        |
| `apps/web/src/app/AppSidebar.tsx`                              | **Navigation rendering** from WorkspaceConfig groups        |
| `apps/web/src/modules/core/screens/DashboardPage.tsx`          | **Example:** Capability-driven quick actions                |

---

## How It Works

### 1. Data Model (No Migration Needed!)

- **`LegalEntity.kind`** already exists: `"PERSONAL"` or `"COMPANY"`
- **`Workspace.legalEntity`** relation already in place
- **`GET /workspaces`** already returns `kind` field

### 2. Template Selection

**Freelancer Template (`PERSONAL` kind):**

- **Navigation:** Flat structure (Dashboard, Invoices, Expenses, Clients, Assistant, Settings)
- **Capabilities:** `ai.copilot`, `time.tracking`, `sales.projects`, `tax.vatReporting` = true; rest = false
- **Terminology:** "Client" (not "Customer")
- **Home Widgets:** Quick actions for invoices/expenses, AI assistant prominent

**Company Template (`COMPANY` kind):**

- **Navigation:** Grouped by domain (Core, Sales, Purchasing, Inventory, Finance, Admin)
- **Capabilities:** `workspace.multiUser`, `workspace.rbac`, `approvals`, `sales.quotes`, `inventory.basic`, `finance.costCenters` = true
- **Terminology:** "Customer" (not "Client")
- **Home Widgets:** KPI overview, sales pipeline, approvals queue

### 3. Backend Flow

```
GET /workspaces/<id>/config?scope=web
  ↓
GetWorkspaceConfigUseCase
  ↓
1. Fetch Workspace + LegalEntity (determines kind)
  ↓
2. WorkspaceTemplateService.getDefaultCapabilities(kind)
3. WorkspaceTemplateService.getDefaultTerminology(kind)
4. WorkspaceTemplateService.getNavigationGroupsStructure(kind)
  ↓
5. MenuComposerService.composeMenu() // Filters by apps, permissions, capabilities
  ↓
6. Organize menu items into navigation groups
  ↓
7. Return WorkspaceConfig
```

### 4. Frontend Flow

```
App Start
  ↓
WorkspaceConfigProvider fetches /workspaces/:id/config
  ↓
AppSidebar reads navigation.groups → renders menu
  ↓
Dashboard reads capabilities → shows/hides quick actions
  ↓
Modules use useWorkspaceConfig() → adapt UI
```

---

## Usage Examples

### Module: Adapt UI Based on Capabilities

```typescript
// apps/web/src/modules/invoices/screens/InvoiceForm.tsx
import { useWorkspaceConfig } from "@/shared/workspaces/workspace-config-provider";

function InvoiceForm() {
  const { config, hasCapability } = useWorkspaceConfig();
  const terminology = config?.terminology ?? {
    partyLabel: "Client",
    invoiceLabel: "Invoice",
  };

  return (
    <form>
      <h2>Create {terminology.invoiceLabel}</h2>

      {/* Show advanced fields only for company mode */}
      {hasCapability("invoices.advanced") && (
        <div>
          <Input label="Payment Terms (Days)" />
          <Input label="VAT ID" />
        </div>
      )}

      {/* Label adapts: Client vs Customer */}
      <Select label={terminology.partyLabel}>
        {/* ... */}
      </Select>
    </form>
  );
}
```

### Navigation: Server-Driven Groups

The AppSidebar automatically renders navigation from WorkspaceConfig:

- **Freelancer:** Minimal groups (Core + Settings)
- **Company:** Sections grouped (Sales, Purchasing, Finance, etc.)

No hardcoded "if freelancer" checks in frontend!

---

## Customization Points

### 1. Add New Capability

**Backend:**

```typescript
// packages/contracts/src/workspaces/workspace-config.schema.ts
export const WorkspaceCapabilitiesSchema = z.object({
  // ... existing
  "my.feature": z.boolean().describe("My new feature"),
});

// services/api/src/modules/platform/application/services/workspace-template.service.ts
private getFreelancerCapabilities(): WorkspaceCapabilities {
  return {
    // ... existing
    "my.feature": false, // disabled for freelancers
  };
}

private getCompanyCapabilities(): WorkspaceCapabilities {
  return {
    // ... existing
    "my.feature": true, // enabled for companies
  };
}
```

**Frontend:**

```typescript
// apps/web/src/modules/my-module/MyComponent.tsx
const { hasCapability } = useWorkspaceConfig();

{hasCapability("my.feature") && (
  <MyNewFeatureComponent />
)}
```

### 2. Add New Terminology

**Backend:**

```typescript
// packages/contracts/src/workspaces/workspace-config.schema.ts
export const WorkspaceTerminologySchema = z.object({
  // ... existing
  myLabel: z.string().default("Default Label"),
});

// services/api/src/modules/platform/application/services/workspace-template.service.ts
getDefaultTerminology(kind: WorkspaceKind): WorkspaceTerminology {
  if (kind === "PERSONAL") {
    return { /* ... */, myLabel: "Freelancer Term" };
  }
  return { /* ... */, myLabel: "Company Term" };
}
```

**Frontend:**

```typescript
const terminology = config?.terminology;
<h1>{terminology?.myLabel}</h1>
```

### 3. Customize Navigation Groups

**Backend:**

```typescript
// services/api/src/modules/platform/application/services/workspace-template.service.ts
private getCompanyNavigationStructure(): NavigationGroupStructure[] {
  return [
    {
      id: "my-new-group",
      labelKey: "nav.groups.myNewGroup",
      defaultLabel: "My New Group",
      order: 5,
      sectionOrder: ["section-a", "section-b"],
    },
    // ... other groups
  ];
}
```

Menu items with `section: "section-a"` will automatically appear in this group!

---

## Upgrade Path: Freelancer → Company

### Current Implementation

- **Upgrade endpoint:** `POST /workspaces/:id/upgrade` (admin-only)
- **Workspace.legalEntity.kind** is updated to `COMPANY`
- WorkspaceConfig recalculates on next fetch
- Frontend automatically re-renders navigation/capabilities

---

## Testing

### Backend Tests

```typescript
// services/api/src/modules/platform/__tests__/workspace-template.service.spec.ts
// services/api/src/modules/workspaces/__tests__/workspaces-api.int.test.ts
```

### Frontend Tests

```typescript
// apps/web/src/shared/workspaces/navigation.spec.ts
```

---

## Benefits Achieved

✅ **No code duplication:** Single codebase serves both modes
✅ **Server-driven:** Configuration computed based on data, not hardcoded logic
✅ **RBAC-aware:** Navigation automatically filtered by permissions
✅ **Extensible:** Add capabilities/terminology without touching modules
✅ **Type-safe:** Shared contracts between FE/BE via `@corely/contracts`
✅ **Performance:** 5min cache on frontend, single API call
✅ **Gradual migration:** Existing workspaces work without migration (kind already exists!)

---

## Next Steps (Optional Enhancements)

1. **Workspace Upgrade Wizard:** Settings UI to switch PERSONAL → COMPANY with guided flow
2. **Homepage Widgets:** Render dashboard from `home.widgets` config
3. **Tenant Overrides:** UI to customize navigation (hide/reorder/rename items)
4. **Analytics:** Track which capabilities drive most value per mode
5. **Pack System:** Group capabilities into "packs" (e.g., "Sales Pro", "Inventory Plus")

---

## Architecture Compliance

✅ **DDD:** Templates are services in platform bounded context
✅ **Hexagonal:** WorkspaceRepository port, no NestJS in domain logic
✅ **Event-Driven:** Can publish `WorkspaceUpgraded` event for automation
✅ **RBAC:** Navigation filtered by user permissions
✅ **Server-Driven UI:** Frontend is thin, config-driven
✅ **No Module Boundaries Violated:** Modules import from `@/shared/workspaces/workspace-config-provider`, not from each other

---

## Summary

This implementation delivers **Freelancer vs Company UI mode** as a **fully server-driven system** using:

- **Existing data** (Workspace.legalEntity.kind)
- **Extensible templates** (WorkspaceTemplateService)
- **Single source of truth** (WorkspaceConfig)
- **Capability-driven UI** (modules adapt via hooks, not mode checks)

**No migrations. No duplicate apps. No hardcoded conditionals.**

Just smart configuration. 🚀
