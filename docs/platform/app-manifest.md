# App Manifest Schema

## Overview

An **App Manifest** defines a module/bounded context as an installable app that can be enabled or disabled per tenant.

## Schema

```typescript
interface AppManifest {
  appId: string;
  name: string;
  tier: number;
  version: string;
  description?: string;
  dependencies: string[];
  capabilities: string[];
  permissions: string[];
  menu: MenuContribution[];
  settingsSchema?: any;
}
```

## Fields

### appId (required)

Stable unique identifier for the app.

**Rules**:

- Lowercase, kebab-case recommended
- Must be unique across all apps
- Cannot be changed once deployed

**Examples**: `"invoices"`, `"inventory"`, `"crm"`, `"pos"`

### name (required)

Human-readable name shown in UI.

**Examples**: `"Invoices"`, `"Inventory Management"`, `"CRM"`

### tier (required)

Complexity tier from 0-7, where 0 is simplest.

**Tiers**:

- **0**: Platform/core features
- **1**: Basic business functions (invoices, expenses)
- **2**: Standard operations (inventory, orders)
- **3**: Advanced features (manufacturing, projects)
- **4-7**: Specialized/complex modules

**Purpose**: Help users understand app complexity and dependencies

### version (required)

Semantic version of the app.

**Format**: `"major.minor.patch"` (e.g., `"1.2.3"`)

**Rules**:

- Follow semantic versioning
- Increment when manifest changes significantly
- Used to track installed version per tenant

### description (optional)

Brief description of what the app does.

**Example**: `"Create, manage, and send invoices to customers"`

### dependencies (required)

Array of `appId`s this app depends on.

**Rules**:

- List direct dependencies only (transitive deps resolved automatically)
- When app is enabled, dependencies are auto-enabled
- When app is disabled, dependents must be disabled first (or use `force=true`)
- Circular dependencies are detected and rejected

**Example**:

```typescript
dependencies: ["customers", "accounting"];
// Invoices depend on customers and accounting modules
```

### capabilities (required)

Fine-grained capability strings this app provides.

**Rules**:

- Use dot notation: `module.feature`
- Capabilities are additive (multiple apps can provide same capability)
- Used for feature detection and menu filtering

**Example**:

```typescript
capabilities: ["invoices.create", "invoices.send", "invoices.pdf", "invoices.recurring"];
```

### permissions (required)

RBAC permission keys this app uses.

**Rules**:

- List all permissions your controllers check
- Format: `module.action` (e.g., `"invoices.write"`)
- These should match permissions in your `RequirePermission()` decorators

**Example**:

```typescript
permissions: [
  "invoices.read",
  "invoices.write",
  "invoices.delete",
  "invoices.send",
  "invoices.finalize",
];
```

### menu (required)

Array of menu contributions for navigation.

