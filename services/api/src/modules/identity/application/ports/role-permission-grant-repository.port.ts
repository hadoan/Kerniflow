import type { RolePermissionEffect } from "@corely/contracts";
import { ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN } from "../../identity.tokens";

export interface RolePermissionGrantRepositoryPort {
  listByRoleIdsAndTenant(
    tenantId: string,
    roleIds: string[]
  ): Promise<Array<{ key: string; effect: RolePermissionEffect }>>;

  replaceAll(
    tenantId: string,
    roleId: string,
    grants: Array<{ key: string; effect: RolePermissionEffect }>,
    createdBy?: string | null
  ): Promise<void>;
}

export { ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN };
