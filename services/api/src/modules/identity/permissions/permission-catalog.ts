import { Injectable, OnModuleInit } from "@nestjs/common";
import type { PermissionGroup } from "@corely/contracts";
import { ValidationError } from "../../../shared/errors/domain-errors";
import type { PermissionCatalogPort } from "../application/ports/permission-catalog.port";
import { identityPermissions } from "./identity.permissions";
import { salesPermissions } from "../../sales/sales.permissions";
import { inventoryPermissions } from "../../inventory/inventory.permissions";
import { partyPermissions } from "../../party/party.permissions";
import { crmPermissions } from "../../crm/crm.permissions";

const PERMISSION_KEY_REGEX = /^[a-z][a-z0-9]*(?:[.:][a-z0-9]+)*$/;

export const buildPermissionCatalog = (): PermissionGroup[] => [
  ...identityPermissions,
  ...salesPermissions,
  ...inventoryPermissions,
  ...partyPermissions,
  ...crmPermissions,
];

const normalizeCatalog = (catalog: PermissionGroup[]): PermissionGroup[] => {
  return catalog
    .map((group) => ({
      ...group,
      permissions: [...group.permissions].sort((a, b) => a.key.localeCompare(b.key)),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
};

export const validatePermissionCatalog = (catalog: PermissionGroup[]): void => {
  const seenKeys = new Set<string>();

  for (const group of catalog) {
    if (!group.id || !group.label) {
      throw new ValidationError("Permission groups require id and label");
    }
    if (!group.permissions || group.permissions.length === 0) {
      throw new ValidationError(`Permission group ${group.id} must have at least one permission`);
    }

    for (const permission of group.permissions) {
      if (!permission.key || !PERMISSION_KEY_REGEX.test(permission.key)) {
        throw new ValidationError(`Invalid permission key: ${permission.key}`);
      }
      if (permission.group !== group.id) {
        throw new ValidationError(
          `Permission ${permission.key} has mismatched group ${permission.group} for ${group.id}`
        );
      }
      if (seenKeys.has(permission.key)) {
        throw new ValidationError(`Duplicate permission key: ${permission.key}`);
      }
      seenKeys.add(permission.key);
    }
  }
};

@Injectable()
export class PermissionCatalogRegistry implements PermissionCatalogPort, OnModuleInit {
  private readonly catalog: PermissionGroup[];

  constructor() {
    const built = buildPermissionCatalog();
    validatePermissionCatalog(built);
    this.catalog = normalizeCatalog(built);
  }

  onModuleInit() {
    // Validation runs in constructor; this hook keeps intent explicit.
  }

  getCatalog(): PermissionGroup[] {
    return this.catalog;
  }
}
