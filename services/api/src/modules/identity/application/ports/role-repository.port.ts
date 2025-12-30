/**
 * Role Repository Port (Interface)
 */
export interface RoleRepositoryPort {
  /**
   * Create a role
   */
  create(data: {
    id: string;
    tenantId: string;
    name: string;
    description?: string | null;
    isSystem?: boolean;
    systemKey?: string;
  }): Promise<void>;

  /**
   * Find role by ID
   */
  findById(
    tenantId: string,
    id: string
  ): Promise<{
    id: string;
    tenantId: string;
    name: string;
    description: string | null;
    isSystem: boolean;
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
    description: string | null;
    isSystem: boolean;
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
      description: string | null;
      isSystem: boolean;
      systemKey: string | null;
    }>
  >;

  /**
   * Find role by name within a tenant
   */
  findByName(
    tenantId: string,
    name: string
  ): Promise<{
    id: string;
    tenantId: string;
    name: string;
    description: string | null;
    isSystem: boolean;
    systemKey: string | null;
  } | null>;

  /**
   * Update role details
   */
  update(
    tenantId: string,
    roleId: string,
    patch: { name?: string; description?: string | null }
  ): Promise<void>;

  /**
   * Delete role
   */
  delete(tenantId: string, roleId: string): Promise<void>;
}

export const ROLE_REPOSITORY_TOKEN = Symbol("ROLE_REPOSITORY");
