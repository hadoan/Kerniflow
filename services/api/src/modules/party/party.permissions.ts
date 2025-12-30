import type { PermissionGroup } from "@corely/contracts";

export const partyPermissions: PermissionGroup[] = [
  {
    id: "party",
    label: "Party",
    permissions: [
      {
        key: "party.customers.read",
        group: "party",
        label: "Read customers",
        description: "View customers and related contact details.",
      },
      {
        key: "party.customers.manage",
        group: "party",
        label: "Manage customers",
        description: "Create, update, archive, and unarchive customers.",
      },
    ],
  },
];
