import { Injectable } from "@nestjs/common";
import type { AppManifest } from "@corely/contracts";
import type { AppRegistryPort } from "../../application/ports/app-registry.port";
import { invoicesAppManifest } from "../../../invoices/invoices.manifest";

/**
 * App Registry
 * Central registry for all app manifests
 * Manifests are loaded statically from each module
 */
@Injectable()
export class AppRegistry implements AppRegistryPort {
  private manifests = new Map<string, AppManifest>();

  constructor() {
    // TODO: Load manifests from each module
    // For now, this is empty - manifests will be registered via loadManifests()
    // or via a separate initialization
  }

  /**
   * Register an app manifest
   */
  register(manifest: AppManifest): void {
    this.manifests.set(manifest.appId, manifest);
  }

  /**
   * Get app manifest by ID
   */
  get(appId: string): AppManifest | undefined {
    return this.manifests.get(appId);
  }

  /**
   * List all registered apps
   */
  list(): AppManifest[] {
    return Array.from(this.manifests.values());
  }

  /**
   * Find apps that provide a specific capability
   */
  findByCapability(capability: string): AppManifest[] {
    return this.list().filter((manifest) => manifest.capabilities.includes(capability));
  }

  /**
   * Check if an app exists
   */
  has(appId: string): boolean {
    return this.manifests.has(appId);
  }

  /**
   * Load manifests (to be called during module initialization)
   * This method should be extended to import manifests from all modules
   */
  loadManifests(): void {
    // Core Platform App
    this.register({
      appId: "platform",
      name: "Platform",
      tier: 0,
      version: "1.0.0",
      description: "Core platform features",
      dependencies: [],
      capabilities: ["platform.manage"],
      permissions: ["platform.apps.manage"],
      menu: [
        {
          id: "platform-settings",
          scope: "web",
          section: "platform",
          labelKey: "nav.platform",
          defaultLabel: "Platform",
          route: "/settings/platform",
          icon: "Settings",
          order: 100,
          requiresPermissions: ["platform.apps.manage"],
        },
      ],
    });

    // Dashboard/Core App
    this.register({
      appId: "core",
      name: "Core",
      tier: 0,
      version: "1.0.0",
      description: "Dashboard and core features",
      dependencies: [],
      capabilities: [],
      permissions: [],
      menu: [
        {
          id: "dashboard",
          scope: "web",
          section: "dashboard",
          labelKey: "nav.dashboard",
          defaultLabel: "Dashboard",
          route: "/dashboard",
          icon: "LayoutDashboard",
          order: 1,
        },
      ],
    });

    // Invoices App - imported from module manifest
    this.register(invoicesAppManifest);

    // Expenses App
    this.register({
      appId: "expenses",
      name: "Expenses",
      tier: 1,
      version: "1.0.0",
      description: "Expense tracking",
      dependencies: [],
      capabilities: [],
      permissions: ["expenses.read", "expenses.write"],
      menu: [
        {
          id: "expenses",
          scope: "web",
          section: "expenses",
          labelKey: "nav.expenses",
          defaultLabel: "Expenses",
          route: "/expenses",
          icon: "Receipt",
          order: 20,
        },
      ],
    });

    // Parties/Clients App
    this.register({
      appId: "parties",
      name: "Clients & Customers",
      tier: 1,
      version: "1.0.0",
      description: "Customer and client management",
      dependencies: [],
      capabilities: [],
      permissions: ["parties.read", "parties.write"],
      menu: [
        {
          id: "clients",
          scope: "web",
          section: "clients",
          labelKey: "nav.clients",
          defaultLabel: "Clients",
          route: "/customers",
          icon: "Users",
          order: 30,
        },
      ],
    });

    // AI Copilot App
    this.register({
      appId: "ai-copilot",
      name: "AI Assistant",
      tier: 2,
      version: "1.0.0",
      description: "AI-powered assistant",
      dependencies: [],
      capabilities: ["ai.copilot"],
      permissions: [],
      menu: [
        {
          id: "assistant",
          scope: "web",
          section: "assistant",
          labelKey: "nav.assistant",
          defaultLabel: "Assistant",
          route: "/assistant",
          icon: "Sparkles",
          order: 40,
        },
      ],
    });

    // Sales App (quotes, projects - company mode)
    this.register({
      appId: "sales",
      name: "Sales",
      tier: 3,
      version: "1.0.0",
      description: "Sales quotes and projects",
      dependencies: ["parties"],
      capabilities: ["sales.quotes", "sales.projects"],
      permissions: ["sales.read", "sales.write"],
      menu: [
        {
          id: "quotes",
          scope: "web",
          section: "quotes",
          labelKey: "nav.quotes",
          defaultLabel: "Quotes",
          route: "/quotes",
          icon: "FileCheck",
          order: 12,
          requiresCapabilities: ["sales.quotes"],
        },
        {
          id: "projects",
          scope: "web",
          section: "projects",
          labelKey: "nav.projects",
          defaultLabel: "Projects",
          route: "/projects",
          icon: "Briefcase",
          order: 13,
          requiresCapabilities: ["sales.projects"],
        },
      ],
    });

    // Workspace/Identity App
    this.register({
      appId: "workspaces",
      name: "Workspaces",
      tier: 0,
      version: "1.0.0",
      description: "Workspace and profile management",
      dependencies: [],
      capabilities: [],
      permissions: [],
      menu: [
        {
          id: "workspace-settings",
          scope: "web",
          section: "workspace",
          labelKey: "nav.workspace",
          defaultLabel: "Workspace",
          route: "/settings/workspace",
          icon: "Building",
          order: 90,
        },
        {
          id: "profile-settings",
          scope: "web",
          section: "profile",
          labelKey: "nav.profile",
          defaultLabel: "Profile",
          route: "/settings/profile",
          icon: "User",
          order: 91,
        },
      ],
    });
  }
}
