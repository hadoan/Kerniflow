# Platform Module Implementation Summary

## Overview

This document summarizes the implementation of the Platform module (Apps + Templates + Packs) system for Corely.

## Status: Backend Foundation Complete ✅

The core backend infrastructure is fully implemented and ready for database migration and testing.

## What's Implemented

### 1. Database Schema ✅

**File**: [packages/data/prisma/schema/05_platform.prisma](../../packages/data/prisma/schema/05_platform.prisma)

**Tables Created**:

- `AppCatalog` - Mirrors code-defined app manifests
- `TenantAppInstall` - Per-tenant app installation state
- `TemplateCatalog` - Template definitions catalog
- `TenantTemplateInstall` - Template installation history
- `PackCatalog` - Pack definitions catalog
- `TenantPackInstall` - Pack installation jobs
- `TenantMenuOverride` - Tenant menu customizations
- `SeededRecordMeta` - Tracks template-seeded records for customization protection

### 2. Contracts & Types ✅

**Location**: `packages/contracts/src/platform/`

**Files**:

- `app-manifest.schema.ts` - App manifest types and Zod schemas
- `template-definition.schema.ts` - Template plan/apply schemas
- `pack-definition.schema.ts` - Pack installation schemas
- `menu.schema.ts` - Server-driven menu schemas

### 3. Domain Layer ✅

**Files**:

- `domain/entitlement.aggregate.ts` - Core business logic for tenant entitlements
- `domain/app-manifest.ts` - App manifest value objects

### 4. Application Layer ✅

#### Ports (Interfaces)

- `app-registry.port.ts` - App manifest registry interface
- `template-registry.port.ts` - Template registry interface
- `template-executor.port.ts` - Template plan/apply executor interface
- `pack-registry.port.ts` - Pack registry interface
- `tenant-app-install-repository.port.ts` - App installation persistence
- `tenant-template-install-repository.port.ts` - Template installation persistence
- `tenant-menu-override-repository.port.ts` - Menu customization persistence
- `seeded-record-meta-repository.port.ts` - Template record tracking

#### Services

- `tenant-entitlement.service.ts` - Resolves tenant entitlements (apps + capabilities)
- `menu-composer.service.ts` - Server-driven menu composition with filtering
- `dependency-resolver.service.ts` - Topological sort for app dependencies

#### Use Cases

- `enable-app.usecase.ts` - Enable app with dependency resolution
- `disable-app.usecase.ts` - Disable app with dependent checking
- `compose-menu.usecase.ts` - Compose menu for user/tenant/scope
- `plan-template.usecase.ts` - Preview template execution
- `apply-template.usecase.ts` - Execute and record template

### 5. Infrastructure Layer ✅

#### Registries

- `app-registry.ts` - Central registry for app manifests
- `template-registry.ts` - Central registry for templates
- `template-executor-registry.ts` - Maps templates to executors
- `pack-registry.ts` - Central registry for packs

#### Repository Adapters

- `prisma-tenant-app-install-repository.adapter.ts`
- `prisma-tenant-template-install-repository.adapter.ts`
- `prisma-tenant-menu-override-repository.adapter.ts`
- `prisma-seeded-record-meta-repository.adapter.ts`

### 6. HTTP Controllers ✅

- `platform.controller.ts` - App management endpoints
  - `GET /platform/apps` - List apps with install status
  - `POST /platform/apps/:appId/enable` - Enable app
  - `POST /platform/apps/:appId/disable` - Disable app

- `menu.controller.ts` - Server-driven menu endpoint
  - `GET /menu?scope=web|pos` - Get filtered menu

- `template.controller.ts` - Template operations
  - `GET /platform/templates` - List templates
  - `GET /platform/templates/:id` - Get template details
  - `POST /platform/templates/:id/plan` - Preview template
  - `POST /platform/templates/:id/apply` - Execute template

### 7. Guards & Decorators ✅

- `entitlement.guard.ts` - Enforces app/capability requirements
- `@RequireApp(appId)` - Decorator for app requirement
- `@RequireCapability(capability)` - Decorator for capability requirement

### 8. Example Implementations ✅

#### App Manifest

**File**: `services/api/src/modules/invoices/invoices.manifest.ts`

- Complete example showing how to define an app
- Includes dependencies, capabilities, permissions, menu contributions

#### Templates

**Files**:

