# Freelancer vs Company UI Mode Implementation

## Overview

This implementation provides a **server-driven, template-based UI configuration system** that adapts the entire application's navigation, features, and terminology based on the workspace's business mode (**PERSONAL** = Freelancer, **COMPANY** = Company).

**Key Principle:** **Configuration before forks** - No code duplication, no parallel UIs, just smart server-driven configuration.

---

## Architecture

### Core Concept: ShellConfig

The `ShellConfig` is a single server-computed response that contains everything the frontend needs to render the entire AppShell:

```typescript
interface ShellConfig {
  tenant: {
    workspaceId: string;
    workspaceName: string;
    businessMode: "PERSONAL" | "COMPANY";
  };
  navigation: NavigationConfig; // Grouped menu structure
  home: HomeConfig; // Dashboard widgets
  capabilities: Capabilities; // Feature flags (multiUser, quotes, inventory, etc.)
  terminology: Terminology; // UI labels (Client vs Customer, etc.)
  enabledModules: string[]; // List of active apps/modules
}
```

### Server-Side Computation

**Location:** [services/api/src/modules/platform/application/use-cases/get-shell-config.usecase.ts](./services/api/src/modules/platform/application/use-cases/get-shell-config.usecase.ts)

The `GetShellConfigUseCase` computes configuration from:

1. **Workspace.legalEntity.kind** → determines base template (PERSONAL/COMPANY)
2. **TenantAppInstall** → which modules are enabled
3. **RBAC permissions** → filters navigation items user can't access
4. **TenantMenuOverride** → applies customizations (hide/reorder/rename)

---

## File Locations

### Backend

| File                                                                                   | Purpose                                    |
| -------------------------------------------------------------------------------------- | ------------------------------------------ |
| `packages/contracts/src/platform/shell-config.schema.ts`                               | **ShellConfig contract** (shared FE/BE)    |
| `services/api/src/modules/platform/application/services/workspace-template.service.ts` | **Templates** for Freelancer/Company modes |
| `services/api/src/modules/platform/application/use-cases/get-shell-config.usecase.ts`  | **Use case** to compute ShellConfig        |
| `services/api/src/modules/platform/adapters/http/shell-config.controller.ts`           | **Endpoint:** `GET /shell-config`          |
| `services/api/src/modules/platform/platform.module.ts`                                 | DI registration                            |

### Frontend

| File                                                   | Purpose                                                                                  |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `apps/web/src/app/providers/shell-config-provider.tsx` | **ShellConfig provider** + hooks (`useShellConfig`, `useCapabilities`, `useTerminology`) |
| `apps/web/src/shared/lib/shell-config.ts`              | **Re-exports** for modules to consume                                                    |
| `apps/web/src/app/AppSidebar.tsx`                      | **Navigation rendering** from ShellConfig groups                                         |
| `apps/web/src/modules/core/screens/DashboardPage.tsx`  | **Example:** Capability-driven quick actions                                             |

---

## How It Works

### 1. Data Model (No Migration Needed!)

- **`LegalEntity.kind`** already exists: `"PERSONAL"` or `"COMPANY"`
- **`Workspace.legalEntity`** relation already in place
- **`GET /workspaces`** already returns `kind` field

### 2. Template Selection

**Freelancer Template (`PERSONAL` kind):**

- **Navigation:** Flat structure (Dashboard, Invoices, Expenses, Clients, Assistant, Settings)
- **Capabilities:** `aiCopilot`, `timeTracking`, `projects`, `vatReporting` = true; rest = false
- **Terminology:** "Client" (not "Customer")
- **Home Widgets:** Quick actions for invoices/expenses, AI assistant prominent

**Company Template (`COMPANY` kind):**

- **Navigation:** Grouped by domain (Core, Sales, Purchasing, Inventory, Finance, Admin)
- **Capabilities:** `multiUser`, `rbac`, `approvals`, `quotes`, `inventory`, `costCenters` = true
- **Terminology:** "Customer" (not "Client")
- **Home Widgets:** KPI overview, sales pipeline, approvals queue

### 3. Backend Flow

```
GET /shell-config?scope=web&workspaceId=<id>
  ↓
GetShellConfigUseCase
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
7. Return ShellConfig
```

### 4. Frontend Flow

```
App Start
  ↓
ShellConfigProvider fetches /shell-config
  ↓
AppSidebar reads navigation.groups → renders menu
  ↓
Dashboard reads capabilities → shows/hides quick actions
  ↓
Modules use useCapabilities() + useTerminology() → adapt UI
```

---

## Usage Examples

### Module: Adapt UI Based on Capabilities

