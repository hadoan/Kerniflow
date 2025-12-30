import type { TransactionContext } from "@kerniflow/kernel";

export type MenuScope = "WEB" | "POS";

export interface TenantMenuOverrideEntity {
  id: string;
  tenantId: string;
  scope: MenuScope;
  overridesJson: string;
  updatedByUserId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTenantMenuOverrideDto {
  id: string;
  tenantId: string;
  scope: MenuScope;
  overridesJson: string;
  updatedByUserId?: string;
}

export interface UpdateTenantMenuOverrideDto {
  overridesJson: string;
  updatedByUserId?: string;
}

/**
 * Tenant Menu Override Repository Port
 */
export interface TenantMenuOverrideRepositoryPort {
  /**
   * Find menu override by tenant and scope
   */
  findByTenantAndScope(
    tenantId: string,
    scope: MenuScope,
    tx?: TransactionContext
  ): Promise<TenantMenuOverrideEntity | null>;

  /**
   * Create or update menu override
   */
  upsert(
    data: CreateTenantMenuOverrideDto,
    tx?: TransactionContext
  ): Promise<TenantMenuOverrideEntity>;

  /**
   * Delete menu override
   */
  delete(id: string, tx?: TransactionContext): Promise<void>;
}

export const TENANT_MENU_OVERRIDE_REPOSITORY_TOKEN = Symbol(
  "TENANT_MENU_OVERRIDE_REPOSITORY_TOKEN"
);
