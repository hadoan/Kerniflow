import { type EngagementSettingsRecord } from "../../domain/engagement.types";

export const ENGAGEMENT_SETTINGS_REPOSITORY_PORT = Symbol("ENGAGEMENT_SETTINGS_REPOSITORY_PORT");

export interface EngagementSettingsRepositoryPort {
  getByTenant(tenantId: string): Promise<EngagementSettingsRecord | null>;
  upsert(settings: EngagementSettingsRecord): Promise<void>;
}
