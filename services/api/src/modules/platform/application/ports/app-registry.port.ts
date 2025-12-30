import type { AppManifest } from "@corely/contracts";

/**
 * App Registry Port
 * Loads and provides access to app manifests
 */
export interface AppRegistryPort {
  /**
   * Get app manifest by ID
   */
  get(appId: string): AppManifest | undefined;

  /**
   * List all registered apps
   */
  list(): AppManifest[];

  /**
   * Find apps that provide a specific capability
   */
  findByCapability(capability: string): AppManifest[];

  /**
   * Check if an app exists
   */
  has(appId: string): boolean;
}

export const APP_REGISTRY_TOKEN = "platform/app-registry";
