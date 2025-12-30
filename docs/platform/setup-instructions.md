# Platform Module Setup Instructions

## Overview

This guide walks through the setup steps needed to activate the Platform module (Apps + Templates + Packs system) in your Corely installation.

## Prerequisites

- PostgreSQL database running and accessible
- `.env` file configured with `DATABASE_URL`
- All dependencies installed (`pnpm install`)

## Setup Steps

### 1. Generate Prisma Migration

The platform module requires several new database tables. Generate and apply the migration:

```bash
# Generate the migration
pnpm migrate -- --name add_platform_tables

# Or if you want to create the migration without applying it:
pnpm migrate -- --name add_platform_tables --create-only
```

This will create migration files in `packages/data/prisma/migrations/` for the following tables:

- `AppCatalog` - Mirror of app manifests from code
- `TenantAppInstall` - Per-tenant app installation records
- `TemplateCatalog` - Mirror of template definitions
- `TenantTemplateInstall` - Template installation history
- `PackCatalog` - Pack definitions
- `TenantPackInstall` - Pack installation jobs
- `TenantMenuOverride` - Tenant menu customizations
- `SeededRecordMeta` - Tracks template-seeded records

### 2. Generate Prisma Client

After the migration is applied, regenerate the Prisma client to include the new tables:

```bash
pnpm prisma:generate
```

### 3. Run Catalog Sync

Sync app manifests, templates, and packs from code to the database:

```bash
pnpm catalog:sync
```

Expected output:

```
🔄 Starting catalog sync...

📦 Syncing app catalog...
   ✅ 1 apps created, 0 apps updated

📄 Syncing template catalog...
   ✅ 0 templates created, 0 templates updated

📦 Syncing pack catalog...
   ✅ 0 packs created, 0 packs updated

✨ Catalog sync completed successfully!
```

Note: Initially only the "platform" app will be registered. Add more app manifests to increase this count.

### 4. Verify Setup

Check that the platform tables exist:

```sql
SELECT * FROM "AppCatalog";
SELECT * FROM "TenantAppInstall";
SELECT * FROM "TemplateCatalog";
SELECT * FROM "PackCatalog";
```

### 5. Enable Platform App for Tenants

For existing tenants, enable the platform app:

```sql
-- Replace 'your-tenant-id' with actual tenant ID
INSERT INTO "TenantAppInstall" (
  id,
  tenant_id,
  app_id,
  enabled,
  installed_version,
  enabled_at,
  enabled_by_user_id
) VALUES (
  gen_random_uuid(),
  'your-tenant-id',
  'platform',
  true,
  '1.0.0',
  NOW(),
  'system'
);
```

Or use the API endpoint:

```bash
POST /platform/apps/platform/enable
```

## Adding App Manifests

To register your existing modules as installable apps:

### 1. Create App Manifest

In your module (e.g., `services/api/src/modules/invoices/`):

```typescript
// invoices.manifest.ts
import type { AppManifest } from "@corely/contracts";

export const invoicesAppManifest: AppManifest = {
  appId: "invoices",
  name: "Invoices",
  tier: 1,
  version: "1.0.0",
  description: "Create, manage, and send invoices",
  dependencies: ["customers"],
  capabilities: ["invoices.create", "invoices.send"],
  permissions: ["invoices.read", "invoices.write"],
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
    },
  ],
};
```

### 2. Register in AppRegistry

Edit `services/api/src/modules/platform/infrastructure/registries/app-registry.ts`:

```typescript
loadManifests(): void {
  // ... existing platform app

  // Import and register your app
  import { invoicesAppManifest } from '../../../invoices/invoices.manifest';
  this.register(invoicesAppManifest);
}
```

### 3. Run Catalog Sync

```bash
pnpm catalog:sync
```

## Adding Templates

See [Template Authoring Guide](./template-authoring.md) for details.

Example templates are provided:

- Chart of Accounts (US GAAP): `services/api/src/modules/accounting/templates/coa-us-gaap.definition.ts`
- California Sales Tax: `services/api/src/modules/tax/templates/sales-tax-ca.definition.ts`

## Adding Packs

See [Pack Authoring Guide](./pack-authoring.md) for details.

Example pack:

- Small Business Starter: `services/api/src/modules/platform/packs/small-business-starter.pack.ts`

## Troubleshooting

### Migration Fails

**Error**: `The datasource.url property is required`

**Solution**: Ensure `.env` file exists at project root with `DATABASE_URL` set:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/corely"
```

### Catalog Sync Fails

**Error**: `Property 'appCatalog' does not exist on type 'PrismaService'`

**Solution**: Run `pnpm prisma:generate` to regenerate Prisma client after migration.

### Apps Not Showing in UI

**Checklist**:

1. ✅ App manifest registered in `AppRegistry.loadManifests()`
2. ✅ Catalog sync run successfully
3. ✅ App enabled for tenant via `TenantAppInstall` record
4. ✅ User has required permissions

### TypeScript Errors in catalog-sync.ts

**Error**: `Property 'templateCatalog' does not exist`

**Expected**: This is normal before migration is run. The script includes `@ts-expect-error` comments to suppress these errors. Run the migration and regenerate Prisma client to fix.

## Next Steps

After setup:

1. **Create app manifests** for your existing modules
2. **Create templates** for common configuration needs
3. **Create packs** to bundle apps and templates
4. **Test the workflow** by enabling/disabling apps via API
5. **Implement frontend UI** for app management (separate task)

## Related Documentation

- [Apps + Templates + Packs Overview](./apps-templates-packs.md)
- [App Manifest Schema](./app-manifest.md)
- [Template Authoring Guide](./template-authoring.md)
- [Pack Authoring Guide](./pack-authoring.md)
