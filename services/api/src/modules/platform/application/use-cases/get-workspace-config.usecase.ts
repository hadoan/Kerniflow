import { ForbiddenException, Injectable, NotFoundException, Inject } from "@nestjs/common";
import type {
  MenuItem,
  WorkspaceConfig,
  WorkspaceNavigationGroup,
  WorkspaceMembershipRole,
} from "@corely/contracts";
import { WorkspaceTemplateService } from "../services/workspace-template.service";
import { MenuComposerService } from "../services/menu-composer.service";
import {
  WORKSPACE_REPOSITORY_PORT,
  type WorkspaceRepositoryPort,
} from "../../../workspaces/application/ports/workspace-repository.port";
import type { NavigationGroupStructure } from "../services/workspace-template.service";

export interface GetWorkspaceConfigInput {
  tenantId: string;
  userId: string;
  workspaceId: string;
  permissions: string[];
  scope: "web" | "pos";
}

@Injectable()
export class GetWorkspaceConfigUseCase {
  constructor(
    private readonly templateService: WorkspaceTemplateService,
    private readonly menuComposer: MenuComposerService,
    @Inject(WORKSPACE_REPOSITORY_PORT)
    private readonly workspaceRepo: WorkspaceRepositoryPort
  ) {}

  async execute(input: GetWorkspaceConfigInput): Promise<WorkspaceConfig> {
    const hasAccess = await this.workspaceRepo.checkUserHasWorkspaceAccess(
      input.tenantId,
      input.workspaceId,
      input.userId
    );
    if (!hasAccess) {
      throw new ForbiddenException("You do not have access to this workspace");
    }

    const workspace = await this.workspaceRepo.getWorkspaceByIdWithLegalEntity(
      input.tenantId,
      input.workspaceId
    );
    if (!workspace || !workspace.legalEntity) {
      throw new NotFoundException("Workspace not found");
    }

    const workspaceKind = workspace.legalEntity.kind === "COMPANY" ? "COMPANY" : "PERSONAL";
    const capabilities = this.templateService.getDefaultCapabilities(workspaceKind);
    const terminology = this.templateService.getDefaultTerminology(workspaceKind);
    const homeWidgets = this.templateService.getDefaultHomeWidgets(workspaceKind);
    const navigationStructure = this.templateService.getNavigationGroupsStructure(workspaceKind);

    const capabilityFilter = new Set(
      Object.entries(capabilities)
        .filter(([, enabled]) => enabled)
        .map(([key]) => key)
    );
    const capabilityKeys = new Set(Object.keys(capabilities));

    const items = await this.menuComposer.composeMenu({
      tenantId: input.tenantId,
      userId: input.userId,
      permissions: new Set(input.permissions),
      scope: input.scope,
      capabilityFilter,
      capabilityKeys,
    });

    const membership = await this.workspaceRepo.getMembershipByUserAndWorkspace(
      input.workspaceId,
      input.userId
    );
    const membershipRole = (membership?.role ?? "MEMBER") as WorkspaceMembershipRole;
    const isWorkspaceAdmin = membershipRole === "OWNER" || membershipRole === "ADMIN";

    return {
      workspaceId: workspace.id,
      kind: workspaceKind,
      capabilities,
      terminology,
      navigation: {
        groups: this.buildNavigationGroups(navigationStructure, items),
      },
      home: {
        widgets: homeWidgets,
      },
      currentUser: {
        membershipRole,
        isWorkspaceAdmin,
      },
      computedAt: new Date().toISOString(),
    };
  }

  private buildNavigationGroups(
    structure: NavigationGroupStructure[],
    items: MenuItem[]
  ): WorkspaceNavigationGroup[] {
    const itemsBySection = new Map<string, MenuItem[]>();
    for (const item of items) {
      const list = itemsBySection.get(item.section) ?? [];
      list.push(item);
      itemsBySection.set(item.section, list);
    }

    for (const list of itemsBySection.values()) {
      list.sort((a, b) => a.order - b.order);
    }

    const sectionsInGroups = new Set(structure.flatMap((group) => group.sectionOrder));
    const groups = structure
      .map((group) => {
        const groupItems: MenuItem[] = [];
        for (const section of group.sectionOrder) {
          const sectionItems = itemsBySection.get(section);
          if (sectionItems) {
            groupItems.push(...sectionItems);
          }
        }
        return {
          id: group.id,
          labelKey: group.labelKey,
          defaultLabel: group.defaultLabel,
          order: group.order,
          items: groupItems,
        };
      })
      .filter((group) => group.items.length > 0);

    const ungrouped = items.filter((item) => !sectionsInGroups.has(item.section));
    if (ungrouped.length > 0) {
      groups.push({
        id: "other",
        labelKey: "nav.groups.other",
        defaultLabel: "Other",
        order: 999,
        items: ungrouped.sort((a, b) => a.order - b.order),
      });
    }

    return groups.sort((a, b) => a.order - b.order);
  }
}
