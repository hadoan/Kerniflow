import { Inject, Injectable } from "@nestjs/common";
import type {
  ShellConfig,
  WorkspaceKind,
  MenuItem,
  NavigationGroup,
  MenuSection,
} from "@corely/contracts";
import { MenuComposerService } from "../services/menu-composer.service";
import { WorkspaceTemplateService } from "../services/workspace-template.service";
import type { NavigationGroupStructure } from "../services/workspace-template.service";
import {
  WORKSPACE_REPOSITORY_PORT,
  type WorkspaceRepositoryPort,
} from "../../../workspaces/application/ports/workspace-repository.port";
import { TenantEntitlementService } from "../services/tenant-entitlement.service";

export interface GetShellConfigCommand {
  tenantId: string;
  userId: string;
  workspaceId: string;
  permissions: Set<string>;
  scope?: "web" | "pos";
}

/**
 * Get Shell Config Use Case
 *
 * Computes complete server-driven UI configuration for a workspace.
 * Combines:
 * - Workspace template (based on kind: PERSONAL/COMPANY)
 * - Menu composition (filtered by apps, permissions, capabilities)
 * - Tenant-specific overrides
 */
@Injectable()
export class GetShellConfigUseCase {
  constructor(
    @Inject(WORKSPACE_REPOSITORY_PORT)
    private readonly workspaceRepo: WorkspaceRepositoryPort,
    private readonly menuComposer: MenuComposerService,
    private readonly templateService: WorkspaceTemplateService,
    private readonly entitlementService: TenantEntitlementService
  ) {}

  async execute(command: GetShellConfigCommand): Promise<ShellConfig> {
    const scope = command.scope || "web";

    // 1. Get workspace with legal entity to determine kind
    const workspace = await this.workspaceRepo.getWorkspaceByIdWithLegalEntity(
      command.tenantId,
      command.workspaceId
    );

    if (!workspace) {
      throw new Error(`Workspace not found: ${command.workspaceId}`);
    }

    if (!workspace.legalEntity) {
      throw new Error(`Workspace has no legal entity: ${command.workspaceId}`);
    }

    const workspaceKind = workspace.legalEntity.kind as WorkspaceKind;

    // 2. Get template defaults for this workspace kind
    const defaultCapabilities = this.templateService.getDefaultCapabilities(workspaceKind);
    const defaultTerminology = this.templateService.getDefaultTerminology(workspaceKind);
    const defaultHomeWidgets = this.templateService.getDefaultHomeWidgets(workspaceKind);
    const navigationStructure = this.templateService.getNavigationGroupsStructure(workspaceKind);

    // 3. Get tenant entitlement to determine enabled apps and actual capabilities
    const entitlement = await this.entitlementService.getTenantEntitlement(command.tenantId);
    const enabledApps = entitlement.getEnabledApps();

    // Merge default capabilities with actual entitlement
    // (entitlement can disable features that template would enable)
    const actualCapabilities = this.computeActualCapabilities(
      defaultCapabilities,
      entitlement,
      enabledApps
    );

    // 4. Compose menu using existing menu composer
    const menuItems = await this.menuComposer.composeMenu({
      tenantId: command.tenantId,
      userId: command.userId,
      permissions: command.permissions,
      scope,
    });

    // 5. Organize menu items into navigation groups based on template structure
    const navigationGroups = this.organizeNavigationGroups(menuItems, navigationStructure);

    // 6. Build complete shell config
    return {
      schemaVersion: "1.0.0",
      tenant: {
        tenantId: command.tenantId,
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        businessMode: workspaceKind,
      },
      navigation: {
        groups: navigationGroups,
      },
      home: {
        widgets: defaultHomeWidgets,
      },
      capabilities: actualCapabilities,
      terminology: defaultTerminology,
      enabledModules: enabledApps,
      computedAt: new Date().toISOString(),
    };
  }

