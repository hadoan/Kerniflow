import type { PackDefinition } from "@kerniflow/contracts";

/**
 * Pack Registry Port
 * Loads and provides access to pack definitions
 */
export interface PackRegistryPort {
  /**
   * Get pack definition by ID
   */
  get(packId: string): PackDefinition | undefined;

  /**
   * List all registered packs
   */
  list(): PackDefinition[];

  /**
   * Check if a pack exists
   */
  has(packId: string): boolean;
}

export const PACK_REGISTRY_TOKEN = Symbol("PACK_REGISTRY_TOKEN");
