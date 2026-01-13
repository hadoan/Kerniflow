import { Injectable } from "@nestjs/common";
import type {
  WorkspaceCapabilities,
  WorkspaceDashboardWidget,
  WorkspaceKind,
  WorkspaceTerminology,
} from "@corely/contracts";

export interface WorkspaceTemplate {
  kind: WorkspaceKind;
  capabilities: WorkspaceCapabilities;
  terminology: WorkspaceTerminology;
  homeWidgets: WorkspaceDashboardWidget[];
  navigation: NavigationGroupStructure[];
  enabledApps: string[];
}

/**
 * Workspace Template Service
 *
 * Provides base configuration templates for different workspace kinds (PERSONAL/COMPANY).
 * These templates define default navigation structure, capabilities, terminology, and home widgets.
 *
 * Templates are NOT stored in DB - they are computed server-side based on workspace.kind.
 */
@Injectable()
export class WorkspaceTemplateService {
  /**
   * Get full workspace template for a kind
   */
  getTemplate(kind: WorkspaceKind): WorkspaceTemplate {
    return kind === "PERSONAL" ? this.getPersonalTemplate() : this.getCompanyTemplate();
  }

  /**
   * Template for freelancer/personal workspaces
   */
  getPersonalTemplate(): WorkspaceTemplate {
    return {
      kind: "PERSONAL",
      capabilities: this.getFreelancerCapabilities(),
      terminology: this.getFreelancerTerminology(),
      homeWidgets: this.getFreelancerHomeWidgets(),
      navigation: this.getFreelancerNavigationStructure(),
      enabledApps: this.getFreelancerEnabledApps(),
    };
  }

  /**
   * Template for company workspaces
   */
  getCompanyTemplate(): WorkspaceTemplate {
    return {
      kind: "COMPANY",
      capabilities: this.getCompanyCapabilities(),
      terminology: this.getCompanyTerminology(),
      homeWidgets: this.getCompanyHomeWidgets(),
      navigation: this.getCompanyNavigationStructure(),
      enabledApps: this.getCompanyEnabledApps(),
    };
  }

  /**
   * Get default capabilities for a workspace kind
   */
  getDefaultCapabilities(kind: WorkspaceKind): WorkspaceCapabilities {
    return this.getTemplate(kind).capabilities;
  }

  /**
   * Get default terminology for a workspace kind
   */
  getDefaultTerminology(kind: WorkspaceKind): WorkspaceTerminology {
    return this.getTemplate(kind).terminology;
  }

  /**
   * Get default home widgets for a workspace kind
   */
  getDefaultHomeWidgets(kind: WorkspaceKind): WorkspaceDashboardWidget[] {
    return this.getTemplate(kind).homeWidgets;
  }

  /**
   * Get default navigation groups structure (logical grouping before menu composition)
   */
  getNavigationGroupsStructure(kind: WorkspaceKind): NavigationGroupStructure[] {
    return this.getTemplate(kind).navigation;
  }

  /**
   * Get recommended default apps for a workspace kind
   */
  getDefaultEnabledApps(kind: WorkspaceKind): string[] {
    return this.getTemplate(kind).enabledApps;
  }

  // ===========================
  // FREELANCER MODE (PERSONAL)
  // ===========================

  private getFreelancerCapabilities(): WorkspaceCapabilities {
    return {
      // Multi-user: Limited for freelancers
      "workspace.multiUser": false,
      "workspace.rbac": false,
      approvals: false,

      // Sales: Simplified
      "invoices.advanced": false,
      "sales.quotes": false,
      "sales.projects": true, // Freelancers often track projects
      "time.tracking": true,

      // Purchasing: Not needed
      "purchasing.purchaseOrders": false,
      "purchasing.supplierPortal": false,

      // Inventory: Basic tracking only
      "inventory.basic": false,
      "inventory.warehouses": false,
      "inventory.serialTracking": false,

      // Finance: Simplified
      "finance.costCenters": false,
      "finance.budgeting": false,
      "finance.multiCurrency": false,

      // Tax: Basic
      "tax.vatReporting": true,
      "tax.profiles": false,

      // CRM: Basic
      "crm.advanced": false,
      "marketing.basic": false,

      // POS: Optional
      "pos.basic": false,
      "pos.multiRegister": false,

      // Platform: Enabled
      "ai.copilot": true,
      "platform.apiAccess": false,
      "platform.webhooks": false,
      "platform.customFields": false,
    };
  }

