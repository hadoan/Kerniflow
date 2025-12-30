import type { AppManifest } from "@corely/contracts";
import type { AppRegistryPort } from "../application/ports/app-registry.port";

/**
 * Tenant Entitlement Aggregate
 * Represents the computed entitlements for a tenant based on enabled apps
 */
export class TenantEntitlement {
  constructor(
    public readonly tenantId: string,
    private enabledApps: Set<string>,
    private capabilities: Set<string>
  ) {}

  /**
   * Check if an app is enabled
   */
  isAppEnabled(appId: string): boolean {
    return this.enabledApps.has(appId);
  }

  /**
   * Check if tenant has a specific capability
   */
  hasCapability(capability: string): boolean {
    return this.capabilities.has(capability);
  }

  /**
   * Get all enabled app IDs
   */
  getEnabledApps(): string[] {
    return Array.from(this.enabledApps);
  }

  /**
   * Get all capabilities
   */
  getCapabilities(): string[] {
    return Array.from(this.capabilities);
  }

  /**
   * Enable an app and its dependencies
   */
  enableApp(manifest: AppManifest, registry: AppRegistryPort): void {
    // Enable dependencies first
    for (const depId of manifest.dependencies) {
      if (!this.enabledApps.has(depId)) {
        const depManifest = registry.get(depId);
        if (!depManifest) {
          throw new Error(`Dependency ${depId} not found in registry`);
        }
        this.enableApp(depManifest, registry);
      }
    }

    // Enable the app
    this.enabledApps.add(manifest.appId);

    // Add capabilities
    for (const capability of manifest.capabilities) {
      this.capabilities.add(capability);
    }
  }

  /**
   * Disable an app
   * @param force If true, disable even if other apps depend on it
   */
  disableApp(appId: string, registry: AppRegistryPort, force: boolean = false): void {
    if (!force) {
      // Check if any enabled apps depend on this app
      const dependents = this.findDependents(appId, registry);
      if (dependents.length > 0) {
        throw new Error(
          `Cannot disable ${appId} because these apps depend on it: ${dependents.join(", ")}`
        );
      }
    }

    // Remove the app
    this.enabledApps.delete(appId);

    // Recalculate capabilities
    this.recalculateCapabilities(registry);
  }

  /**
   * Find apps that depend on the given app
   */
  private findDependents(appId: string, registry: AppRegistryPort): string[] {
    const dependents: string[] = [];

    for (const enabledAppId of this.enabledApps) {
      if (enabledAppId === appId) {
        continue;
      }

      const manifest = registry.get(enabledAppId);
      if (manifest && manifest.dependencies.includes(appId)) {
        dependents.push(enabledAppId);
      }
    }

    return dependents;
  }

  /**
   * Recalculate capabilities based on enabled apps
   */
  private recalculateCapabilities(registry: AppRegistryPort): void {
    this.capabilities.clear();

    for (const appId of this.enabledApps) {
      const manifest = registry.get(appId);
      if (manifest) {
        for (const capability of manifest.capabilities) {
          this.capabilities.add(capability);
        }
      }
    }
  }

  /**
   * Create entitlement from enabled app list
   */
  static fromEnabledApps(
    tenantId: string,
    enabledAppIds: string[],
    registry: AppRegistryPort
  ): TenantEntitlement {
    const capabilities = new Set<string>();

    for (const appId of enabledAppIds) {
      const manifest = registry.get(appId);
      if (manifest) {
        for (const capability of manifest.capabilities) {
          capabilities.add(capability);
        }
      }
    }

    return new TenantEntitlement(tenantId, new Set(enabledAppIds), capabilities);
  }
}
