import { Module, OnModuleInit } from "@nestjs/common";
import { DataModule } from "@kerniflow/data";
import { KernelModule } from "@kerniflow/kernel";

// Infrastructure
import { AppRegistry } from "./infrastructure/registries/app-registry";
import { PrismaTenantAppInstallRepositoryAdapter } from "./infrastructure/adapters/prisma-tenant-app-install-repository.adapter";
import { PrismaTenantMenuOverrideRepositoryAdapter } from "./infrastructure/adapters/prisma-tenant-menu-override-repository.adapter";
import { PrismaSeededRecordMetaRepositoryAdapter } from "./infrastructure/adapters/prisma-seeded-record-meta-repository.adapter";

// Application Services
import { TenantEntitlementService } from "./application/services/tenant-entitlement.service";
import { MenuComposerService } from "./application/services/menu-composer.service";
import { DependencyResolverService } from "./application/services/dependency-resolver.service";

// Use Cases
import { EnableAppUseCase } from "./application/use-cases/enable-app.usecase";
import { DisableAppUseCase } from "./application/use-cases/disable-app.usecase";
import { ComposeMenuUseCase } from "./application/use-cases/compose-menu.usecase";

// Guards
import { EntitlementGuard } from "./guards/entitlement.guard";

// Controllers
import { PlatformController } from "./adapters/http/platform.controller";
import { MenuController } from "./adapters/http/menu.controller";

// Ports
import { APP_REGISTRY_TOKEN } from "./application/ports/app-registry.port";
import { TENANT_APP_INSTALL_REPOSITORY_TOKEN } from "./application/ports/tenant-app-install-repository.port";
import { TENANT_MENU_OVERRIDE_REPOSITORY_TOKEN } from "./application/ports/tenant-menu-override-repository.port";
import { SEEDED_RECORD_META_REPOSITORY_TOKEN } from "./application/ports/seeded-record-meta-repository.port";

@Module({
  imports: [DataModule, KernelModule],
  controllers: [PlatformController, MenuController],
  providers: [
    // Infrastructure - Registries
    AppRegistry,
    {
      provide: APP_REGISTRY_TOKEN,
      useExisting: AppRegistry,
    },

    // Infrastructure - Repositories
    PrismaTenantAppInstallRepositoryAdapter,
    {
      provide: TENANT_APP_INSTALL_REPOSITORY_TOKEN,
      useExisting: PrismaTenantAppInstallRepositoryAdapter,
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

    // Use Cases
    EnableAppUseCase,
    DisableAppUseCase,
    ComposeMenuUseCase,

    // Guards
    EntitlementGuard,
  ],
  exports: [
    TenantEntitlementService,
    MenuComposerService,
    EntitlementGuard,
    APP_REGISTRY_TOKEN,
    TENANT_APP_INSTALL_REPOSITORY_TOKEN,
  ],
})
export class PlatformModule implements OnModuleInit {
  constructor(private readonly appRegistry: AppRegistry) {}

  onModuleInit() {
    // Load app manifests on module initialization
    this.appRegistry.loadManifests();
  }
}
