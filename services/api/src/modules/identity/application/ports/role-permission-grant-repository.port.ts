import type { RolePermissionEffect } from "@corely/contracts";

export interface RolePermissionGrantRepositoryPort {
  listByRole(
    tenantId: string,
    roleId: string
  ): Promise<Array<{ key: string; effect: RolePermissionEffect }>>;

  replaceAll(
    tenantId: string,
    roleId: string,
    grants: Array<{ key: string; effect: RolePermissionEffect }>,
    createdBy?: string | null
  ): Promise<void>;
}

export const ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN = "identity/role-permission-grant-repository";