- `services/api/src/modules/accounting/templates/coa-us-gaap.definition.ts`
  - US GAAP Chart of Accounts template
  - 50+ accounts with configurable sub-accounts
- `services/api/src/modules/accounting/templates/coa-us-gaap.executor.ts`
  - Plan/apply executor implementation
  - Customization protection logic
- `services/api/src/modules/tax/templates/sales-tax-ca.definition.ts`
  - California sales tax rates template
  - State + local jurisdiction rates

#### Packs

**File**: `services/api/src/modules/platform/packs/small-business-starter.pack.ts`

- Complete business setup pack
- Enables 5 apps + applies COA template
- Feature flags and post-install checks

### 9. Tooling ✅

**File**: `services/api/src/scripts/catalog-sync.ts`

- Syncs manifests/templates/packs from code → database
- Idempotent upserts with version tracking
- Command: `pnpm catalog:sync`

### 10. Documentation ✅

- [apps-templates-packs.md](./apps-templates-packs.md) - System overview
- [app-manifest.md](./app-manifest.md) - App manifest schema guide
- [template-authoring.md](./template-authoring.md) - Template authoring guide with examples
- [pack-authoring.md](./pack-authoring.md) - Pack authoring guide
- [setup-instructions.md](./setup-instructions.md) - Migration and setup steps

### 11. Module Integration ✅

- PlatformModule registered in AppModule
- All providers wired up with dependency injection
- Registry loading on module initialization

## Architecture Highlights

### Hexagonal Architecture

- Clean separation: Domain → Application → Infrastructure → Adapters
- Ports (interfaces) define boundaries
- Adapters implement persistence and HTTP

### Dependency Injection

- All components use constructor injection
- Token-based DI for ports (e.g., `APP_REGISTRY_TOKEN`)
- NestJS module system for wiring

### Entitlement Model

```
tenant_capabilities = enabled_apps ∩ app_capabilities
user_entitlement = tenant_capabilities ∩ user_rbac_permissions
```

### Template Pattern

- **Plan**: Preview changes before execution
- **Apply**: Execute with idempotent upserts
- **Track**: Record seeded data for customization protection

### Dependency Resolution

- DFS-based topological sort
- Cycle detection
- Automatic transitive dependency enabling

## What's NOT Implemented (Future Work)

### 1. Pack Installation Worker

- **Purpose**: Background job processor for long-running pack installs
- **Technology**: BullMQ + Redis
- **Status**: Not yet implemented
- **Impact**: Packs cannot be installed yet

### 2. Pack HTTP Endpoints

- **Endpoints needed**:
  - `POST /platform/packs/:packId/install` - Queue pack installation
  - `GET /platform/packs/:packId/installs/:installId` - Check installation status
  - `GET /platform/packs` - List available packs
- **Status**: Not yet implemented

### 3. Frontend UI

- **Pages needed**:
  - Apps management page (enable/disable apps)
  - Templates browser + plan/apply UI
  - Packs catalog + installation UI
  - Menu customizer (drag/drop, hide/show)
- **Technology**: React + TanStack Query
- **Status**: Not yet implemented

### 4. Server-Driven Sidebar

- **Current**: Static sidebar in frontend
- **Target**: Dynamic sidebar from `GET /menu` endpoint
- **Status**: Endpoint exists, but frontend integration not done

## Next Steps

### Immediate (Required for Testing)

1. **Run Prisma Migration**:

   ```bash
   pnpm migrate -- --name add_platform_tables
   ```

2. **Regenerate Prisma Client**:

   ```bash
   pnpm prisma:generate
   ```

3. **Run Catalog Sync**:

   ```bash
   pnpm catalog:sync
   ```

4. **Seed Tenant Data**:

   ```sql
   -- Enable platform app for a test tenant
   INSERT INTO "TenantAppInstall" (id, tenant_id, app_id, enabled, installed_version, enabled_at)
   VALUES (gen_random_uuid(), '<tenant-id>', 'platform', true, '1.0.0', NOW());
   ```

5. **Test Endpoints**:

   ```bash
   # List apps
   curl http://localhost:3000/platform/apps

   # Enable app
   curl -X POST http://localhost:3000/platform/apps/invoices/enable

   # List templates
   curl http://localhost:3000/platform/templates

   # Plan template
   curl -X POST http://localhost:3000/platform/templates/coa-us-gaap/plan \
     -H "Content-Type: application/json" \
     -d '{"params": {"currency": "USD", "includeSubAccounts": true}}'
   ```