See [Menu Contribution Schema](#menu-contribution-schema) below.

### settingsSchema (optional)

JSON Schema or Zod schema descriptor for tenant-specific app settings.

**Example**:

```typescript
settingsSchema: {
  type: "object",
  properties: {
    defaultPaymentTerms: { type: "number", default: 30 },
    autoSendReminders: { type: "boolean", default: false }
  }
}
```

## Menu Contribution Schema

```typescript
interface MenuContribution {
  id: string;
  scope: "web" | "pos" | "both";
  section: string;
  labelKey: string;
  defaultLabel: string;
  route?: string;
  screen?: string;
  icon: string;
  order: number;
  requiresApps?: string[];
  requiresCapabilities?: string[];
  requiresPermissions?: string[];
  tags?: string[];
}
```

### Menu Fields

#### id (required)

Stable unique ID for this menu item.

**Format**: `{appId}-{page}` (e.g., `"invoices-list"`, `"invoices-create"`)

#### scope (required)

Which UI this menu item appears in:

- `"web"` - Web application only
- `"pos"` - POS application only
- `"both"` - Both UIs

#### section (required)

Menu section/category.

**Standard Sections**:

- `finance` - Accounting, invoices, expenses
- `sales` - Orders, quotes, customers
- `ops` - Inventory, purchasing, fulfillment
- `admin` - Settings, users, integrations
- `settings` - Module-specific settings

#### labelKey & defaultLabel (required)

- `labelKey`: i18n translation key (e.g., `"nav.invoices"`)
- `defaultLabel`: Fallback text if translation missing

#### route (optional)

Web app route path (e.g., `"/invoices"`, `"/inventory/products"`)

**Required for** `scope: "web"` or `"both"`

#### screen (optional)

POS screen identifier (e.g., `"InvoicesListScreen"`)

**Required for** `scope: "pos"` or `"both"`

#### icon (required)

Icon identifier. Use icon names from your icon library.

**Examples**: `"FileText"`, `"Package"`, `"Users"`, `"Settings"`

#### order (required)

Display order within section (lower = earlier).

**Recommended ranges**:

- 0-9: Critical/frequently used
- 10-49: Standard features
- 50-99: Settings/advanced features

#### requiresApps (optional)

Additional apps that must be enabled.

**Example**:

```typescript
requiresApps: ["customers"];
// This menu item only shows if both this app AND customers are enabled
```

#### requiresCapabilities (optional)

Capabilities required to see this menu item.

**Example**:

```typescript
requiresCapabilities: ["invoices.recurring"];
// Only show if tenant has recurring invoices capability
```

#### requiresPermissions (optional)

RBAC permissions required to see this menu item.

**Example**:

```typescript
requiresPermissions: ["invoices.write"];
// Only show if user has permission to write invoices
```

#### tags (optional)

Search tags for finding menu items.

**Example**:

```typescript
tags: ["sales", "billing", "finance"];
```

## Complete Example

```typescript
import type { AppManifest } from "@kerniflow/contracts";

export const invoicesAppManifest: AppManifest = {
  appId: "invoices",
  name: "Invoices",
  tier: 1,
  version: "1.0.0",
  description: "Create, manage, and send invoices to customers",

  dependencies: ["customers"],

  capabilities: ["invoices.create", "invoices.send", "invoices.pdf", "invoices.recurring"],

  permissions: [
    "invoices.read",
    "invoices.write",
    "invoices.delete",
    "invoices.send",
    "invoices.finalize",
  ],

  menu: [
    {
      id: "invoices-list",
      scope: "web",
      section: "finance",
      labelKey: "nav.invoices",
      defaultLabel: "Invoices",
      route: "/invoices",
      icon: "FileText",
      order: 10,
      requiresPermissions: ["invoices.read"],
      tags: ["sales", "billing", "finance"],
    },
    {
      id: "invoices-create",
      scope: "web",
      section: "finance",
      labelKey: "nav.invoices.create",
      defaultLabel: "Create Invoice",
      route: "/invoices/new",
      icon: "FilePlus",
      order: 11,
      requiresPermissions: ["invoices.write"],
      tags: ["sales", "billing"],
    },
  ],

  settingsSchema: {
    type: "object",
    properties: {
      defaultPaymentTerms: { type: "number", default: 30 },
      invoicePrefix: { type: "string", default: "INV" },
      autoSendReminders: { type: "boolean", default: false },
    },
  },
};
```

## Registration

Place the manifest in your module:

```
services/api/src/modules/invoices/
  invoices.manifest.ts  <-- App manifest here
  invoices.module.ts
  domain/
  application/
  ...
```

Then register it in `AppRegistry.loadManifests()`:

```typescript
// services/api/src/modules/platform/infrastructure/registries/app-registry.ts
import { invoicesAppManifest } from '../../invoices/invoices.manifest';

loadManifests() {
  this.register(invoicesAppManifest);
  // ... other manifests
}
```

## Validation

Run catalog sync to validate manifests:

```bash
pnpm exec ts-node services/api/src/scripts/catalog-sync.ts
```

This will:

- Validate all manifests
- Detect circular dependencies
- Update AppCatalog table
- Report any errors

## Best Practices

1. **Minimize dependencies** - Only declare direct dependencies
2. **Version bumps** - Increment version when changing manifest structure
3. **Permission coverage** - List all permissions your endpoints use
4. **Clear capabilities** - Use descriptive, granular capability names
5. **Logical sections** - Group related menu items in the same section
6. **Consistent ordering** - Use order ranges consistently across apps
7. **Test isolation** - Ensure app can be disabled without breaking system
