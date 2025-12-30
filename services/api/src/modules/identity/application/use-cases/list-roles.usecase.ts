import { Inject, Injectable } from "@nestjs/common";
import type { RoleDto } from "@corely/contracts";
import type { RoleRepositoryPort } from "../ports/role-repository.port";
import { ROLE_REPOSITORY_TOKEN } from "../ports/role-repository.port";

export interface ListRolesQuery {
  tenantId: string;
  actorUserId: string;
}

export interface ListRolesResult {
  roles: RoleDto[];
}

@Injectable()
export class ListRolesUseCase {
  constructor(@Inject(ROLE_REPOSITORY_TOKEN) private readonly roleRepo: RoleRepositoryPort) {}

  async execute(query: ListRolesQuery): Promise<ListRolesResult> {
    const roles = await this.roleRepo.listByTenant(query.tenantId);

    return {
      roles: roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description ?? null,
        isSystem: role.isSystem,
      })),
    };
  }
}
