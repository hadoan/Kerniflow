import { Inject, Injectable } from "@nestjs/common";
import type { RoleDto } from "@corely/contracts";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../../../shared/errors/domain-errors";
import type { RoleRepositoryPort } from "../ports/role-repository.port";
import { ROLE_REPOSITORY_TOKEN } from "../ports/role-repository.port";

export interface UpdateRoleCommand {
  tenantId: string;
  actorUserId: string;
  roleId: string;
  name?: string;
  description?: string | null;
}

@Injectable()
export class UpdateRoleUseCase {
  constructor(@Inject(ROLE_REPOSITORY_TOKEN) private readonly roleRepo: RoleRepositoryPort) {}

  async execute(command: UpdateRoleCommand): Promise<RoleDto> {
    const existing = await this.roleRepo.findById(command.tenantId, command.roleId);
    if (!existing) {
      throw new NotFoundError("Role not found");
    }

    const nextName = command.name?.trim();
    if (command.name !== undefined && !nextName) {
      throw new ValidationError("Role name cannot be empty");
    }

    if ((existing.isSystem || existing.systemKey) && nextName && nextName !== existing.name) {
      throw new ValidationError("System roles cannot be renamed");
    }

    if (nextName && nextName !== existing.name) {
      const conflicting = await this.roleRepo.findByName(command.tenantId, nextName);
      if (conflicting && conflicting.id !== existing.id) {
        throw new ConflictError("Role name already exists");
      }
    }

    await this.roleRepo.update(command.tenantId, existing.id, {
      name: nextName ?? existing.name,
      description: command.description !== undefined ? command.description : existing.description,
    });

    return {
      id: existing.id,
      name: nextName ?? existing.name,
      description: command.description !== undefined ? command.description : existing.description,
      isSystem: existing.isSystem,
    };
  }
}
