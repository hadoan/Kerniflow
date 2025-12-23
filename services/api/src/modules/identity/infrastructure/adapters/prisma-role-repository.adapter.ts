import { Injectable } from "@nestjs/common";
import { prisma } from "@kerniflow/data";
import { IRoleRepository } from "../../application/ports/role.repo.port";

/**
 * Prisma Role Repository Implementation
 */
@Injectable()
export class PrismaRoleRepository implements IRoleRepository {
  async create(data: {
    id: string;
    tenantId: string;
    name: string;
    systemKey?: string;
  }): Promise<void> {
    await prisma.role.create({
      data: {
        id: data.id,
        tenantId: data.tenantId,
        name: data.name,
        systemKey: data.systemKey || null,
      },
    });
  }

  async findById(id: string): Promise<{
    id: string;
    tenantId: string;
    name: string;
    systemKey: string | null;
  } | null> {
    return await prisma.role.findUnique({
      where: { id },
      select: {
        id: true,
        tenantId: true,
        name: true,
        systemKey: true,
      },
    });
  }

  async findBySystemKey(
    tenantId: string,
    systemKey: string
  ): Promise<{
    id: string;
    tenantId: string;
    name: string;
    systemKey: string | null;
  } | null> {
    return await prisma.role.findUnique({
      where: { tenantId_systemKey: { tenantId, systemKey } },
      select: {
        id: true,
        tenantId: true,
        name: true,
        systemKey: true,
      },
    });
  }

  async listByTenant(tenantId: string): Promise<
    Array<{
      id: string;
      tenantId: string;
      name: string;
      systemKey: string | null;
    }>
  > {
    return await prisma.role.findMany({
      where: { tenantId },
      select: {
        id: true,
        tenantId: true,
        name: true,
        systemKey: true,
      },
    });
  }

  async getPermissions(roleId: string): Promise<string[]> {
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { roleId },
      include: {
        permission: true,
      },
    });

    return rolePermissions.map((rp) => rp.permission.key);
  }
}
