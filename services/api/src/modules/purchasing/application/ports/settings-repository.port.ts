import { type PurchasingSettingsAggregate } from "../../domain/settings.aggregate";

export interface PurchasingSettingsRepositoryPort {
  findByTenant(tenantId: string): Promise<PurchasingSettingsAggregate | null>;
  save(settings: PurchasingSettingsAggregate): Promise<void>;
}

export const PURCHASING_SETTINGS_REPO = Symbol("PURCHASING_SETTINGS_REPO");
