import { Inject, Injectable } from "@nestjs/common";
import type { RolePermissionEffect } from "@corely/contracts";
import { NotFoundError, ValidationError } from "../../../../shared/errors/domain-errors";
import type { RoleRepositoryPort } from "../ports/role-repository.port";
import { ROLE_REPOSITORY_TOKEN } from "../ports/role-repository.port";
import type { PermissionCatalogPort } from "../ports/permission-catalog.port";
import { PERMISSION_CATALOG_PORT } from "../ports/permission-catalog.port";
import type { RolePermissionGrantRepositoryPort } from "../ports/role-permission-grant-repository.port";
import { ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN } from "../ports/role-permission-grant-repository.port";
import type { AuditPort } from "../ports/audit.port";
import { AUDIT_PORT_TOKEN } from "../ports/audit.port";
import type { RequestContext } from "../../../../shared/context/request-context";

export interface UpdateRolePermissionsCommand {
  tenantId: string;
  actorUserId: string;
  roleId: string;
  grants: Array<{ key: string; effect: RolePermissionEffect }>;
  context?: RequestContext;
}

@Injectable()
export class UpdateRolePermissionsUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY_TOKEN) private readonly roleRepo: RoleRepositoryPort,
    @Inject(PERMISSION_CATALOG_PORT) private readonly catalogPort: PermissionCatalogPort,
    @Inject(ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN)
    private readonly grantRepo: RolePermissionGrantRepositoryPort,
    @Inject(AUDIT_PORT_TOKEN) private readonly audit: AuditPort
  ) {}

  async execute(command: UpdateRolePermissionsCommand): Promise<void> {
    const role = await this.roleRepo.findById(command.tenantId, command.roleId);
    if (!role) {
      throw new NotFoundError("Role not found");
    }

    if (role.isSystem || role.systemKey) {
      throw new ValidationError("System roles cannot be edited");
    }

    const catalog = this.catalogPort.getCatalog();
    const validKeys = new Set(
      catalog.flatMap((group) => group.permissions.map((permission) => permission.key))
    );

    const unique = new Set<string>();
    const normalized: Array<{ key: string; effect: RolePermissionEffect }> = [];

    for (const grant of command.grants) {
      if (!validKeys.has(grant.key)) {
        throw new ValidationError(`Unknown permission key: ${grant.key}`);
      }
      if (unique.has(grant.key)) {
        throw new ValidationError(`Duplicate permission key: ${grant.key}`);
      }
      unique.add(grant.key);
      normalized.push({ key: grant.key, effect: grant.effect ?? "ALLOW" });
    }

    await this.grantRepo.replaceAll(
      command.tenantId,
      command.roleId,
      normalized,
      command.actorUserId
    );

    await this.audit.write({
      tenantId: command.tenantId,
      actorUserId: command.actorUserId,
      action: "identity.roles.permissions.update",
      targetType: "Role",
      targetId: command.roleId,
      context: command.context,
      metadataJson: JSON.stringify({
        details: `Updated ${normalized.length} permission grants`,
      }),
    });
  }
}
