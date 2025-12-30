import type { PermissionGroup } from "@corely/contracts";

export const inventoryPermissions: PermissionGroup[] = [
  {
    id: "inventory",
    label: "Inventory",
    permissions: [
      {
        key: "inventory.products.read",
        group: "inventory",
        label: "View products",
      },
      {
        key: "inventory.products.manage",
        group: "inventory",
        label: "Manage products",
      },
      {
        key: "inventory.warehouses.read",
        group: "inventory",
        label: "View warehouses",
      },
      {
        key: "inventory.warehouses.manage",
        group: "inventory",
        label: "Manage warehouses",
      },
      {
        key: "inventory.documents.read",
        group: "inventory",
        label: "View inventory documents",
      },
      {
        key: "inventory.documents.manage",
        group: "inventory",
        label: "Manage inventory documents",
      },
      {
        key: "inventory.documents.post",
        group: "inventory",
        label: "Post inventory documents",
        danger: true,
      },
      {
        key: "inventory.reorder.manage",
        group: "inventory",
        label: "Manage reorder policies",
      },
      {
        key: "inventory.ai.use",
        group: "inventory",
        label: "Use inventory copilot",
      },
    ],
  },
];
