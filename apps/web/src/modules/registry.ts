import {
  type LucideIcon,
  LayoutDashboard,
  MessageSquare,
  Receipt,
  FileText,
  Users,
  Settings,
  FolderKanban,
  Calculator,
  Package,
  ShoppingCart,
  Zap,
  FileStack,
  UsersRound,
  FileSignature,
  ClipboardList,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";

export interface NavItem {
  id: string;
  labelKey: string; // i18n key
  icon: LucideIcon;
  path: string;
  badge?: string | number;
}

export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  comingSoon: boolean;
  navItems: NavItem[];
  permissions: string[];
}

// Module registry - enables ERP-ready architecture
export const moduleRegistry: ModuleDefinition[] = [
  {
    id: "core",
    name: "Core",
    description: "Dashboard and overview",
    enabled: true,
    comingSoon: false,
    navItems: [
      { id: "dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, path: "/dashboard" },
    ],
    permissions: ["read:dashboard"],
  },
  {
    id: "assistant",
    name: "Assistant",
    description: "AI-powered business assistant",
    enabled: true,
    comingSoon: false,
    navItems: [
      { id: "assistant", labelKey: "nav.assistant", icon: MessageSquare, path: "/assistant" },
    ],
    permissions: ["read:assistant", "write:assistant"],
  },
  {
    id: "expenses",
    name: "Expenses",
    description: "Expense tracking and management",
    enabled: true,
    comingSoon: false,
    navItems: [{ id: "expenses", labelKey: "nav.expenses", icon: Receipt, path: "/expenses" }],
    permissions: ["read:expenses", "write:expenses"],
  },
  {
    id: "invoices",
    name: "Invoices",
    description: "Invoice creation and management",
    enabled: true,
    comingSoon: false,
    navItems: [{ id: "invoices", labelKey: "nav.invoices", icon: FileText, path: "/invoices" }],
    permissions: ["read:invoices", "write:invoices"],
  },
  {
    id: "customers",
    name: "Customers",
    description: "Customer relationship management",
    enabled: true,
    comingSoon: false,
    navItems: [{ id: "customers", labelKey: "nav.customers", icon: Users, path: "/customers" }],
    permissions: ["read:customers", "write:customers"],
  },
  {
    id: "sales",
    name: "Sales",
    description: "Quotes, orders, invoices, and payments",
    enabled: true,
    comingSoon: false,
    navItems: [
      { id: "sales-quotes", labelKey: "nav.salesQuotes", icon: FileSignature, path: "/sales/quotes" },
      { id: "sales-orders", labelKey: "nav.salesOrders", icon: ClipboardList, path: "/sales/orders" },
      { id: "sales-invoices", labelKey: "nav.salesInvoices", icon: Receipt, path: "/sales/invoices" },
      { id: "sales-copilot", labelKey: "nav.salesCopilot", icon: Sparkles, path: "/sales/copilot" },
      { id: "sales-settings", labelKey: "nav.salesSettings", icon: SlidersHorizontal, path: "/sales/settings" },
    ],
    permissions: [
      "sales.quotes.read",
      "sales.orders.read",
      "sales.invoices.read",
      "sales.settings.manage",
    ],
  },
  // Coming soon modules
  {
    id: "projects",
    name: "Projects",
    description: "Project management and time tracking",
    enabled: false,
    comingSoon: true,
    navItems: [{ id: "projects", labelKey: "nav.projects", icon: FolderKanban, path: "/projects" }],
    permissions: ["read:projects", "write:projects"],
  },
  {
    id: "accounting",
    name: "Accounting",
    description: "Full accounting and financial reports",
    enabled: true,
    comingSoon: false,
    navItems: [
      { id: "accounting", labelKey: "nav.accounting", icon: Calculator, path: "/accounting" },
    ],
    permissions: ["read:accounting", "write:accounting"],
  },
  {
    id: "purchasing",
    name: "Purchasing",
    description: "Purchase orders and vendor bills",
    enabled: true,
    comingSoon: false,
    navItems: [
      {
        id: "purchase-orders",
        labelKey: "nav.purchaseOrders",
        icon: ShoppingCart,
        path: "/purchasing/purchase-orders",
      },
      {
        id: "vendor-bills",
        labelKey: "nav.vendorBills",
        icon: ShoppingCart,
        path: "/purchasing/vendor-bills",
      },
      {
        id: "purchasing-settings",
        labelKey: "nav.purchasingSettings",
        icon: ShoppingCart,
        path: "/purchasing/settings",
      },
      {
        id: "purchasing-copilot",
        labelKey: "nav.purchasingCopilot",
        icon: ShoppingCart,
        path: "/purchasing/copilot",
      },
    ],
    permissions: [
      "purchasing.po.read",
      "purchasing.po.manage",
      "purchasing.bills.read",
      "purchasing.bills.manage",
    ],
  },
  {
    id: "inventory",
    name: "Inventory",
    description: "Inventory and stock management",
    enabled: false,
    comingSoon: true,
    navItems: [{ id: "inventory", labelKey: "nav.inventory", icon: Package, path: "/inventory" }],
    permissions: ["read:inventory", "write:inventory"],
  },
  {
    id: "automation",
    name: "Automation",
    description: "Workflow automation and integrations",
    enabled: false,
    comingSoon: true,
    navItems: [{ id: "automation", labelKey: "nav.automation", icon: Zap, path: "/automation" }],
    permissions: ["read:automation", "write:automation"],
  },
  {
    id: "documents",
    name: "Documents",
    description: "Document storage and management",
    enabled: false,
    comingSoon: true,
    navItems: [{ id: "documents", labelKey: "nav.documents", icon: FileStack, path: "/documents" }],
    permissions: ["read:documents", "write:documents"],
  },
  {
    id: "hr",
    name: "HR",
    description: "Human resources and team management",
    enabled: false,
    comingSoon: true,
    navItems: [{ id: "hr", labelKey: "nav.hr", icon: UsersRound, path: "/hr" }],
    permissions: ["read:hr", "write:hr"],
  },
];

// Settings is always at the bottom, separate from modules
export const settingsNavItem: NavItem = {
  id: "settings",
  labelKey: "nav.settings",
  icon: Settings,
  path: "/settings",
};

// Helper functions
export function getEnabledModules(): ModuleDefinition[] {
  return moduleRegistry.filter((m) => m.enabled);
}

export function getComingSoonModules(): ModuleDefinition[] {
  return moduleRegistry.filter((m) => m.comingSoon);
}

export function getAllNavItems(): NavItem[] {
  return moduleRegistry.flatMap((m) => m.navItems);
}

export function getModuleById(id: string): ModuleDefinition | undefined {
  return moduleRegistry.find((m) => m.id === id);
}
