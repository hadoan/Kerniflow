import type { TaxProfileEntity } from "../entities";

export abstract class TaxProfileRepoPort {
  /**
   * Get active profile for tenant at a specific date
   */
  abstract getActive(tenantId: string, at: Date): Promise<TaxProfileEntity | null>;

  /**
   * Upsert tax profile (create or update)
   */
  abstract upsert(
    profile: Omit<TaxProfileEntity, "id" | "createdAt" | "updatedAt">
  ): Promise<TaxProfileEntity>;

  /**
   * Get profile by ID
   */
  abstract findById(id: string, tenantId: string): Promise<TaxProfileEntity | null>;
}
