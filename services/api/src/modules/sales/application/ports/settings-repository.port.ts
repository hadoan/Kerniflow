import { SalesSettingsAggregate } from "../../domain/settings.aggregate";

export interface SalesSettingsRepositoryPort {
  findByTenant(tenantId: string): Promise<SalesSettingsAggregate | null>;
  save(settings: SalesSettingsAggregate): Promise<void>;
}

export const SALES_SETTINGS_REPOSITORY_PORT = Symbol("SALES_SETTINGS_REPOSITORY_PORT");
