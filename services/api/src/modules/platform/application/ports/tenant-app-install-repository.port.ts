import type { TransactionContext } from "@corely/kernel";

export interface TenantAppInstallEntity {
  id: string;
  tenantId: string;
  appId: string;
  enabled: boolean;
  installedVersion: string;
  configJson?: string | null;
  enabledAt?: Date | null;
  enabledByUserId?: string | null;
  disabledAt?: Date | null;
  disabledByUserId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTenantAppInstallDto {
  id: string;
  tenantId: string;
  appId: string;
  enabled: boolean;
  installedVersion: string;
  configJson?: string | null;
  enabledAt?: Date;
  enabledByUserId?: string;
}

export interface UpdateTenantAppInstallDto {
  enabled?: boolean;
  installedVersion?: string;
  configJson?: string | null;
  enabledAt?: Date | null;
  enabledByUserId?: string | null;
  disabledAt?: Date | null;
  disabledByUserId?: string | null;
}

/**
 * Tenant App Install Repository Port
 */
export interface TenantAppInstallRepositoryPort {
  /**
   * Find app install by tenant and app ID
   */
  findByTenantAndApp(
    tenantId: string,
    appId: string,
    tx?: TransactionContext
  ): Promise<TenantAppInstallEntity | null>;

  /**
   * List all app installs for a tenant
   */
  listByTenant(tenantId: string, tx?: TransactionContext): Promise<TenantAppInstallEntity[]>;

  /**
   * List enabled apps for a tenant
   */
  listEnabledByTenant(tenantId: string, tx?: TransactionContext): Promise<TenantAppInstallEntity[]>;

  /**
   * Create or update an app install
   */
  upsert(data: CreateTenantAppInstallDto, tx?: TransactionContext): Promise<TenantAppInstallEntity>;

  /**
   * Update an app install
   */
  update(
    id: string,
    data: UpdateTenantAppInstallDto,
    tx?: TransactionContext
  ): Promise<TenantAppInstallEntity>;

  /**
   * Delete an app install
   */
  delete(id: string, tx?: TransactionContext): Promise<void>;
}

export const TENANT_APP_INSTALL_REPOSITORY_TOKEN = "platform/tenant-app-install-repository";
