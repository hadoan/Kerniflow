# Apps + Templates + Packs: Tenant Entitlements System

## Overview

The **Platform module** provides a tenant entitlements system that allows per-tenant enabling/disabling of **Apps** (modules/bounded contexts), applying **Templates** (configuration presets), and installing **Packs** (bundles of apps + templates), with a **server-driven menu** filtered by RBAC and tenant entitlements.

## Core Concepts

### Apps (Modules / Bounded Contexts)

An **App** is a functional module or bounded context that can be independently enabled/disabled per tenant.

- **Defined in code** via an `AppManifest` (source of truth)
- **Mirrored in database** via `AppCatalog` table for UI/querying
- **Tenant installations** stored in `TenantAppInstall` table

**Example**: `invoices`, `inventory`, `crm`, `pos`

**App Properties**:

- `appId`: Stable unique identifier (e.g., `"invoices"`)
- `name`: Human-readable name
- `tier`: Complexity tier (0-7)
- `version`: Semantic version
- `dependencies`: Other apps this app requires
- `capabilities`: Fine-grained feature flags this app provides
- `permissions`: RBAC permissions this app uses
- `menu`: Menu contributions for navigation

### Templates (Configuration Presets)

A **Template** is a configuration preset that can be applied to a tenant to seed data or configure settings.

- **Defined in code** as a `TemplateDefinition`
- Uses **plan/apply** execution model (preview before execution)
- **Idempotent** upserts using stable keys
- **Protects customizations** - won't overwrite tenant-edited records

**Example**: Chart of Accounts (US GAAP), Tax Rates (California), Invoice Templates

**Template Lifecycle**:

1. **Plan**: Generate a preview of what will be created/updated/skipped
2. **Review**: User reviews the plan
3. **Apply**: Execute the plan and record the installation
4. **Track**: `SeededRecordMeta` tracks which records came from which template

### Packs (Bundles)

A **Pack** is a bundle that combines multiple apps and templates for easy installation.

- **Defined in code** as a `PackDefinition`
- Installs apps in dependency order
- Applies templates with default parameters
- Executes via background worker for long-running installations

**Example**: "Small Business Starter" pack enables invoices + expenses + customers and applies default chart of accounts

**Pack Installation Steps**:

1. Enable apps (with dependencies)
2. Apply templates in order
3. Apply feature flags (if any)
4. Apply menu preset (if any)
5. Run post-install checks

### Entitlements & Capabilities

**Entitlement** is the resolved set of capabilities available to a tenant/user:

```
tenant_capabilities = enabled_apps ∩ app_capabilities
user_entitlement = tenant_capabilities ∩ user_rbac_permissions
```

**Capabilities** are fine-grained feature flags:

- More granular than apps
- Multiple apps can provide the same capability
- Used for menu filtering and feature gating

**Example Capabilities**:

- `invoices.create`
- `invoices.recurring`
- `inventory.multi-location`
- `pos.offline`

## Data Model

### App Installation

```prisma
model TenantAppInstall {
  id               String
  tenantId         String
  appId            String  // Reference to AppCatalog
  enabled          Boolean
  installedVersion String
  configJson       String? // App-specific tenant config
  enabledAt        DateTime?
  enabledByUserId  String?

  @@unique([tenantId, appId])
}
```

### Template Installation

```prisma
model TenantTemplateInstall {
  id              String
  tenantId        String
  templateId      String
  version         String
  paramsJson      String
  appliedByUserId String?
  appliedAt       DateTime
  resultSummaryJson String? // What was created/updated

  @@unique([tenantId, templateId])
}
```

### Customization Protection

```prisma
model SeededRecordMeta {
  id                String
  tenantId          String
  targetTable       String
  targetId          String
  sourceTemplateId  String
  sourceTemplateVersion String
  isCustomized      Boolean
  customizedAt      DateTime?
  customizedByUserId String?

  @@unique([tenantId, targetTable, targetId])
}
```

When a template creates a record, it registers it in `SeededRecordMeta`. If the tenant later edits that record, it's marked as `isCustomized = true`. Future template upgrades will skip customized records by default.

## Server-Driven Menu

The menu is computed server-side and filtered by:

