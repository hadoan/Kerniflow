import { Inject, Injectable } from "@nestjs/common";
import type { MenuContribution, MenuItem, MenuOverrides } from "@corely/contracts";
import { TenantEntitlementService } from "./tenant-entitlement.service";
import { APP_REGISTRY_TOKEN, type AppRegistryPort } from "../ports/app-registry.port";
import {
  TENANT_MENU_OVERRIDE_REPOSITORY_TOKEN,
  type TenantMenuOverrideRepositoryPort,
  type MenuScope,
} from "../ports/tenant-menu-override-repository.port";

interface ComposeMenuInput {
  tenantId: string;
  userId: string;
  permissions: Set<string>;
  scope: "web" | "pos";
  capabilityFilter?: Set<string>;
  capabilityKeys?: Set<string>;
}

/**
 * Menu Composer Service
 * Composes server-driven menu filtered by tenant entitlements, RBAC, and scope
 */
@Injectable()
export class MenuComposerService {
  constructor(
    @Inject(APP_REGISTRY_TOKEN)
    private readonly appRegistry: AppRegistryPort,
    private readonly entitlementService: TenantEntitlementService,
    @Inject(TENANT_MENU_OVERRIDE_REPOSITORY_TOKEN)
    private readonly menuOverrideRepo: TenantMenuOverrideRepositoryPort
  ) {}

  /**
   * Compose menu for a user
   */
  async composeMenu(input: ComposeMenuInput): Promise<MenuItem[]> {
    // 1. Get tenant entitlement
    const entitlement = await this.entitlementService.getTenantEntitlement(input.tenantId);

    // 2. Collect menu contributions from enabled apps
    const contributions: MenuContribution[] = [];
    for (const appId of entitlement.getEnabledApps()) {
      const manifest = this.appRegistry.get(appId);
      if (manifest) {
        const filtered = manifest.menu.filter((item) =>
          this.shouldIncludeMenuItem(
            item,
            input.scope,
            input.permissions,
            entitlement,
            input.capabilityFilter,
            input.capabilityKeys
          )
        );
        contributions.push(...filtered);
      }
    }

    // 3. Apply tenant menu overrides
    const scope: MenuScope = input.scope === "web" ? "WEB" : "POS";
    const override = await this.menuOverrideRepo.findByTenantAndScope(input.tenantId, scope);

    return this.applyOverrides(contributions, override);
  }

  /**
   * Check if a menu item should be included
   */
  private shouldIncludeMenuItem(
    item: MenuContribution,
    scope: string,
    permissions: Set<string>,
    entitlement: any,
    capabilityFilter?: Set<string>,
    capabilityKeys?: Set<string>
  ): boolean {
    // Check scope
    if (!this.matchesScope(item, scope)) {
      return false;
    }

    // Check required apps
    if (item.requiresApps) {
      for (const requiredApp of item.requiresApps) {
        if (!entitlement.isAppEnabled(requiredApp)) {
          return false;
        }
      }
    }

    // Check required capabilities
    if (item.requiresCapabilities) {
      for (const requiredCapability of item.requiresCapabilities) {
        if (!entitlement.hasCapability(requiredCapability)) {
          return false;
        }
        if (
          capabilityKeys &&
          capabilityKeys.has(requiredCapability) &&
          capabilityFilter &&
          !capabilityFilter.has(requiredCapability)
        ) {
          return false;
        }
      }
    }

    // Check required permissions
    if (item.requiresPermissions) {
      for (const requiredPermission of item.requiresPermissions) {
        if (!permissions.has(requiredPermission)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Check if menu item matches the scope
   */
  private matchesScope(item: MenuContribution, scope: string): boolean {
    return item.scope === scope || item.scope === "both";
  }

  /**
   * Apply tenant-specific overrides to menu
   */
  private applyOverrides(
    contributions: MenuContribution[],
    overrideEntity: any | null
  ): MenuItem[] {
    if (!overrideEntity) {
      return this.buildMenuItems(contributions);
    }

    const overrides: MenuOverrides = JSON.parse(overrideEntity.overridesJson);

    // Filter hidden items
    const visible = contributions.filter((item) => !overrides.hidden?.includes(item.id));

    // Sort with custom ordering
    const sorted = visible.sort((a, b) => {
      const orderA = overrides.order?.[a.id] ?? a.order;
      const orderB = overrides.order?.[b.id] ?? b.order;
      return orderA - orderB;
    });

    // Build menu items with renames and pins
    return sorted.map((item) => ({
      id: item.id,
      section: item.section,
      label: overrides.renames?.[item.id] || item.defaultLabel,
      route: item.route,
      screen: item.screen,
      icon: item.icon,
      order: overrides.order?.[item.id] ?? item.order,
      pinned: overrides.pins?.includes(item.id),
      tags: item.tags,
      requiredCapabilities: item.requiresCapabilities,
    }));
  }

  /**
   * Build menu items from contributions (no overrides)
   */
  private buildMenuItems(contributions: MenuContribution[]): MenuItem[] {
    return contributions
      .sort((a, b) => a.order - b.order)
      .map((item) => ({
        id: item.id,
        section: item.section,
        label: item.defaultLabel,
        route: item.route,
        screen: item.screen,
        icon: item.icon,
        order: item.order,
        tags: item.tags,
        requiredCapabilities: item.requiresCapabilities,
      }));
  }
}
