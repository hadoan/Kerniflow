import { Inject, Injectable } from "@nestjs/common";
import { ValidationError, NotFoundError, AUDIT_PORT } from "@corely/kernel";
import type { AuditPort, IdGeneratorPort } from "@corely/kernel";
import { APP_REGISTRY_TOKEN, type AppRegistryPort } from "../ports/app-registry.port";
import {
  TENANT_APP_INSTALL_REPOSITORY_TOKEN,
  type TenantAppInstallRepositoryPort,
} from "../ports/tenant-app-install-repository.port";
import { DependencyResolverService } from "../services/dependency-resolver.service";
import { ID_GENERATOR_TOKEN } from "../../../../shared/ports/id-generator.port";

export interface EnableAppInput {
  tenantId: string;
  appId: string;
  actorUserId: string;
}

export interface EnableAppOutput {
  appId: string;
  enabledDependencies: string[];
}

@Injectable()
export class EnableAppUseCase {
  constructor(
    @Inject(APP_REGISTRY_TOKEN)
    private readonly appRegistry: AppRegistryPort,
    @Inject(TENANT_APP_INSTALL_REPOSITORY_TOKEN)
    private readonly appInstallRepo: TenantAppInstallRepositoryPort,
    private readonly dependencyResolver: DependencyResolverService,
    @Inject(AUDIT_PORT)
    private readonly audit: AuditPort,
    @Inject(ID_GENERATOR_TOKEN)
    private readonly idGenerator: IdGeneratorPort
  ) {}

  async execute(input: EnableAppInput): Promise<EnableAppOutput> {
    // 1. Validate app exists
    const manifest = this.appRegistry.get(input.appId);
    if (!manifest) {
      throw new NotFoundError(`App "${input.appId}" not found`, {
        code: "Platform:AppNotFound",
      });
    }

    // 2. Resolve dependencies
    const dependencies = this.dependencyResolver.resolve(input.appId, this.appRegistry);

    // 3. Enable dependencies first (idempotent)
    const enabledDeps: string[] = [];
    for (const depId of dependencies) {
      const existing = await this.appInstallRepo.findByTenantAndApp(input.tenantId, depId);
      const depManifest = this.appRegistry.get(depId);

      if (!depManifest) {
        throw new ValidationError(`Dependency app "${depId}" not found`, {
          code: "Platform:DependencyNotFound",
        });
      }

      if (!existing || !existing.enabled) {
        await this.appInstallRepo.upsert({
          id: existing?.id || this.idGenerator.newId(),
          tenantId: input.tenantId,
          appId: depId,
          enabled: true,
          installedVersion: depManifest.version,
          enabledAt: new Date(),
          enabledByUserId: input.actorUserId,
        });
        enabledDeps.push(depId);
      }
    }

    // 4. Enable target app
    const existing = await this.appInstallRepo.findByTenantAndApp(input.tenantId, input.appId);
    await this.appInstallRepo.upsert({
      id: existing?.id || this.idGenerator.newId(),
      tenantId: input.tenantId,
      appId: input.appId,
      enabled: true,
      installedVersion: manifest.version,
      enabledAt: new Date(),
      enabledByUserId: input.actorUserId,
    });

    // 5. Audit
    await this.audit.log({
      tenantId: input.tenantId,
      userId: input.actorUserId,
      action: "platform.app.enabled",
      entityType: "App",
      entityId: input.appId,
      metadata: {
        appId: input.appId,
        version: manifest.version,
        enabledDependencies: enabledDeps,
      },
    });

    return {
      appId: input.appId,
      enabledDependencies: enabledDeps,
    };
  }
}
