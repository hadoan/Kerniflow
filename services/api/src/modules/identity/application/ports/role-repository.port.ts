/**
 * Role Repository Port (Interface)
 */
export interface IRoleRepository {
  /**
   * Create a role
   */
  create(data: { id: string; tenantId: string; name: string; systemKey?: string }): Promise<void>;

  /**
   * Find role by ID
   */
  findById(id: string): Promise<{
    id: string;
    tenantId: string;
    name: string;
    systemKey: string | null;
  } | null>;

  /**
   * Find role by system key in tenant
   */
  findBySystemKey(
    tenantId: string,
    systemKey: string
  ): Promise<{
    id: string;
    tenantId: string;
    name: string;
    systemKey: string | null;
  } | null>;

  /**
   * List all roles for a tenant
   */
  listByTenant(tenantId: string): Promise<
    Array<{
      id: string;
      tenantId: string;
      name: string;
      systemKey: string | null;
    }>
  >;

  /**
   * Get permissions for a role
   */
  getPermissions(roleId: string): Promise<string[]>;
}

export const ROLE_REPOSITORY_TOKEN = Symbol("ROLE_REPOSITORY");
