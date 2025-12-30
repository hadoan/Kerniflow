/**
 * Platform Module
 * Apps + Templates + Packs Tenant Entitlements & Server-Driven Menu
 */

export { PlatformModule } from "./platform.module";
export { EntitlementGuard, RequireApp, RequireCapability } from "./guards/entitlement.guard";
export { TenantEntitlementService } from "./application/services/tenant-entitlement.service";
export { MenuComposerService } from "./application/services/menu-composer.service";
export { platformPermissions } from "./platform.permissions";

// Export tokens for dependency injection
export { APP_REGISTRY_TOKEN } from "./application/ports/app-registry.port";
export { TENANT_APP_INSTALL_REPOSITORY_TOKEN } from "./application/ports/tenant-app-install-repository.port";
