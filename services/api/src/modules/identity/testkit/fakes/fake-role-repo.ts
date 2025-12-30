import { type RoleRepositoryPort } from "../../application/ports/role-repository.port";

export class FakeRoleRepository implements RoleRepositoryPort {
  roles: Array<{
    id: string;
    tenantId: string;
    name: string;
    description: string | null;
    isSystem: boolean;
    systemKey: string | null;
  }> = [];

  async create(data: {
    id: string;
    tenantId: string;
    name: string;
    description?: string | null;
    isSystem?: boolean;
    systemKey?: string | undefined;
  }): Promise<void> {
    this.roles.push({
      ...data,
      description: data.description ?? null,
      isSystem: data.isSystem ?? false,
      systemKey: data.systemKey ?? null,
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
    return this.roles.find((r) => r.tenantId === tenantId && r.id === id) ?? null;
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
    return this.roles.find((r) => r.tenantId === tenantId && r.systemKey === systemKey) ?? null;
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
    return this.roles.filter((r) => r.tenantId === tenantId);
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
    return this.roles.find((r) => r.tenantId === tenantId && r.name === name) ?? null;
  }

  async update(
    tenantId: string,
    roleId: string,
    patch: { name?: string; description?: string | null }
  ): Promise<void> {
    const role = this.roles.find((r) => r.tenantId === tenantId && r.id === roleId);
    if (!role) {
      return;
    }
    if (patch.name !== undefined) {
      role.name = patch.name;
    }
    if (patch.description !== undefined) {
      role.description = patch.description ?? null;
    }
  }

  async delete(tenantId: string, roleId: string): Promise<void> {
    this.roles = this.roles.filter((r) => !(r.tenantId === tenantId && r.id === roleId));
  }
}
