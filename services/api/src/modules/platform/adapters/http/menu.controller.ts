import { Controller, Get, Put, Delete, Query, Body, UseGuards, Inject } from "@nestjs/common";
import { AuthGuard } from "../../../identity/adapters/http/auth.guard";
import {
  CurrentTenantId,
  CurrentUserId,
} from "../../../identity/adapters/http/current-user.decorator";
import { ComposeMenuUseCase } from "../../application/use-cases/compose-menu.usecase";
import { UpdateMenuOverridesUseCase } from "../../application/use-cases/update-menu-overrides.usecase";
import { ResetMenuOverridesUseCase } from "../../application/use-cases/reset-menu-overrides.usecase";
import type { MenuOverrides } from "@kerniflow/contracts";

/**
 * Temporary interface for role permission grant repository
 * This will be replaced with proper import once identity module is updated
 */
interface RolePermissionGrantRepositoryPort {
  listByRoleAndTenant(
    tenantId: string,
    roleId: string
  ): Promise<Array<{ permissionKey: string; effect: string }>>;
}

const ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN = Symbol("ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN");

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
    @Query("scope") scope: "web" | "pos" = "web",
    @CurrentTenantId() tenantId: string,
    @CurrentUserId() userId: string
    // TODO: Get roleId from JWT or membership lookup
    // For now, we'll need to add roleId to the JWT payload or look it up
  ) {
    // Temporary: This needs to be updated once we have proper role resolution
    // For now, assume we can get roleId from a membership lookup
    const roleId = "temp-role-id"; // This should come from membership or JWT

    // Get user permissions
    const grants = await this.grantRepo.listByRoleAndTenant(tenantId, roleId);

    // Filter to ALLOW grants only
    const permissions = grants.filter((g) => g.effect === "ALLOW").map((g) => g.permissionKey);

    return await this.composeMenuUseCase.execute({
      tenantId,
      userId,
      permissions,
      scope,
    });
  }

  @Put("overrides")
  async updateOverrides(
    @Query("scope") scope: "web" | "pos" = "web",
    @Body("overrides") overrides: MenuOverrides,
    @CurrentTenantId() tenantId: string,
    @CurrentUserId() userId: string
  ) {
    return await this.updateMenuOverridesUseCase.execute({
      tenantId,
      userId,
      scope,
      overrides,
    });
  }

  @Delete("overrides")
  async resetOverrides(
    @Query("scope") scope: "web" | "pos" = "web",
    @CurrentTenantId() tenantId: string
  ) {
    return await this.resetMenuOverridesUseCase.execute({
      tenantId,
      scope,
    });
  }
}
