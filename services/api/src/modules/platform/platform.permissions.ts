/**
 * Platform Module Permissions
 * Permissions for managing tenant apps, templates, packs, and menu
 */

export interface PermissionDefinition {
  key: string;
  group: string;
  label: string;
  description?: string;
  danger?: boolean;
}

export interface PermissionGroup {
  id: string;
  label: string;
  permissions: PermissionDefinition[];
}

export const platformPermissions: PermissionGroup[] = [
  {
    id: "platform",
    label: "Platform Management",
    permissions: [
      {
        key: "platform.apps.manage",
        group: "platform",
        label: "Manage Apps",
        description: "Enable and disable apps for the tenant",
        danger: true,
      },
      {
        key: "platform.templates.apply",
        group: "platform",
        label: "Apply Templates",
        description: "Apply configuration templates to the tenant",
        danger: false,
      },
      {
        key: "platform.packs.install",
        group: "platform",
        label: "Install Packs",
        description: "Install app bundles and configuration packs",
        danger: true,
      },
      {
        key: "platform.menu.customize",
        group: "platform",
        label: "Customize Menu",
        description: "Customize tenant menu layout and visibility",
        danger: false,
      },
    ],
  },
];
