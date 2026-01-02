import { Injectable, Inject } from "@nestjs/common";
import type { MenuItem } from "@corely/contracts";
import { MenuComposerService } from "../services/menu-composer.service";
import { WorkspaceTemplateService } from "../services/workspace-template.service";
import {
  WORKSPACE_REPOSITORY_PORT,
  type WorkspaceRepositoryPort,
} from "../../../workspaces/application/ports/workspace-repository.port";

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
    private readonly workspaceRepo: WorkspaceRepositoryPort
  ) {}

  async execute(input: ComposeMenuInput): Promise<ComposeMenuOutput> {
    const items = await this.menuComposer.composeMenu({
      tenantId: input.tenantId,
      userId: input.userId,
      permissions: new Set(input.permissions),
      scope: input.scope,
    });

    // Optionally include workspace metadata for server-driven UI
    let workspaceMetadata: ComposeMenuOutput["workspace"] | undefined;

    if (input.workspaceId) {
      const workspace = await this.workspaceRepo.getWorkspaceByIdWithLegalEntity(
        input.tenantId,
        input.workspaceId
      );

      if (workspace && workspace.legalEntity) {
        const workspaceKind = workspace.legalEntity.kind as "PERSONAL" | "COMPANY";
        const defaultCapabilities = this.templateService.getDefaultCapabilities(workspaceKind);
        const defaultTerminology = this.templateService.getDefaultTerminology(workspaceKind);

        workspaceMetadata = {
          kind: workspaceKind,
          capabilities: {
            multiUser: defaultCapabilities.multiUser,
            quotes: defaultCapabilities.quotes,
            aiCopilot: defaultCapabilities.aiCopilot,
            rbac: defaultCapabilities.rbac,
          },
          terminology: {
            partyLabel: defaultTerminology.partyLabel,
            partyLabelPlural: defaultTerminology.partyLabelPlural,
          },
        };
      }
    }

    return {
      scope: input.scope,
      items,
      computedAt: new Date().toISOString(),
      workspace: workspaceMetadata,
    };
  }
}
