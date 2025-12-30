import { Injectable, Inject } from "@nestjs/common";
import { PrismaService } from "@corely/data";
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
    description?: string | null;
    isSystem?: boolean;
    systemKey?: string;
  }): Promise<void> {
    await this.prisma.role.create({
      data: {
        id: data.id,
        tenantId: data.tenantId,
        name: data.name,
        description: data.description ?? null,
        isSystem: data.isSystem ?? false,
        systemKey: data.systemKey || null,
      },
    });
  }

  async findById(
    tenantId: string,
    id: string
  ): Promise<{
    id: string;
    tenantId: string;
    name: string;
    description: string | null;
    isSystem: boolean;
    systemKey: string | null;
  } | null> {
    return await this.prisma.role.findFirst({
      where: { tenantId, id },
      select: {
        id: true,
        tenantId: true,
        name: true,
        description: true,
        isSystem: true,
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
    description: string | null;
    isSystem: boolean;
    systemKey: string | null;
  } | null> {
    return await this.prisma.role.findUnique({
      where: { tenantId_systemKey: { tenantId, systemKey } },
      select: {
        id: true,
        tenantId: true,
        name: true,
        description: true,
        isSystem: true,
        systemKey: true,
      },
    });
  }

  async listByTenant(tenantId: string): Promise<
    Array<{
      id: string;
      tenantId: string;
      name: string;
      description: string | null;
      isSystem: boolean;
      systemKey: string | null;
    }>
  > {
    return await this.prisma.role.findMany({
      where: { tenantId },
      select: {
        id: true,
        tenantId: true,
        name: true,
        description: true,
        isSystem: true,
        systemKey: true,
      },
    });
  }

  async findByName(
    tenantId: string,
    name: string
  ): Promise<{
    id: string;
    tenantId: string;
    name: string;
    description: string | null;
    isSystem: boolean;
    systemKey: string | null;
  } | null> {
    return await this.prisma.role.findUnique({
      where: { tenantId_name: { tenantId, name } },
      select: {
        id: true,
        tenantId: true,
        name: true,
        description: true,
        isSystem: true,
        systemKey: true,
      },
    });
  }

  async update(
    tenantId: string,
    roleId: string,
    patch: { name?: string; description?: string | null }
  ): Promise<void> {
    await this.prisma.role.updateMany({
      where: { tenantId, id: roleId },
      data: {
        name: patch.name,
        description: patch.description,
      },
    });
  }

  async delete(tenantId: string, roleId: string): Promise<void> {
    await this.prisma.role.deleteMany({
      where: { tenantId, id: roleId },
    });
  }
}