  private getFreelancerTerminology(): WorkspaceTerminology {
    return {
      partyLabel: "Client",
      partyLabelPlural: "Clients",
      invoiceLabel: "Invoice",
      invoiceLabelPlural: "Invoices",
      quoteLabel: "Quote",
      quoteLabelPlural: "Quotes",
      projectLabel: "Project",
      projectLabelPlural: "Projects",
      expenseLabel: "Expense",
      expenseLabelPlural: "Expenses",
    };
  }

  private getFreelancerHomeWidgets(): WorkspaceDashboardWidget[] {
    return [
      {
        id: "quick-actions",
        titleKey: "dashboard.quickActions",
        defaultTitle: "Quick Actions",
        widgetType: "quick-actions",
        order: 1,
        size: "full",
        config: {
          actions: [
            {
              id: "create-invoice",
              labelKey: "actions.createInvoice",
              icon: "FileText",
              route: "/invoices/new",
            },
            {
              id: "add-expense",
              labelKey: "actions.addExpense",
              icon: "Receipt",
              route: "/expenses/new",
            },
            {
              id: "add-client",
              labelKey: "actions.addClient",
              icon: "Users",
              route: "/customers/new",
            },
          ],
        },
      },
      {
        id: "recent-invoices",
        titleKey: "dashboard.recentInvoices",
        defaultTitle: "Recent Invoices",
        widgetType: "recent-invoices",
        order: 2,
        size: "medium",
        config: { limit: 5 },
      },
      {
        id: "pending-expenses",
        titleKey: "dashboard.pendingExpenses",
        defaultTitle: "Pending Expenses",
        widgetType: "pending-expenses",
        order: 3,
        size: "medium",
        config: { limit: 5 },
      },
      {
        id: "ai-assistant",
        titleKey: "dashboard.aiAssistant",
        defaultTitle: "AI Assistant",
        widgetType: "ai-copilot",
        order: 4,
        size: "large",
      },
    ];
  }

  private getFreelancerNavigationStructure(): NavigationGroupStructure[] {
    return [
      {
        id: "core",
        labelKey: "nav.groups.core",
        defaultLabel: "Core",
        order: 1,
        sectionOrder: ["dashboard", "invoices", "expenses", "clients", "crm", "assistant"],
      },
      {
        id: "settings",
        labelKey: "nav.groups.settings",
        defaultLabel: "Settings",
        order: 99,
        sectionOrder: ["workspace", "profile", "tax", "platform"],
      },
    ];
  }

  // ===========================
  // COMPANY MODE
  // ===========================

  private getCompanyCapabilities(): WorkspaceCapabilities {
    return {
      // Multi-user: Full support
      "workspace.multiUser": true,
      "workspace.rbac": true,
      approvals: true,

      // Sales: Advanced
      "invoices.advanced": true,
      "sales.quotes": true,
      "sales.projects": true,
      "time.tracking": true,

      // Purchasing: Full support
      "purchasing.purchaseOrders": true,
      "purchasing.supplierPortal": false, // Can be enabled separately

      // Inventory: Full support
      "inventory.basic": true,
      "inventory.warehouses": false, // Can be enabled separately
      "inventory.serialTracking": false, // Can be enabled separately

      // Finance: Advanced
      "finance.costCenters": true,
      "finance.budgeting": true,
      "finance.multiCurrency": false, // Can be enabled separately

      // Tax: Advanced
      "tax.vatReporting": true,
      "tax.profiles": true,

      // CRM: Advanced
      "crm.advanced": true,
      "marketing.basic": false, // Can be enabled separately

      // POS: Optional
      "pos.basic": false,
      "pos.multiRegister": false,

      // Platform: Full
      "ai.copilot": true,
      "platform.apiAccess": true,
      "platform.webhooks": true,
      "platform.customFields": true,
    };
  }

