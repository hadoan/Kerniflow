import { BadRequestException, Controller, Get, Inject, Query, UseGuards } from "@nestjs/common";
import { GetShellConfigQuerySchema } from "@corely/contracts";
import { AuthGuard } from "../../../identity/adapters/http/auth.guard";
import {
  CurrentRoleIds,
  CurrentTenantId,
  CurrentUserId,
  CurrentWorkspaceId,
} from "../../../identity/adapters/http/current-user.decorator";
import { GetShellConfigUseCase } from "../../application/use-cases/get-shell-config.usecase";
import {
  ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN,
  type RolePermissionGrantRepositoryPort,
} from "../../../identity/application/ports/role-permission-grant-repository.port";
import { toAllowedPermissionKeys } from "../../../../shared/permissions/effective-permissions";

@Controller("shell-config")
@UseGuards(AuthGuard)
export class ShellConfigController {
  constructor(
    private readonly getShellConfigUseCase: GetShellConfigUseCase,
    @Inject(ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN)
    private readonly grantRepo: RolePermissionGrantRepositoryPort
  ) {}

  @Get()
  async getShellConfig(
    @Query("scope") scope: string | undefined,
    @Query("workspaceId") requestedWorkspaceId: string | undefined,
    @CurrentTenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @CurrentWorkspaceId() currentWorkspaceId: string | undefined,
    @CurrentRoleIds() roleIds: string[]
  ) {
    // Validate query params
    const parsed = GetShellConfigQuerySchema.safeParse({
      scope,
      workspaceId: requestedWorkspaceId,
    });

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.message);
    }

    if (!tenantId || !userId) {
      throw new BadRequestException("Missing tenant or user context");
    }

    // Use requested workspace or fall back to current workspace
    const workspaceId = requestedWorkspaceId || currentWorkspaceId;
    if (!workspaceId) {
      throw new BadRequestException("No workspace ID provided or found in context");
    }

    // Get user permissions for RBAC filtering
    const requestedRoles = Array.isArray(roleIds) ? roleIds : [];
    const grants =
      requestedRoles.length > 0
        ? await this.grantRepo.listByRoleIdsAndTenant(tenantId, requestedRoles)
        : [];
    const permissions = toAllowedPermissionKeys(grants);

    return await this.getShellConfigUseCase.execute({
      tenantId,
      userId,
      workspaceId,
      permissions,
      scope: parsed.data.scope,
    });
  }
}