```typescript
// apps/web/src/modules/invoices/screens/InvoiceForm.tsx
import { useCapabilities, useTerminology } from "@/shared/lib/shell-config";

function InvoiceForm() {
  const capabilities = useCapabilities();
  const terminology = useTerminology();

  return (
    <form>
      <h2>Create {terminology.invoiceLabel}</h2>

      {/* Show advanced fields only for company mode */}
      {capabilities.advancedInvoicing && (
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

The AppSidebar automatically renders navigation from ShellConfig:

- **Freelancer:** Flat list, no group headers
- **Company:** Sections grouped (Sales, Purchasing, Finance, etc.)

No hardcoded "if freelancer" checks in frontend!

---

## Customization Points

### 1. Add New Capability

**Backend:**

```typescript
// packages/contracts/src/platform/shell-config.schema.ts
export const CapabilitiesSchema = z.object({
  // ... existing
  myNewFeature: z.boolean().describe("My new feature"),
});

// services/api/src/modules/platform/application/services/workspace-template.service.ts
private getFreelancerCapabilities(): Capabilities {
  return {
    // ... existing
    myNewFeature: false, // disabled for freelancers
  };
}

private getCompanyCapabilities(): Capabilities {
  return {
    // ... existing
    myNewFeature: true, // enabled for companies
  };
}
```

**Frontend:**

```typescript
// apps/web/src/modules/my-module/MyComponent.tsx
const capabilities = useCapabilities();

{capabilities.myNewFeature && (
  <MyNewFeatureComponent />
)}
```

### 2. Add New Terminology

**Backend:**

```typescript
// packages/contracts/src/platform/shell-config.schema.ts
export const TerminologySchema = z.object({
  // ... existing
  myLabel: z.string().default("Default Label"),
});

// services/api/src/modules/platform/application/services/workspace-template.service.ts
getDefaultTerminology(kind: WorkspaceKind): Terminology {
  if (kind === "PERSONAL") {
    return { /* ... */, myLabel: "Freelancer Term" };
  } else {
    return { /* ... */, myLabel: "Company Term" };
  }
}
```

**Frontend:**

```typescript
const terminology = useTerminology();
<h1>{terminology.myLabel}</h1>
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

- **Workspace.legalEntity.kind** can be updated via **`PATCH /workspaces/:id`**
- ShellConfig recalculates on next fetch (cached for 5min)
- Frontend automatically re-renders navigation/capabilities

### Future: Upgrade Wizard (Optional)

To implement a guided upgrade flow:

1. **Backend endpoint:**

   ```typescript
   POST /workspaces/:id/upgrade-to-company

   → Updates legalEntity.kind = "COMPANY"
   → Optionally enables recommended apps
   → Returns updated ShellConfig
   ```

2. **Frontend settings page:**

   ```typescript
   // apps/web/src/modules/settings/screens/WorkspaceModeSettings.tsx
   function WorkspaceModeSettings() {
     const { config, refetch } = useShellConfig();

     const handleUpgrade = async () => {
       await api.post(`/workspaces/${config.tenant.workspaceId}/upgrade-to-company`);
       await refetch(); // Re-fetch ShellConfig
     };

     return (
       <div>
         <Badge>{config.tenant.businessMode === "PERSONAL" ? "Freelancer" : "Company"}</Badge>
         {config.tenant.businessMode === "PERSONAL" && (
           <Button onClick={handleUpgrade}>Upgrade to Company Mode</Button>
         )}
       </div>
     );
   }
   ```

---

## Testing

### Backend Tests

```typescript
// services/api/src/modules/platform/__tests__/get-shell-config.usecase.spec.ts
describe("GetShellConfigUseCase", () => {
  it("returns freelancer template for PERSONAL workspace", async () => {
    // Setup workspace with kind = PERSONAL
    const result = await useCase.execute({...});
    expect(result.capabilities.multiUser).toBe(false);
    expect(result.terminology.partyLabel).toBe("Client");
  });

  it("returns company template for COMPANY workspace", async () => {
    // Setup workspace with kind = COMPANY
    const result = await useCase.execute({...});
    expect(result.capabilities.multiUser).toBe(true);
    expect(result.terminology.partyLabel).toBe("Customer");
  });

  it("filters navigation by RBAC permissions", async () => {
    // Test that admin-only items are hidden for non-admin users
  });
});
```

### Frontend Tests

```typescript
// apps/web/src/app/__tests__/AppSidebar.test.tsx
it("renders freelancer navigation (flat list)", () => {
  render(<AppSidebar />, { shellConfig: freelancerConfig });
  expect(screen.queryByText("Sales")).not.toBeInTheDocument(); // No group headers
});

it("renders company navigation (grouped)", () => {
  render(<AppSidebar />, { shellConfig: companyConfig });
  expect(screen.getByText("Sales")).toBeInTheDocument(); // Group header visible
});
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
✅ **No Module Boundaries Violated:** Modules import from `@/shared/lib/shell-config`, not from each other

---

## Summary

This implementation delivers **Freelancer vs Company UI mode** as a **fully server-driven system** using:

- **Existing data** (Workspace.legalEntity.kind)
- **Extensible templates** (WorkspaceTemplateService)
- **Single source of truth** (ShellConfig)
- **Capability-driven UI** (modules adapt via hooks, not mode checks)

**No migrations. No duplicate apps. No hardcoded conditionals.**

Just smart configuration. 🚀
