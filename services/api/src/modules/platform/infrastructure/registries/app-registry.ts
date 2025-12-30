import { Injectable } from "@nestjs/common";
import type { AppManifest } from "@kerniflow/contracts";
import type { AppRegistryPort } from "../../application/ports/app-registry.port";

/**
 * App Registry
 * Central registry for all app manifests
 * Manifests are loaded statically from each module
 */
@Injectable()
export class AppRegistry implements AppRegistryPort {
  private manifests = new Map<string, AppManifest>();

  constructor() {
    // TODO: Load manifests from each module
    // For now, this is empty - manifests will be registered via loadManifests()
    // or via a separate initialization
  }

  /**
   * Register an app manifest
   */
  register(manifest: AppManifest): void {
    this.manifests.set(manifest.appId, manifest);
  }

  /**
   * Get app manifest by ID
   */
  get(appId: string): AppManifest | undefined {
    return this.manifests.get(appId);
  }

  /**
   * List all registered apps
   */
  list(): AppManifest[] {
    return Array.from(this.manifests.values());
  }

  /**
   * Find apps that provide a specific capability
   */
  findByCapability(capability: string): AppManifest[] {
    return this.list().filter((manifest) => manifest.capabilities.includes(capability));
  }

  /**
   * Check if an app exists
   */
  has(appId: string): boolean {
    return this.manifests.has(appId);
  }

  /**
   * Load manifests (to be called during module initialization)
   * This method should be extended to import manifests from all modules
   */
  loadManifests(): void {
    // Example: Register built-in platform app
    this.register({
      appId: "platform",
      name: "Platform",
      tier: 0,
      version: "1.0.0",
      description: "Core platform features",
      dependencies: [],
      capabilities: ["platform.manage"],
      permissions: [
        "platform.apps.manage",
        "platform.templates.apply",
        "platform.packs.install",
        "platform.menu.customize",
      ],
      menu: [
        {
          id: "platform-settings",
          scope: "web",
          section: "settings",
          labelKey: "nav.platform",
          defaultLabel: "Platform",
          route: "/settings/platform",
          icon: "Settings",
          order: 100,
          requiresPermissions: ["platform.apps.manage"],
        },
      ],
    });

    // TODO: Import and register manifests from other modules
    // Example:
    // import { invoicesAppManifest } from '../../invoices/invoices.manifest';
    // this.register(invoicesAppManifest);
  }
}
