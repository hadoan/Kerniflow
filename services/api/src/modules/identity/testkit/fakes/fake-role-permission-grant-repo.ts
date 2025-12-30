import type { RolePermissionEffect } from "@corely/contracts";
import type { RolePermissionGrantRepositoryPort } from "../../application/ports/role-permission-grant-repository.port";

export class FakeRolePermissionGrantRepository implements RolePermissionGrantRepositoryPort {
  grants: Array<{ tenantId: string; roleId: string; key: string; effect: RolePermissionEffect }> =
    [];

  async listByRoleIdsAndTenant(
    tenantId: string,
    roleIds: string[]
  ): Promise<Array<{ key: string; effect: RolePermissionEffect }>> {
    const uniqueRoles = Array.from(new Set(roleIds));
    if (uniqueRoles.length === 0) {
      return [];
    }

    return this.grants
      .filter((grant) => grant.tenantId === tenantId && uniqueRoles.includes(grant.roleId))
      .map((grant) => ({ key: grant.key, effect: grant.effect }));
  }

  async replaceAll(
    tenantId: string,
    roleId: string,
    grants: Array<{ key: string; effect: RolePermissionEffect }>,
    _createdBy?: string | null
  ): Promise<void> {
    this.grants = this.grants.filter(
      (grant) => !(grant.tenantId === tenantId && grant.roleId === roleId)
    );
    this.grants.push(
      ...grants.map((grant) => ({ tenantId, roleId, key: grant.key, effect: grant.effect }))
    );
  }
}