### Future Development

1. **Pack Worker**:
   - Set up BullMQ queue
   - Create pack installation processor
   - Implement resumable steps with progress tracking

2. **Frontend**:
   - Apps management page
   - Template browser with plan/apply workflow
   - Pack catalog with installation progress
   - Menu customizer

3. **Additional Features**:
   - Template versioning and upgrade workflow
   - Pack rollback capability
   - App installation wizard
   - Usage analytics per app

## Testing Strategy

### Unit Tests

- Domain logic (entitlement aggregate)
- Dependency resolver (topological sort + cycles)
- Menu composer (filtering logic)

### Integration Tests

- App enable/disable with dependencies
- Template plan → apply idempotency
- Menu composition with permissions

### E2E Tests

- Complete pack installation workflow
- Multi-tenant isolation
- RBAC enforcement

## Performance Considerations

### Menu Composition

- Current: Computed on every request
- Future: Cache with 5-minute TTL, invalidate on changes

### Template Execution

- Large templates may be slow (hundreds of records)
- Consider batching database operations

### Pack Installation

- Always use background worker
- Not suitable for synchronous HTTP requests

## Security

### RBAC Integration

- All endpoints protected by `AuthGuard` + `RbacGuard`
- Required permissions:
  - `platform.apps.manage` - App management
  - `platform.templates.apply` - Template operations
  - `platform.packs.install` - Pack installation
  - `platform.menu.customize` - Menu customization

### Entitlement Enforcement

- `EntitlementGuard` checks app/capability requirements
- Controllers can use `@RequireApp()` and `@RequireCapability()`
- Prevents access to features from disabled apps

### Audit Logging

- All app enable/disable events audited
- Template applications recorded with params and results
- Pack installations tracked with detailed logs

## Lessons Learned

### Good Decisions

1. **Code as source of truth** - Manifests in code, synced to DB
2. **Plan/apply pattern** - Users can preview before executing
3. **Customization protection** - SeededRecordMeta prevents overwriting edits
4. **Hexagonal architecture** - Clean boundaries, easy testing
5. **Executor registry pattern** - Decouples template definitions from executors

### Challenges

1. **Executor registration** - NestJS DI makes it complex to register executors dynamically
2. **Prisma types** - New tables don't exist until migration, requiring `@ts-expect-error`
3. **Circular dependencies** - App manifests need careful ordering

### Future Improvements

1. **Auto-discover manifests** - Use glob patterns instead of manual registration
2. **Hot reload** - Watch manifest files and reload without restart
3. **Validation** - Stricter manifest validation with Zod
4. **Testing utilities** - Test harness for template authoring

## File Tree

```
services/api/src/modules/platform/
├── platform.module.ts (200 lines) - Module configuration
├── platform.permissions.ts (56 lines) - Permission definitions
├── index.ts (14 lines) - Public exports
│
├── domain/
│   └── entitlement.aggregate.ts (120 lines) - Core business logic
│
├── application/
│   ├── ports/ (8 files) - Interface definitions
│   ├── services/ (3 files) - Application services
│   └── use-cases/ (5 files) - Use case implementations
│
├── infrastructure/
│   ├── registries/ (4 files) - Central registries
│   └── adapters/ (4 files) - Prisma repository adapters
│
├── adapters/
│   └── http/ (3 controllers) - REST API endpoints
│
├── guards/
│   └── entitlement.guard.ts (70 lines) - Entitlement enforcement
│
└── packs/
    └── small-business-starter.pack.ts (50 lines) - Example pack
```

## Related Modules

### Accounting Module

- `templates/coa-us-gaap.definition.ts` - Chart of accounts template
- `templates/coa-us-gaap.executor.ts` - Template executor

### Tax Module

- `templates/sales-tax-ca.definition.ts` - California tax rates template

### Invoices Module

- `invoices.manifest.ts` - Example app manifest

## References

- [Original Specification](../specs/platform-spec.md) - Initial requirements
- [Hexagonal Architecture](https://herbertograca.com/2017/11/16/explicit-architecture-01-ddd-hexagonal-onion-clean-cqrs-how-i-put-it-all-together/)
- [Server-Driven UI](https://www.judo.app/blog/server-driven-ui/)
- [Template Method Pattern](https://refactoring.guru/design-patterns/template-method)
