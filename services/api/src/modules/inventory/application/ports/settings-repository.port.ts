import type { InventorySettingsAggregate } from "../../domain/settings.aggregate";

export const INVENTORY_SETTINGS_REPO = Symbol("INVENTORY_SETTINGS_REPO");

export interface InventorySettingsRepositoryPort {
  findByTenant(tenantId: string): Promise<InventorySettingsAggregate | null>;
  save(settings: InventorySettingsAggregate): Promise<void>;
}
