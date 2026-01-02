import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  GetMenuQuerySchema,
  UpdateMenuOverridesInputSchema,
  type MenuScope,
} from "@corely/contracts";
import { AuthGuard } from "../../../identity/adapters/http/auth.guard";
import {
  CurrentRoleIds,
  CurrentTenantId,
  CurrentUserId,
} from "../../../identity/adapters/http/current-user.decorator";
import { ComposeMenuUseCase } from "../../application/use-cases/compose-menu.usecase";
import { UpdateMenuOverridesUseCase } from "../../application/use-cases/update-menu-overrides.usecase";
import { ResetMenuOverridesUseCase } from "../../application/use-cases/reset-menu-overrides.usecase";
import {
  ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN,
  type RolePermissionGrantRepositoryPort,
} from "../../../identity/application/ports/role-permission-grant-repository.port";
import { toAllowedPermissionKeys } from "../../../../shared/permissions/effective-permissions";

@Controller("menu")
@UseGuards(AuthGuard)
export class MenuController {
  constructor(
    private readonly composeMenuUseCase: ComposeMenuUseCase,
    private readonly updateMenuOverridesUseCase: UpdateMenuOverridesUseCase,
    private readonly resetMenuOverridesUseCase: ResetMenuOverridesUseCase,
    @Inject(ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN)
    private readonly grantRepo: RolePermissionGrantRepositoryPort
  ) {}

  @Get()
  async getMenu(
    @Query("scope") scope: string | undefined,
    @Query("workspaceId") workspaceId: string | undefined,
    @CurrentTenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @CurrentRoleIds() roleIds: string[]
  ) {
    const validatedScope = this.parseScope(scope);
    if (!tenantId || !userId) {
      throw new BadRequestException("Missing tenant or user context");
    }

    const requestedRoles = Array.isArray(roleIds) ? roleIds : [];
    const grants =
      requestedRoles.length > 0
        ? await this.grantRepo.listByRoleIdsAndTenant(tenantId, requestedRoles)
        : [];
    const permissions = toAllowedPermissionKeys(grants);

    return await this.composeMenuUseCase.execute({
      tenantId,
      userId,
      permissions,
      scope: validatedScope,
      workspaceId, // Include workspace ID for metadata
    });
  }

  @Put("overrides")
  async updateOverrides(
    @Query("scope") scope: string | undefined,
    @Body("overrides") overrides: unknown,
    @CurrentTenantId() tenantId: string,
    @CurrentUserId() userId: string
  ) {
    const parsed = UpdateMenuOverridesInputSchema.safeParse({
      scope,
      overrides,
    });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.message);
    }

    if (!tenantId || !userId) {
      throw new BadRequestException("Missing tenant or user context");
    }

    return await this.updateMenuOverridesUseCase.execute({
      tenantId,
      userId,
      scope: parsed.data.scope,
      overrides: parsed.data.overrides,
    });
  }

  @Delete("overrides")
  async resetOverrides(
    @Query("scope") scope: string | undefined,
    @CurrentTenantId() tenantId: string
  ) {
    const validatedScope = this.parseScope(scope);
    if (!tenantId) {
      throw new BadRequestException("Missing tenant context");
    }
    return await this.resetMenuOverridesUseCase.execute({
      tenantId,
      scope: validatedScope,
    });
  }

  private parseScope(scope: string | undefined): MenuScope {
    const parsed = GetMenuQuerySchema.safeParse({ scope });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.message);
    }
    return parsed.data.scope;
  }
}
