import { Injectable, Inject } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { RolePermissionGrantRepositoryPort } from "../../application/ports/role-permission-grant-repository.port";
import type { RolePermissionEffect } from "@corely/contracts";

@Injectable()
export class PrismaRolePermissionGrantRepository implements RolePermissionGrantRepositoryPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listByRole(
    tenantId: string,
    roleId: string
  ): Promise<Array<{ key: string; effect: RolePermissionEffect }>> {
    const grants = await this.prisma.rolePermissionGrant.findMany({
      where: { tenantId, roleId },
      select: { permissionKey: true, effect: true },
    });

    return grants.map((grant) => ({ key: grant.permissionKey, effect: grant.effect }));
  }

  async replaceAll(
    tenantId: string,
    roleId: string,
    grants: Array<{ key: string; effect: RolePermissionEffect }>,
    createdBy?: string | null
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermissionGrant.deleteMany({
        where: { tenantId, roleId },
      });

      if (grants.length === 0) {
        return;
      }

      await tx.rolePermissionGrant.createMany({
        data: grants.map((grant) => ({
          tenantId,
          roleId,
          permissionKey: grant.key,
          effect: grant.effect,
          createdBy: createdBy ?? null,
        })),
      });
    });
  }
}
