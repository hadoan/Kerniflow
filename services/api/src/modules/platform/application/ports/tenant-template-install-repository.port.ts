/**
 * Tenant Template Install Repository Port
 * Persistence interface for tenant template installation records
 */
export interface TenantTemplateInstallRepositoryPort {
  /**
   * Find template install by tenant and template ID
   */
  findByTenantAndTemplate(
    tenantId: string,
    templateId: string
  ): Promise<TenantTemplateInstallEntity | null>;

  /**
   * List all template installs for a tenant
   */
  listByTenant(tenantId: string): Promise<TenantTemplateInstallEntity[]>;

  /**
   * Create or update template install record
   */
  upsert(entity: TenantTemplateInstallEntity): Promise<TenantTemplateInstallEntity>;

  /**
   * Delete template install record
   */
  delete(tenantId: string, templateId: string): Promise<void>;
}

export interface TenantTemplateInstallEntity {
  id: string;
  tenantId: string;
  templateId: string;
  version: string;
  paramsJson: string;
  appliedByUserId: string | null;
  appliedAt: Date;
  resultSummaryJson: string | null;
}

export const TENANT_TEMPLATE_INSTALL_REPOSITORY_TOKEN = Symbol(
  "TENANT_TEMPLATE_INSTALL_REPOSITORY_TOKEN"
);