1. **Tenant enabled apps** - Only show items from enabled apps
2. **User RBAC permissions** - Only show items user has access to
3. **Scope** (web vs POS) - Different UIs get different menus
4. **Tenant overrides** - Hide/reorder/rename items per tenant

**Endpoint**: `GET /menu?scope=web`

**Response**:

```json
{
  "scope": "web",
  "items": [
    {
      "id": "invoices-list",
      "section": "finance",
      "label": "Invoices",
      "route": "/invoices",
      "icon": "FileText",
      "order": 10
    }
  ],
  "computedAt": "2025-12-30T12:00:00Z"
}
```

## Lifecycle Examples

### Enabling an App

```typescript
POST /platform/apps/invoices/enable

// System:
// 1. Checks "invoices" app manifest
// 2. Resolves dependencies ["customers"]
// 3. Enables "customers" if not already enabled
// 4. Enables "invoices"
// 5. Records in TenantAppInstall
// 6. Audit logs the change

Response:
{
  "appId": "invoices",
  "enabledDependencies": ["customers"]
}
```

### Disabling an App

```typescript
POST /platform/apps/customers/disable

// System checks if any enabled apps depend on "customers"
// If "invoices" is enabled, this fails unless force=true

Error 400:
{
  "code": "Platform:HasDependents",
  "message": "Cannot disable customers because these apps depend on it: invoices"
}
```

### Applying a Template

```typescript
// 1. Plan
POST /platform/templates/coa-us-gaap/plan
{
  "params": { "currency": "USD" }
}

Response:
{
  "actions": [
    { "type": "create", "table": "ChartOfAccount", "key": "1000", "data": {...} },
    { "type": "skip", "table": "ChartOfAccount", "key": "2000", "reason": "Customized by tenant" }
  ],
  "summary": "Will create 50 accounts, skip 2 customized accounts"
}

// 2. Apply
POST /platform/templates/coa-us-gaap/apply
{
  "params": { "currency": "USD" }
}

Response:
{
  "summary": {
    "created": 50,
    "updated": 0,
    "skipped": 2
  }
}
```

## Security & Governance

### RBAC Permissions

All platform endpoints require explicit permissions:

- `platform.apps.manage` - Enable/disable apps
- `platform.templates.apply` - Apply templates
- `platform.packs.install` - Install packs
- `platform.menu.customize` - Customize menu

### Endpoint Protection

Use `EntitlementGuard` to require apps/capabilities:

```typescript
@Get('invoices')
@UseGuards(AuthGuard, RbacGuard, EntitlementGuard)
@RequirePermission('invoices.read')
@RequireApp('invoices')
async listInvoices() {
  // This endpoint requires:
  // 1. Valid authentication
  // 2. "invoices.read" permission
  // 3. "invoices" app enabled for tenant
}
```

### Audit Trail

Every change is audited:

- App enable/disable
- Template apply
- Pack install
- Menu customization

## Best Practices

### App Manifest Guidelines

1. **Use semantic versioning** for the version field
2. **Keep dependencies minimal** - only declare direct dependencies
3. **Define capabilities granularly** - prefer `invoices.recurring` over just `invoices`
4. **Include all RBAC permissions** your module uses

### Template Authoring

1. **Use stable keys** for idempotency (e.g., account codes, not auto-increment IDs)
2. **Always implement plan()** - users should preview before applying
3. **Protect customizations** - check `SeededRecordMeta.isCustomized` before updating
4. **Validate params** strictly using Zod schemas

### Pack Design

1. **Order matters** - templates applied in sequence
2. **Test idempotency** - pack install should be safe to retry
3. **Document post-install steps** - what users need to do after install

## Migration Strategy

For existing tenants:

1. **Create migration** to add platform tables
2. **Run catalog sync** to populate AppCatalog
3. **Auto-enable core apps** for existing tenants (one-time script)
4. **Enable new apps** through UI or API

## Related Documentation

- [App Manifest Schema](./app-manifest.md)
- [Template Authoring Guide](./template-authoring.md)
- [Pack Authoring Guide](./pack-authoring.md)
- [Server-Driven Menu System](./menu-system.md)
- [API Reference](./api-reference.md)
