import { Injectable, Inject } from "@nestjs/common";
import type { MenuItem } from "@corely/contracts";
import { MenuComposerService } from "../services/menu-composer.service";
import { WorkspaceTemplateService } from "../services/workspace-template.service";
import {
  WORKSPACE_REPOSITORY_PORT,
  type WorkspaceRepositoryPort,
} from "../../../workspaces/application/ports/workspace-repository.port";
import {
  TENANT_APP_INSTALL_REPOSITORY_TOKEN,
  type TenantAppInstallRepositoryPort,
} from "../ports/tenant-app-install-repository.port";
import { randomUUID } from "crypto";
import { APP_REGISTRY_TOKEN, type AppRegistryPort } from "../ports/app-registry.port";

export interface ComposeMenuInput {
  tenantId: string;
  userId: string;
  permissions: string[];
  scope: "web" | "pos";
  workspaceId?: string; // Optional: if not provided, menu won't include workspace metadata
}

export interface ComposeMenuOutput {
  scope: string;
  items: MenuItem[];
  computedAt: string;
  // Workspace metadata for server-driven UI
  workspace?: {
    kind: "PERSONAL" | "COMPANY";
    capabilities: {
      multiUser: boolean;
      quotes: boolean;
      aiCopilot: boolean;
      rbac: boolean;
      // Add more as needed
    };
    terminology: {
      partyLabel: string;
      partyLabelPlural: string;
    };
  };
}

@Injectable()
export class ComposeMenuUseCase {
  constructor(
    private readonly menuComposer: MenuComposerService,
    private readonly templateService: WorkspaceTemplateService,
    @Inject(WORKSPACE_REPOSITORY_PORT)
    private readonly workspaceRepo: WorkspaceRepositoryPort,
    @Inject(TENANT_APP_INSTALL_REPOSITORY_TOKEN)
    private readonly appInstallRepo: TenantAppInstallRepositoryPort,
    @Inject(APP_REGISTRY_TOKEN)
    private readonly appRegistry: AppRegistryPort
  ) {}

  async execute(input: ComposeMenuInput): Promise<ComposeMenuOutput> {
    // Ensure tenant has default apps installed; fall back to PERSONAL defaults if kind unknown
    const workspace =
      input.workspaceId &&
      (await this.workspaceRepo.getWorkspaceByIdWithLegalEntity(input.tenantId, input.workspaceId));
    const workspaceKind = workspace?.legalEntity?.kind === "COMPANY" ? "COMPANY" : "PERSONAL";

    await this.ensureDefaultAppsInstalled(input.tenantId, input.userId, workspaceKind);

    const defaultCapabilities = this.templateService.getDefaultCapabilities(workspaceKind);
    const capabilityKeys = new Set(Object.keys(defaultCapabilities));
    const capabilityFilter = new Set(
      Object.entries(defaultCapabilities)
        .filter(([, enabled]) => enabled)
        .map(([key]) => key)
    );

    const items = await this.menuComposer.composeMenu({
      tenantId: input.tenantId,
      userId: input.userId,
      permissions: new Set(input.permissions),
      scope: input.scope,
      capabilityFilter,
      capabilityKeys,
    });

    // Optionally include workspace metadata for server-driven UI
    let workspaceMetadata: ComposeMenuOutput["workspace"] | undefined;

    if (workspace && workspace.legalEntity) {
      const defaultTerminology = this.templateService.getDefaultTerminology(workspaceKind);

      workspaceMetadata = {
        kind: workspaceKind,
        capabilities: {
          multiUser: defaultCapabilities["workspace.multiUser"],
          quotes: defaultCapabilities["sales.quotes"],
          aiCopilot: defaultCapabilities["ai.copilot"],
          rbac: defaultCapabilities["workspace.rbac"],
        },
        terminology: {
          partyLabel: defaultTerminology.partyLabel,
          partyLabelPlural: defaultTerminology.partyLabelPlural,
        },
      };
    }

    return {
      scope: input.scope,
      items,
      computedAt: new Date().toISOString(),
      workspace: workspaceMetadata,
    };
  }

  /**
   * Ensure default apps for the workspace kind are enabled for the tenant.
   * Runs on every menu request but upserts are idempotent.
   */
  private async ensureDefaultAppsInstalled(
    tenantId: string,
    userId: string,
    workspaceKind: "PERSONAL" | "COMPANY"
  ) {
    const currentInstalls = await this.appInstallRepo.listEnabledByTenant(tenantId);
    const installed = new Set(currentInstalls.map((i) => i.appId));
    const defaultApps = this.templateService.getDefaultEnabledApps(workspaceKind);

    for (const appId of defaultApps) {
      if (installed.has(appId)) {
        continue;
      }
      const manifest = this.appRegistry.get(appId);
      if (!manifest) {
        continue;
      }
      await this.appInstallRepo.upsert({
        id: randomUUID(),
        tenantId,
        appId,
        enabled: true,
        installedVersion: manifest.version ?? "1.0.0",
        enabledAt: new Date(),
        enabledByUserId: userId,
      });
    }
  }
}
