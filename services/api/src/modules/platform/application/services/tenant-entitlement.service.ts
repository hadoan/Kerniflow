import { Inject, Injectable } from "@nestjs/common";
import { ForbiddenError } from "@kerniflow/domain";
import { TenantEntitlement } from "../../domain/entitlement.aggregate";
import { APP_REGISTRY_TOKEN, type AppRegistryPort } from "../ports/app-registry.port";
import {
  TENANT_APP_INSTALL_REPOSITORY_TOKEN,
  type TenantAppInstallRepositoryPort,
} from "../ports/tenant-app-install-repository.port";

/**
 * Tenant Entitlement Service
 * Resolves and enforces tenant-level entitlements based on enabled apps
 */
@Injectable()
export class TenantEntitlementService {
  constructor(
    @Inject(TENANT_APP_INSTALL_REPOSITORY_TOKEN)
    private readonly appInstallRepo: TenantAppInstallRepositoryPort,
    @Inject(APP_REGISTRY_TOKEN)
    private readonly appRegistry: AppRegistryPort
  ) {}

  /**
   * Get tenant entitlement (enabled apps + capabilities)
   */
  async getTenantEntitlement(tenantId: string): Promise<TenantEntitlement> {
    const installs = await this.appInstallRepo.listEnabledByTenant(tenantId);
    const enabledAppIds = installs.map((i) => i.appId);

    return TenantEntitlement.fromEnabledApps(tenantId, enabledAppIds, this.appRegistry);
  }

  /**
   * Assert that an app is enabled for a tenant
   * @throws ForbiddenError if app is not enabled
   */
  async assertAppEnabled(tenantId: string, appId: string): Promise<void> {
    const entitlement = await this.getTenantEntitlement(tenantId);
    if (!entitlement.isAppEnabled(appId)) {
      throw new ForbiddenError(`App "${appId}" is not enabled for this tenant`, {
        code: "Platform:AppNotEnabled",
      });
    }
  }

  /**
   * Assert that tenant has a capability
   * @throws ForbiddenError if capability is not available
   */
  async assertCapability(tenantId: string, capability: string): Promise<void> {
    const entitlement = await this.getTenantEntitlement(tenantId);
    if (!entitlement.hasCapability(capability)) {
      throw new ForbiddenError(`Capability "${capability}" is not available for this tenant`, {
        code: "Platform:CapabilityNotAvailable",
      });
    }
  }

  /**
   * Check if an app is enabled (without throwing)
   */
  async isAppEnabled(tenantId: string, appId: string): Promise<boolean> {
    const entitlement = await this.getTenantEntitlement(tenantId);
    return entitlement.isAppEnabled(appId);
  }

  /**
   * Check if tenant has a capability (without throwing)
   */
  async hasCapability(tenantId: string, capability: string): Promise<boolean> {
    const entitlement = await this.getTenantEntitlement(tenantId);
    return entitlement.hasCapability(capability);
  }
}
