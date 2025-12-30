import { Injectable } from "@nestjs/common";
import type { PackDefinition } from "@corely/contracts";
import type { PackRegistryPort } from "../../application/ports/pack-registry.port";

/**
 * Pack Registry
 * Central registry for all pack definitions
 * Packs are loaded statically from code
 */
@Injectable()
export class PackRegistry implements PackRegistryPort {
  private packs = new Map<string, PackDefinition>();

  /**
   * Register a pack definition
   */
  register(pack: PackDefinition): void {
    if (this.packs.has(pack.packId)) {
      throw new Error(`Pack "${pack.packId}" is already registered. Pack IDs must be unique.`);
    }
    this.packs.set(pack.packId, pack);
  }

  /**
   * Get pack definition by ID
   */
  get(packId: string): PackDefinition | undefined {
    return this.packs.get(packId);
  }

  /**
   * List all registered packs
   */
  list(): PackDefinition[] {
    return Array.from(this.packs.values());
  }

  /**
   * Check if a pack exists
   */
  has(packId: string): boolean {
    return this.packs.has(packId);
  }

  /**
   * Load pack definitions (to be called during module initialization)
   * This method should be extended to import packs from configuration
   */
  loadPacks(): void {
    // TODO: Import and register pack definitions
    // Example:
    // import { smallBusinessStarterPack } from '../packs/small-business-starter.pack';
    // this.register(smallBusinessStarterPack);
    // For now, no packs are registered by default
    // Packs will be added as they are implemented
  }
}
