import { Membership } from "../../domain/entities/membership.entity";

/**
 * Membership Repository Port (Interface)
 */
export interface IMembershipRepository {
  /**
   * Create a new membership
   */
  create(membership: Membership): Promise<Membership>;

  /**
   * Find membership by ID
   */
  findById(id: string): Promise<Membership | null>;

  /**
   * Find all memberships for a user
   */
  findByUserId(userId: string): Promise<Membership[]>;

  /**
   * Find all memberships for a tenant
   */
  findByTenantId(tenantId: string): Promise<Membership[]>;

  /**
   * Find membership by tenant and user
   */
  findByTenantAndUser(tenantId: string, userId: string): Promise<Membership | null>;

  /**
   * Check if membership exists
   */
  existsByTenantAndUser(tenantId: string, userId: string): Promise<boolean>;

  /**
   * Update membership (e.g., change role)
   */
  update(membership: Membership): Promise<Membership>;

  /**
   * Delete membership
   */
  delete(id: string): Promise<void>;
}

export const MEMBERSHIP_REPOSITORY_TOKEN = Symbol("MEMBERSHIP_REPOSITORY");