  /**
   * Compute actual capabilities by merging template defaults with entitlement
   */
  private computeActualCapabilities(
    templateCapabilities: any,
    entitlement: any,
    enabledApps: string[]
  ): any {
    // Start with template capabilities
    const actual = { ...templateCapabilities };

    // Adjust based on enabled apps
    // If certain apps are not enabled, their capabilities should be false
    if (!enabledApps.includes("sales")) {
      actual.quotes = false;
      actual.projects = false;
    }

    if (!enabledApps.includes("inventory")) {
      actual.inventory = false;
      actual.warehouses = false;
      actual.serialTracking = false;
    }

    if (!enabledApps.includes("crm")) {
      actual.advancedCrm = false;
      actual.marketing = false;
    }

    if (!enabledApps.includes("ai-copilot")) {
      actual.aiCopilot = false;
    }

    // Multi-user capabilities require both template support AND multiple active members
    // (for now, just use template default - can enhance later with membership count check)

    return actual;
  }

  /**
   * Organize menu items into navigation groups based on template structure
   */
  private organizeNavigationGroups(
    menuItems: MenuItem[],
    structure: NavigationGroupStructure[]
  ): NavigationGroup[] {
    // Group menu items by section
    const itemsBySection = new Map<string, MenuItem[]>();
    for (const item of menuItems) {
      const sectionItems = itemsBySection.get(item.section) || [];
      sectionItems.push(item);
      itemsBySection.set(item.section, sectionItems);
    }

    // Build navigation groups according to structure
    const groups: NavigationGroup[] = [];

    for (const groupStructure of structure) {
      const sections: MenuSection[] = [];

      // Add sections in the preferred order
      for (const sectionId of groupStructure.sectionOrder) {
        const items = itemsBySection.get(sectionId);
        if (items && items.length > 0) {
          sections.push({
            section: sectionId,
            items: items.sort((a, b) => a.order - b.order),
            order: groupStructure.sectionOrder.indexOf(sectionId),
          });
        }
      }

      // Add any remaining sections that weren't in the preferred order
      for (const [sectionId, items] of itemsBySection.entries()) {
        if (!groupStructure.sectionOrder.includes(sectionId)) {
          // Check if section semantically belongs to this group
          // For now, only add to "core" group if not explicitly placed
          if (
            groupStructure.id === "core" ||
            this.sectionBelongsToGroup(sectionId, groupStructure.id)
          ) {
            sections.push({
              section: sectionId,
              items: items.sort((a, b) => a.order - b.order),
              order: 999, // Append at end
            });
          }
        }
      }

      // Only include group if it has sections
      if (sections.length > 0) {
        groups.push({
          id: groupStructure.id,
          labelKey: groupStructure.labelKey,
          defaultLabel: groupStructure.defaultLabel,
          order: groupStructure.order,
          sections: sections.sort((a, b) => a.order - b.order),
        });
      }
    }

    return groups.sort((a, b) => a.order - b.order);
  }

  /**
   * Heuristic to determine if a section belongs to a group
   */
  private sectionBelongsToGroup(sectionId: string, groupId: string): boolean {
    const sectionToGroupMap: Record<string, string> = {
      // Core
      dashboard: "core",
      assistant: "core",

      // Sales
      invoices: "sales",
      quotes: "sales",
      projects: "sales",
      customers: "sales",
      clients: "sales",

      // Purchasing
      expenses: "purchasing",
      "purchase-orders": "purchasing",
      suppliers: "purchasing",

      // Inventory
      products: "inventory",
      warehouses: "inventory",
      "stock-movements": "inventory",

      // Finance
      accounting: "finance",
      tax: "finance",
      reports: "finance",

      // Admin/Settings
      workspace: "admin",
      settings: "admin",
      team: "admin",
      roles: "admin",
      platform: "admin",
      profile: "admin",
    };

    return sectionToGroupMap[sectionId] === groupId;
  }
}
