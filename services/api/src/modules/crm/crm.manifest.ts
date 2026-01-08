import type { AppManifest } from "@corely/contracts";

/**
 * CRM App Manifest
 * Defines the CRM module as an installable app
 */
export const crmAppManifest: AppManifest = {
  appId: "crm",
  name: "CRM",
  tier: 2,
  version: "1.0.0",
  description: "Manage deals, activities, and customer relationships",
  dependencies: ["parties"],
  capabilities: ["crm.deals", "crm.activities"],
  permissions: [
    "crm.deals.read",
    "crm.deals.manage",
    "crm.activities.read",
    "crm.activities.manage",
  ],
  menu: [
    {
      id: "crm-deals",
      scope: "web",
      section: "crm",
      labelKey: "nav.crmDeals",
      defaultLabel: "Deals",
      route: "/crm/deals",
      icon: "FolderKanban",
      order: 35,
      requiresPermissions: ["crm.deals.read"],
    },
    {
      id: "crm-activities",
      scope: "web",
      section: "crm",
      labelKey: "nav.crmActivities",
      defaultLabel: "Activities",
      route: "/crm/activities",
      icon: "ClipboardList",
      order: 36,
      requiresPermissions: ["crm.activities.read"],
    },
  ],
};
