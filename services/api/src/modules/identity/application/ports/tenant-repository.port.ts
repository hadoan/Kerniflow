import { Tenant } from "../../domain/entities/tenant.entity";

/**
 * Tenant Repository Port (Interface)
 */
export interface ITenantRepository {
  /**
   * Create a new tenant
   */
  create(tenant: Tenant): Promise<Tenant>;

  /**
   * Find tenant by ID
   */
  findById(id: string): Promise<Tenant | null>;

  /**
   * Find tenant by slug
   */
  findBySlug(slug: string): Promise<Tenant | null>;

  /**
   * Check if slug exists
   */
  slugExists(slug: string): Promise<boolean>;

  /**
   * Update tenant
   */
  update(tenant: Tenant): Promise<Tenant>;
}

export const TENANT_REPOSITORY_TOKEN = Symbol("TENANT_REPOSITORY");
