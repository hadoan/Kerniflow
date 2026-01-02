import { Injectable } from "@nestjs/common";
import type {
  Capabilities,
  Terminology,
  DashboardWidget,
  NavigationGroup,
} from "@corely/contracts";
import type { WorkspaceKind } from "@corely/contracts";

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
   * Get default capabilities for a workspace kind
   */
  getDefaultCapabilities(kind: WorkspaceKind): Capabilities {
    if (kind === "PERSONAL") {
      return this.getFreelancerCapabilities();
    } else {
      return this.getCompanyCapabilities();
    }
  }

  /**
   * Get default terminology for a workspace kind
   */
  getDefaultTerminology(kind: WorkspaceKind): Terminology {
    if (kind === "PERSONAL") {
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
    } else {
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
  }

  /**
   * Get default home widgets for a workspace kind
   */
  getDefaultHomeWidgets(kind: WorkspaceKind): DashboardWidget[] {
    if (kind === "PERSONAL") {
      return this.getFreelancerHomeWidgets();
    } else {
      return this.getCompanyHomeWidgets();
    }
  }

  /**
   * Get default navigation groups structure (logical grouping before menu composition)
   */
  getNavigationGroupsStructure(kind: WorkspaceKind): NavigationGroupStructure[] {
    if (kind === "PERSONAL") {
      return this.getFreelancerNavigationStructure();
    } else {
      return this.getCompanyNavigationStructure();
    }
  }

  /**
   * Get recommended default apps for a workspace kind
   */
  getDefaultEnabledApps(kind: WorkspaceKind): string[] {
    if (kind === "PERSONAL") {
      return [
        "core",
        "platform",
        "workspaces",
        "invoices",
        "expenses",
        "parties", // clients
        "ai-copilot",
      ];
    } else {
      return [
        "core",
        "platform",
        "workspaces",
        "invoices",
        "expenses",
        "parties", // customers
        "sales", // quotes, projects
        "ai-copilot",
      ];
    }
  }

  // ===========================
  // FREELANCER MODE (PERSONAL)
  // ===========================

  private getFreelancerCapabilities(): Capabilities {
    return {
      // Multi-user: Limited for freelancers
      multiUser: false,
      rbac: false,
      approvals: false,

      // Sales: Simplified
      advancedInvoicing: false,
      quotes: false,
      projects: true, // Freelancers often track projects
      timeTracking: true,

      // Purchasing: Not needed
      purchaseOrders: false,
      supplierPortal: false,

      // Inventory: Basic tracking only
      inventory: false,
      warehouses: false,
      serialTracking: false,

      // Finance: Simplified
      costCenters: false,
      budgeting: false,
      multiCurrency: false,

      // Tax: Basic
      vatReporting: true,
      taxProfiles: false,

      // CRM: Basic
      advancedCrm: false,
      marketing: false,

      // POS: Optional
      pos: false,
      posMultiRegister: false,

      // Platform: Enabled
      aiCopilot: true,
      apiAccess: false,
      webhooks: false,
      customFields: false,
    };
  }

  private getFreelancerHomeWidgets(): DashboardWidget[] {
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
        sectionOrder: ["dashboard", "invoices", "expenses", "clients", "assistant"],
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

  private getCompanyCapabilities(): Capabilities {
    return {
      // Multi-user: Full support
      multiUser: true,
      rbac: true,
      approvals: true,

      // Sales: Advanced
      advancedInvoicing: true,
      quotes: true,
      projects: true,
      timeTracking: true,

      // Purchasing: Full support
      purchaseOrders: true,
      supplierPortal: false, // Can be enabled separately

      // Inventory: Full support
      inventory: true,
      warehouses: false, // Can be enabled separately
      serialTracking: false, // Can be enabled separately

      // Finance: Advanced
      costCenters: true,
      budgeting: true,
      multiCurrency: false, // Can be enabled separately

      // Tax: Advanced
      vatReporting: true,
      taxProfiles: true,

      // CRM: Advanced
      advancedCrm: true,
      marketing: false, // Can be enabled separately

      // POS: Optional
      pos: false,
      posMultiRegister: false,

      // Platform: Full
      aiCopilot: true,
      apiAccess: true,
      webhooks: true,
      customFields: true,
    };
  }

  private getCompanyHomeWidgets(): DashboardWidget[] {
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
        sectionOrder: ["invoices", "quotes", "projects", "customers"],
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
