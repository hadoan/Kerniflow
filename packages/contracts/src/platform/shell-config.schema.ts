import { z } from "zod";
import { MenuScopeSchema, MenuSectionSchema } from "./menu.schema";
import { WorkspaceKindSchema } from "../workspaces/workspace.types";

/**
 * Shell Config - Server-driven UI configuration
 *
 * This is the primary contract for server-driven UI. It combines:
 * - Navigation menu (filtered by permissions and capabilities)
 * - Feature capabilities (what the tenant can do)
 * - Terminology customizations (labels/copy)
 * - Home/dashboard layout
 * - Enabled modules/packs
 *
 * The frontend renders the entire AppShell from this single source of truth.
 */

/**
 * Tenant Info - Basic tenant/workspace context
 */
export const ShellTenantInfoSchema = z.object({
  tenantId: z.string(),
  workspaceId: z.string(),
  workspaceName: z.string(),
  businessMode: WorkspaceKindSchema.describe("PERSONAL (freelancer) or COMPANY"),
});

export type ShellTenantInfo = z.infer<typeof ShellTenantInfoSchema>;

/**
 * Navigation Group - Logical grouping of menu items
 */
export const NavigationGroupSchema = z.object({
  id: z.string().describe("Group identifier (e.g., 'core', 'sales', 'settings')"),
  labelKey: z.string().describe("i18n key for group label"),
  defaultLabel: z.string().describe("Fallback label if i18n not available"),
  order: z.number(),
  sections: z.array(MenuSectionSchema).describe("Sections within this group"),
});

export type NavigationGroup = z.infer<typeof NavigationGroupSchema>;

/**
 * Navigation Config - Complete navigation structure
 */
export const NavigationConfigSchema = z.object({
  groups: z.array(NavigationGroupSchema),
});

export type NavigationConfig = z.infer<typeof NavigationConfigSchema>;

/**
 * Dashboard Widget - Home screen widget configuration
 */
export const DashboardWidgetSchema = z.object({
  id: z.string(),
  titleKey: z.string().describe("i18n key for widget title"),
  defaultTitle: z.string(),
  widgetType: z
    .string()
    .describe("Widget component identifier (e.g., 'quick-actions', 'recent-invoices')"),
  order: z.number(),
  size: z.enum(["small", "medium", "large", "full"]).optional().default("medium"),
  config: z.record(z.unknown()).optional().describe("Widget-specific configuration"),
});

export type DashboardWidget = z.infer<typeof DashboardWidgetSchema>;

/**
 * Home Config - Dashboard/home screen layout
 */
export const HomeConfigSchema = z.object({
  widgets: z.array(DashboardWidgetSchema),
});

export type HomeConfig = z.infer<typeof HomeConfigSchema>;

/**
 * Capabilities - Feature flags and capabilities available to this tenant
 *
 * Used by modules to adapt UI (show/hide sections, required fields, etc.)
 * without hardcoding "if freelancer" checks.
 */
export const CapabilitiesSchema = z.object({
  // Multi-user features
  multiUser: z.boolean().describe("Can invite team members"),
  rbac: z.boolean().describe("Role-based access control available"),
  approvals: z.boolean().describe("Approval workflows available"),

  // Sales features
  advancedInvoicing: z
    .boolean()
    .describe("Advanced invoice features (recurring, partial payments)"),
  quotes: z.boolean().describe("Sales quotes module enabled"),
  projects: z.boolean().describe("Project tracking enabled"),
  timeTracking: z.boolean().describe("Time tracking enabled"),

  // Purchasing features
  purchaseOrders: z.boolean().describe("Purchase order management"),
  supplierPortal: z.boolean().describe("Supplier collaboration portal"),

  // Inventory features
  inventory: z.boolean().describe("Inventory management enabled"),
  warehouses: z.boolean().describe("Multi-warehouse support"),
  serialTracking: z.boolean().describe("Serial/lot number tracking"),

  // Finance features
  costCenters: z.boolean().describe("Cost center accounting"),
  budgeting: z.boolean().describe("Budget management"),
  multiCurrency: z.boolean().describe("Multi-currency support"),

  // Tax features
  vatReporting: z.boolean().describe("VAT/GST reporting"),
  taxProfiles: z.boolean().describe("Multiple tax profiles"),

  // CRM features
  advancedCrm: z.boolean().describe("Advanced CRM features (pipelines, campaigns)"),
  marketing: z.boolean().describe("Marketing automation"),

  // POS features
  pos: z.boolean().describe("Point of sale enabled"),
  posMultiRegister: z.boolean().describe("Multiple POS registers"),

  // Platform features
  aiCopilot: z.boolean().describe("AI assistant enabled"),
  apiAccess: z.boolean().describe("API access enabled"),
  webhooks: z.boolean().describe("Webhook integrations"),
  customFields: z.boolean().describe("Custom field definitions"),
});

export type Capabilities = z.infer<typeof CapabilitiesSchema>;

/**
 * Terminology - UI copy customizations
 *
 * Allows adapting labels based on business mode or industry.
 * Example: "Client" vs "Customer", "Project" vs "Job"
 */
export const TerminologySchema = z.object({
  partyLabel: z.string().default("Client").describe("Customer/Client/Patient label"),
  partyLabelPlural: z.string().default("Clients"),
  invoiceLabel: z.string().default("Invoice"),
  invoiceLabelPlural: z.string().default("Invoices"),
  quoteLabel: z.string().default("Quote"),
  quoteLabelPlural: z.string().default("Quotes"),
  projectLabel: z.string().default("Project"),
  projectLabelPlural: z.string().default("Projects"),
  expenseLabel: z.string().default("Expense"),
  expenseLabelPlural: z.string().default("Expenses"),
});

export type Terminology = z.infer<typeof TerminologySchema>;

/**
 * Shell Config - Complete server-driven UI configuration
 */
export const ShellConfigSchema = z.object({
  schemaVersion: z.string().default("1.0.0").describe("Config schema version for compatibility"),
  tenant: ShellTenantInfoSchema,
  navigation: NavigationConfigSchema,
  home: HomeConfigSchema,
  capabilities: CapabilitiesSchema,
  terminology: TerminologySchema,
  enabledModules: z.array(z.string()).describe("List of enabled module/app IDs"),
  computedAt: z.string().describe("ISO timestamp when config was generated"),
});

export type ShellConfig = z.infer<typeof ShellConfigSchema>;

/**
 * Get Shell Config Query Params
 */
export const GetShellConfigQuerySchema = z.object({
  scope: MenuScopeSchema.default("web").describe("Target scope (web or pos)"),
  workspaceId: z.string().optional().describe("Specific workspace (defaults to active workspace)"),
});

export type GetShellConfigQuery = z.infer<typeof GetShellConfigQuerySchema>;
