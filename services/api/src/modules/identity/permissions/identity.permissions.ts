import type { PermissionGroup } from "@corely/contracts";

export const identityPermissions: PermissionGroup[] = [
  {
    id: "settings",
    label: "Settings",
    permissions: [
      {
        key: "settings.roles.manage",
        group: "settings",
        label: "Manage roles and permissions",
        description: "Create, update, delete roles and grant permissions.",
        danger: true,
      },
      {
        key: "settings.roles.read",
        group: "settings",
        label: "View roles and permissions",
        description: "View roles and permission assignments.",
      },
    ],
  },
];
