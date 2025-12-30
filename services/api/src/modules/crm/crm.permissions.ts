import type { PermissionGroup } from "@corely/contracts";

export const crmPermissions: PermissionGroup[] = [
  {
    id: "crm",
    label: "CRM",
    permissions: [
      {
        key: "crm.deals.read",
        group: "crm",
        label: "Read deals",
        description: "View CRM deals and pipeline data.",
      },
      {
        key: "crm.deals.manage",
        group: "crm",
        label: "Manage deals",
        description: "Create and update deals, stages, and outcomes.",
      },
      {
        key: "crm.activities.read",
        group: "crm",
        label: "Read activities",
        description: "View CRM activities and timelines.",
      },
      {
        key: "crm.activities.manage",
        group: "crm",
        label: "Manage activities",
        description: "Create, update, and complete CRM activities.",
      },
    ],
  },
];
