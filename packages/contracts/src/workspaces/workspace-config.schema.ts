import { z } from "zod";
import { MenuItemSchema } from "../platform/menu.schema";
import { WorkspaceKindSchema, WorkspaceMembershipRoleSchema } from "./workspace.types";

export const WorkspaceCapabilitiesSchema = z.object({
  "workspace.multiUser": z.boolean(),
  "workspace.rbac": z.boolean(),
  approvals: z.boolean(),
  "invoices.advanced": z.boolean(),
  "sales.quotes": z.boolean(),
  "sales.projects": z.boolean(),
  "time.tracking": z.boolean(),
  "purchasing.purchaseOrders": z.boolean(),
  "purchasing.supplierPortal": z.boolean(),
  "inventory.basic": z.boolean(),
  "inventory.warehouses": z.boolean(),
  "inventory.serialTracking": z.boolean(),
  "finance.costCenters": z.boolean(),
  "finance.budgeting": z.boolean(),
  "finance.multiCurrency": z.boolean(),
  "tax.vatReporting": z.boolean(),
  "tax.profiles": z.boolean(),
  "crm.advanced": z.boolean(),
  "marketing.basic": z.boolean(),
  "pos.basic": z.boolean(),
  "pos.multiRegister": z.boolean(),
  "ai.copilot": z.boolean(),
  "platform.apiAccess": z.boolean(),
  "platform.webhooks": z.boolean(),
  "platform.customFields": z.boolean(),
});

export type WorkspaceCapabilities = z.infer<typeof WorkspaceCapabilitiesSchema>;
export type WorkspaceCapabilityKey = keyof WorkspaceCapabilities;

export const WorkspaceTerminologySchema = z.object({
  partyLabel: z.string(),
  partyLabelPlural: z.string(),
  invoiceLabel: z.string(),
  invoiceLabelPlural: z.string(),
  quoteLabel: z.string(),
  quoteLabelPlural: z.string(),
  projectLabel: z.string(),
  projectLabelPlural: z.string(),
  expenseLabel: z.string(),
  expenseLabelPlural: z.string(),
});

export type WorkspaceTerminology = z.infer<typeof WorkspaceTerminologySchema>;

export const WorkspaceDashboardWidgetSchema = z.object({
  id: z.string(),
  titleKey: z.string(),
  defaultTitle: z.string(),
  widgetType: z.string(),
  order: z.number(),
  size: z.string(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export type WorkspaceDashboardWidget = z.infer<typeof WorkspaceDashboardWidgetSchema>;

export const WorkspaceNavigationItemSchema = MenuItemSchema.extend({
  requiredCapabilities: z.array(z.string()).optional(),
});

export type WorkspaceNavigationItem = z.infer<typeof WorkspaceNavigationItemSchema>;

export const WorkspaceNavigationGroupSchema = z.object({
  id: z.string(),
  labelKey: z.string(),
  defaultLabel: z.string(),
  order: z.number(),
  items: z.array(WorkspaceNavigationItemSchema),
});

export type WorkspaceNavigationGroup = z.infer<typeof WorkspaceNavigationGroupSchema>;

export const WorkspaceNavigationSchema = z.object({
  groups: z.array(WorkspaceNavigationGroupSchema),
});

export type WorkspaceNavigation = z.infer<typeof WorkspaceNavigationSchema>;

export const WorkspaceConfigSchema = z.object({
  workspaceId: z.string(),
  kind: WorkspaceKindSchema,
  capabilities: WorkspaceCapabilitiesSchema,
  terminology: WorkspaceTerminologySchema,
  navigation: WorkspaceNavigationSchema,
  home: z.object({
    widgets: z.array(WorkspaceDashboardWidgetSchema),
  }),
  currentUser: z.object({
    membershipRole: WorkspaceMembershipRoleSchema,
    isWorkspaceAdmin: z.boolean(),
  }),
  computedAt: z.string(),
});

export type WorkspaceConfig = z.infer<typeof WorkspaceConfigSchema>;
