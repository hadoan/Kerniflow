import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { AuthGuard } from "../../../identity/adapters/http/auth.guard";
import { RbacGuard, RequirePermission } from "../../../identity/adapters/http/rbac.guard";
import {
  CurrentTenantId,
  CurrentUserId,
} from "../../../identity/adapters/http/current-user.decorator";
import { EnableAppUseCase } from "../../application/use-cases/enable-app.usecase";
import { DisableAppUseCase } from "../../application/use-cases/disable-app.usecase";
import {
  TENANT_APP_INSTALL_REPOSITORY_TOKEN,
  type TenantAppInstallRepositoryPort,
} from "../../application/ports/tenant-app-install-repository.port";
import {
  APP_REGISTRY_TOKEN,
  type AppRegistryPort,
} from "../../application/ports/app-registry.port";
import { Inject } from "@nestjs/common";
import type { AppCatalogItem } from "@corely/contracts";

@Controller("platform/apps")
@UseGuards(AuthGuard, RbacGuard)
export class PlatformController {
  constructor(
    private readonly enableAppUseCase: EnableAppUseCase,
    private readonly disableAppUseCase: DisableAppUseCase,
    @Inject(TENANT_APP_INSTALL_REPOSITORY_TOKEN)
    private readonly appInstallRepo: TenantAppInstallRepositoryPort,
    @Inject(APP_REGISTRY_TOKEN)
    private readonly appRegistry: AppRegistryPort
  ) {}

  @Get()
  @RequirePermission("platform.apps.manage")
  async listTenantApps(@CurrentTenantId() tenantId: string): Promise<AppCatalogItem[]> {
    // Get all apps from registry
    const allApps = this.appRegistry.list();

    // Get tenant install states
    const installs = await this.appInstallRepo.listByTenant(tenantId);
    const installsMap = new Map(installs.map((i) => [i.appId, i]));

    // Combine
    return allApps.map((app) => {
      const install = installsMap.get(app.appId);
      return {
        appId: app.appId,
        name: app.name,
        tier: app.tier,
        version: app.version,
        description: app.description,
        dependencies: app.dependencies,
        enabled: install?.enabled ?? false,
      };
    });
  }

  @Post(":appId/enable")
  @RequirePermission("platform.apps.manage")
  @HttpCode(HttpStatus.OK)
  async enableApp(
    @Param("appId") appId: string,
    @CurrentTenantId() tenantId: string,
    @CurrentUserId() userId: string
  ) {
    return await this.enableAppUseCase.execute({
      tenantId,
      appId,
      actorUserId: userId,
    });
  }

  @Post(":appId/disable")
  @RequirePermission("platform.apps.manage")
  @HttpCode(HttpStatus.OK)
  async disableApp(
    @Param("appId") appId: string,
    @Body() body: { force?: boolean },
    @CurrentTenantId() tenantId: string,
    @CurrentUserId() userId: string
  ) {
    return await this.disableAppUseCase.execute({
      tenantId,
      appId,
      actorUserId: userId,
      force: body.force,
    });
  }
}
