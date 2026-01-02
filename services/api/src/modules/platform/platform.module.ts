import { Module, OnModuleInit } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { KernelModule } from "../../shared/kernel/kernel.module";
import { IdentityModule } from "../identity";
import { WorkspacesModule } from "../workspaces/workspaces.module";

// Infrastructure
import { AppRegistry } from "./infrastructure/registries/app-registry";
import { TemplateRegistry } from "./infrastructure/registries/template-registry";
import { TemplateExecutorRegistry } from "./infrastructure/registries/template-executor-registry";
import { PackRegistry } from "./infrastructure/registries/pack-registry";
import { PrismaTenantAppInstallRepositoryAdapter } from "./infrastructure/adapters/prisma-tenant-app-install-repository.adapter";
import { PrismaTenantTemplateInstallRepositoryAdapter } from "./infrastructure/adapters/prisma-tenant-template-install-repository.adapter";
import { PrismaTenantMenuOverrideRepositoryAdapter } from "./infrastructure/adapters/prisma-tenant-menu-override-repository.adapter";
import { PrismaSeededRecordMetaRepositoryAdapter } from "./infrastructure/adapters/prisma-seeded-record-meta-repository.adapter";

// Application Services
import { TenantEntitlementService } from "./application/services/tenant-entitlement.service";
import { MenuComposerService } from "./application/services/menu-composer.service";
import { DependencyResolverService } from "./application/services/dependency-resolver.service";
import { WorkspaceTemplateService } from "./application/services/workspace-template.service";

// Use Cases
import { EnableAppUseCase } from "./application/use-cases/enable-app.usecase";
import { DisableAppUseCase } from "./application/use-cases/disable-app.usecase";
import { ComposeMenuUseCase } from "./application/use-cases/compose-menu.usecase";
import { UpdateMenuOverridesUseCase } from "./application/use-cases/update-menu-overrides.usecase";
import { ResetMenuOverridesUseCase } from "./application/use-cases/reset-menu-overrides.usecase";
import { PlanTemplateUseCase } from "./application/use-cases/plan-template.usecase";
import { ApplyTemplateUseCase } from "./application/use-cases/apply-template.usecase";

// Guards
import { EntitlementGuard } from "./guards/entitlement.guard";

// Controllers
import { PlatformController } from "./adapters/http/platform.controller";
import { MenuController } from "./adapters/http/menu.controller";
import { TemplateController } from "./adapters/http/template.controller";

// Ports
import { APP_REGISTRY_TOKEN } from "./application/ports/app-registry.port";
import { TEMPLATE_REGISTRY_TOKEN } from "./application/ports/template-registry.port";
import { PACK_REGISTRY_TOKEN } from "./application/ports/pack-registry.port";
import { TENANT_APP_INSTALL_REPOSITORY_TOKEN } from "./application/ports/tenant-app-install-repository.port";
import { TENANT_TEMPLATE_INSTALL_REPOSITORY_TOKEN } from "./application/ports/tenant-template-install-repository.port";
import { TENANT_MENU_OVERRIDE_REPOSITORY_TOKEN } from "./application/ports/tenant-menu-override-repository.port";
import { SEEDED_RECORD_META_REPOSITORY_TOKEN } from "./application/ports/seeded-record-meta-repository.port";

@Module({
  imports: [DataModule, KernelModule, IdentityModule, WorkspacesModule],
  controllers: [PlatformController, MenuController, TemplateController],
  providers: [
    // Infrastructure - Registries
    AppRegistry,
    {
      provide: APP_REGISTRY_TOKEN,
      useExisting: AppRegistry,
    },
    TemplateRegistry,
    {
      provide: TEMPLATE_REGISTRY_TOKEN,
      useExisting: TemplateRegistry,
    },
    TemplateExecutorRegistry,
    PackRegistry,
    {
      provide: PACK_REGISTRY_TOKEN,
      useExisting: PackRegistry,
    },

    // Infrastructure - Repositories
    PrismaTenantAppInstallRepositoryAdapter,
    {
      provide: TENANT_APP_INSTALL_REPOSITORY_TOKEN,
      useExisting: PrismaTenantAppInstallRepositoryAdapter,
    },
    PrismaTenantTemplateInstallRepositoryAdapter,
    {
      provide: TENANT_TEMPLATE_INSTALL_REPOSITORY_TOKEN,
      useExisting: PrismaTenantTemplateInstallRepositoryAdapter,
    },
    PrismaTenantMenuOverrideRepositoryAdapter,
    {
      provide: TENANT_MENU_OVERRIDE_REPOSITORY_TOKEN,
      useExisting: PrismaTenantMenuOverrideRepositoryAdapter,
    },
    PrismaSeededRecordMetaRepositoryAdapter,
    {
      provide: SEEDED_RECORD_META_REPOSITORY_TOKEN,
      useExisting: PrismaSeededRecordMetaRepositoryAdapter,
    },

    // Application Services
    TenantEntitlementService,
    MenuComposerService,
    DependencyResolverService,
    WorkspaceTemplateService,

    // Use Cases
    EnableAppUseCase,
    DisableAppUseCase,
    ComposeMenuUseCase,
    UpdateMenuOverridesUseCase,
    ResetMenuOverridesUseCase,
    PlanTemplateUseCase,
    ApplyTemplateUseCase,

    // Guards
    EntitlementGuard,
  ],
  exports: [
    TenantEntitlementService,
    MenuComposerService,
    EntitlementGuard,
    APP_REGISTRY_TOKEN,
    TEMPLATE_REGISTRY_TOKEN,
    PACK_REGISTRY_TOKEN,
    TENANT_APP_INSTALL_REPOSITORY_TOKEN,
  ],
})
export class PlatformModule implements OnModuleInit {
  constructor(
    private readonly appRegistry: AppRegistry,
    private readonly templateRegistry: TemplateRegistry,
    private readonly templateExecutorRegistry: TemplateExecutorRegistry,
    private readonly packRegistry: PackRegistry
  ) {}

  onModuleInit() {
    // Load app manifests on module initialization
    this.appRegistry.loadManifests();
    this.templateRegistry.loadTemplates();
    this.templateExecutorRegistry.loadExecutors();
    this.packRegistry.loadPacks();
  }
}
