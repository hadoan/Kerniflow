import type { PermissionGroup } from "@corely/contracts";

export interface PermissionCatalogPort {
  getCatalog(): PermissionGroup[];
}

export const PERMISSION_CATALOG_PORT = "identity/permission-catalog";
