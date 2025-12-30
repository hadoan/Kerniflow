import { Inject, Injectable } from "@nestjs/common";
import { ValidationError, NotFoundError, AUDIT_PORT } from "@corely/kernel";
import type { AuditPort } from "@corely/kernel";
import { APP_REGISTRY_TOKEN, type AppRegistryPort } from "../ports/app-registry.port";
import {
  TENANT_APP_INSTALL_REPOSITORY_TOKEN,
  type TenantAppInstallRepositoryPort,
} from "../ports/tenant-app-install-repository.port";
import { DependencyResolverService } from "../services/dependency-resolver.service";

export interface DisableAppInput {
  tenantId: string;
  appId: string;
  actorUserId: string;
  force?: boolean;
}

export interface DisableAppOutput {
  appId: string;
  disabledDependents: string[];
}

@Injectable()
export class DisableAppUseCase {
  constructor(
    @Inject(APP_REGISTRY_TOKEN)
    private readonly appRegistry: AppRegistryPort,
    @Inject(TENANT_APP_INSTALL_REPOSITORY_TOKEN)
    private readonly appInstallRepo: TenantAppInstallRepositoryPort,
    private readonly dependencyResolver: DependencyResolverService,
    @Inject(AUDIT_PORT)
    private readonly audit: AuditPort
  ) {}

  async execute(input: DisableAppInput): Promise<DisableAppOutput> {
    // 1. Validate app exists
    const manifest = this.appRegistry.get(input.appId);
    if (!manifest) {
      throw new NotFoundError(`App "${input.appId}" not found`, {
        code: "Platform:AppNotFound",
      });
    }

    // 2. Check if app is currently enabled
    const existing = await this.appInstallRepo.findByTenantAndApp(input.tenantId, input.appId);
    if (!existing || !existing.enabled) {
      // Already disabled - idempotent
      return {
        appId: input.appId,
        disabledDependents: [],
      };
    }

    // 3. Check for dependents
    const enabledApps = await this.appInstallRepo.listEnabledByTenant(input.tenantId);
    const enabledAppIds = enabledApps.map((a) => a.appId);
    const dependents = this.dependencyResolver.findDependents(
      input.appId,
      enabledAppIds,
      this.appRegistry
    );

    if (dependents.length > 0 && !input.force) {
      throw new ValidationError(
        `Cannot disable "${input.appId}" because these apps depend on it: ${dependents.join(", ")}. Use force=true to disable anyway.`,
        {
          code: "Platform:HasDependents",
          data: { dependents },
        }
      );
    }

    // 4. Disable the app
    await this.appInstallRepo.update(existing.id, {
      enabled: false,
      disabledAt: new Date(),
      disabledByUserId: input.actorUserId,
    });

    // 5. If force, also disable dependents
    const disabledDependents: string[] = [];
    if (input.force && dependents.length > 0) {
      for (const depId of dependents) {
        const depInstall = await this.appInstallRepo.findByTenantAndApp(input.tenantId, depId);
        if (depInstall && depInstall.enabled) {
          await this.appInstallRepo.update(depInstall.id, {
            enabled: false,
            disabledAt: new Date(),
            disabledByUserId: input.actorUserId,
          });
          disabledDependents.push(depId);
        }
      }
    }

    // 6. Audit
    await this.audit.log({
      tenantId: input.tenantId,
      userId: input.actorUserId,
      action: "platform.app.disabled",
      entityType: "App",
      entityId: input.appId,
      metadata: {
        appId: input.appId,
        force: input.force,
        disabledDependents,
      },
    });

    return {
      appId: input.appId,
      disabledDependents,
    };
  }
}
