import { Injectable, Inject } from "@nestjs/common";
import { PrismaService } from "@kerniflow/data";
import { RoleRepositoryPort } from "../../application/ports/role-repository.port";

/**
 * Prisma Role Repository Implementation
 */
@Injectable()
export class PrismaRoleRepository implements RoleRepositoryPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(data: {
    id: string;
    tenantId: string;
    name: string;
    systemKey?: string;
  }): Promise<void> {
    await this.prisma.role.create({
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
    return await this.prisma.role.findUnique({
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
    return await this.prisma.role.findUnique({
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
    return await this.prisma.role.findMany({
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
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: {
        permission: true,
      },
    });

    return rolePermissions.map((rp) => rp.permission.key);
  }
}
