import { Inject, Injectable } from "@nestjs/common";
import type { RoleDto } from "@corely/contracts";
import { ConflictError, ValidationError } from "../../../../shared/errors/domain-errors";
import type { RoleRepositoryPort } from "../ports/role-repository.port";
import { ROLE_REPOSITORY_TOKEN } from "../ports/role-repository.port";
import type { IdGeneratorPort } from "../../../../shared/ports/id-generator.port";
import { ID_GENERATOR_TOKEN } from "../../../../shared/ports/id-generator.port";

export interface CreateRoleCommand {
  tenantId: string;
  actorUserId: string;
  name: string;
  description?: string | null;
}

const RESERVED_ROLE_NAMES = new Set(["owner", "admin", "accountant", "staff", "read-only"]);

@Injectable()
export class CreateRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY_TOKEN) private readonly roleRepo: RoleRepositoryPort,
    @Inject(ID_GENERATOR_TOKEN) private readonly idGenerator: IdGeneratorPort
  ) {}

  async execute(command: CreateRoleCommand): Promise<RoleDto> {
    const name = command.name.trim();
    if (!name) {
      throw new ValidationError("Role name is required");
    }

    if (RESERVED_ROLE_NAMES.has(name.toLowerCase())) {
      throw new ValidationError("Role name is reserved");
    }

    const existing = await this.roleRepo.findByName(command.tenantId, name);
    if (existing) {
      throw new ConflictError("Role name already exists");
    }

    const id = this.idGenerator.newId();
    await this.roleRepo.create({
      id,
      tenantId: command.tenantId,
      name,
      description: command.description ?? null,
      isSystem: false,
    });

    return {
      id,
      name,
      description: command.description ?? null,
      isSystem: false,
    };
  }
}