  private getCompanyTerminology(): WorkspaceTerminology {
    return {
      partyLabel: "Customer",
      partyLabelPlural: "Customers",
      invoiceLabel: "Invoice",
      invoiceLabelPlural: "Invoices",
      quoteLabel: "Quote",
      quoteLabelPlural: "Quotes",
      projectLabel: "Project",
      projectLabelPlural: "Projects",
      expenseLabel: "Expense",
      expenseLabelPlural: "Expenses",
    };
  }

  private getCompanyHomeWidgets(): WorkspaceDashboardWidget[] {
    return [
      {
        id: "kpi-overview",
        titleKey: "dashboard.kpiOverview",
        defaultTitle: "Key Metrics",
        widgetType: "kpi-overview",
        order: 1,
        size: "full",
        config: {
          metrics: ["revenue", "expenses", "profit", "outstanding"],
        },
      },
      {
        id: "sales-pipeline",
        titleKey: "dashboard.salesPipeline",
        defaultTitle: "Sales Pipeline",
        widgetType: "sales-pipeline",
        order: 2,
        size: "medium",
      },
      {
        id: "recent-invoices",
        titleKey: "dashboard.recentInvoices",
        defaultTitle: "Recent Invoices",
        widgetType: "recent-invoices",
        order: 3,
        size: "medium",
        config: { limit: 10 },
      },
      {
        id: "pending-approvals",
        titleKey: "dashboard.pendingApprovals",
        defaultTitle: "Pending Approvals",
        widgetType: "pending-approvals",
        order: 4,
        size: "medium",
      },
      {
        id: "ai-assistant",
        titleKey: "dashboard.aiAssistant",
        defaultTitle: "AI Assistant",
        widgetType: "ai-copilot",
        order: 5,
        size: "large",
      },
    ];
  }

  private getCompanyNavigationStructure(): NavigationGroupStructure[] {
    return [
      {
        id: "core",
        labelKey: "nav.groups.core",
        defaultLabel: "Core",
        order: 1,
        sectionOrder: ["dashboard", "assistant"],
      },
      {
        id: "sales",
        labelKey: "nav.groups.sales",
        defaultLabel: "Sales",
        order: 2,
        sectionOrder: ["invoices", "quotes", "projects", "crm", "customers"],
      },
      {
        id: "purchasing",
        labelKey: "nav.groups.purchasing",
        defaultLabel: "Purchasing",
        order: 3,
        sectionOrder: ["expenses", "purchase-orders", "suppliers"],
      },
      {
        id: "inventory",
        labelKey: "nav.groups.inventory",
        defaultLabel: "Inventory",
        order: 4,
        sectionOrder: ["products", "warehouses", "stock-movements"],
      },
      {
        id: "finance",
        labelKey: "nav.groups.finance",
        defaultLabel: "Finance",
        order: 5,
        sectionOrder: ["accounting", "tax", "reports"],
      },
      {
        id: "admin",
        labelKey: "nav.groups.admin",
        defaultLabel: "Administration",
        order: 99,
        sectionOrder: ["workspace", "team", "roles", "platform"],
      },
    ];
  }

  private getFreelancerEnabledApps(): string[] {
    return [
      "core",
      "platform",
      "workspaces",
      "invoices",
      "expenses",
      "parties", // clients
      "crm",
      "tax",
      "ai-copilot",
    ];
  }

  private getCompanyEnabledApps(): string[] {
    return [
      "core",
      "platform",
      "workspaces",
      "invoices",
      "expenses",
      "parties", // customers
      "sales", // quotes, projects
      "tax",
      "ai-copilot",
    ];
  }
}

/**
 * Navigation Group Structure - Used for organizing menu sections into groups
 */
export interface NavigationGroupStructure {
  id: string;
  labelKey: string;
  defaultLabel: string;
  order: number;
  sectionOrder: string[]; // Preferred order of sections within this group
}
