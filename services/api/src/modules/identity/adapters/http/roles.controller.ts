import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
  Headers,
  HttpException,
} from "@nestjs/common";
import {
  CreateRoleInputSchema,
  UpdateRoleInputSchema,
  UpdateRolePermissionsRequestSchema,
} from "@corely/contracts";
import { AuthGuard } from "./auth.guard";
import { RbacGuard, RequirePermission } from "./rbac.guard";
import { CurrentTenantId, CurrentUserId } from "./current-user.decorator";
import { ListRolesUseCase } from "../../application/use-cases/list-roles.usecase";
import { CreateRoleUseCase } from "../../application/use-cases/create-role.usecase";
import { UpdateRoleUseCase } from "../../application/use-cases/update-role.usecase";
import { DeleteRoleUseCase } from "../../application/use-cases/delete-role.usecase";
import { GetRolePermissionsUseCase } from "../../application/use-cases/get-role-permissions.usecase";
import { UpdateRolePermissionsUseCase } from "../../application/use-cases/update-role-permissions.usecase";
import { buildRequestContext } from "../../../../shared/context/request-context";
import { mapErrorToHttp } from "../../../../shared/errors/domain-errors";

@Controller("identity/roles")
@UseGuards(AuthGuard, RbacGuard)
export class RolesController {
  constructor(
    @Inject(ListRolesUseCase) private readonly listRolesUseCase: ListRolesUseCase,
    @Inject(CreateRoleUseCase) private readonly createRoleUseCase: CreateRoleUseCase,
    @Inject(UpdateRoleUseCase) private readonly updateRoleUseCase: UpdateRoleUseCase,
    @Inject(DeleteRoleUseCase) private readonly deleteRoleUseCase: DeleteRoleUseCase,
    @Inject(GetRolePermissionsUseCase)
    private readonly getRolePermissionsUseCase: GetRolePermissionsUseCase,
    @Inject(UpdateRolePermissionsUseCase)
    private readonly updateRolePermissionsUseCase: UpdateRolePermissionsUseCase
  ) {}

  @Get()
  @RequirePermission("settings.roles.manage")
  async list(@CurrentTenantId() tenantId: string, @CurrentUserId() userId: string) {
    try {
      return await this.listRolesUseCase.execute({ tenantId, actorUserId: userId });
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  @Post()
  @RequirePermission("settings.roles.manage")
  async create(
    @Body() body: unknown,
    @CurrentTenantId() tenantId: string,
    @CurrentUserId() userId: string
  ) {
    try {
      const input = CreateRoleInputSchema.parse(body);
      const role = await this.createRoleUseCase.execute({
        tenantId,
        actorUserId: userId,
        name: input.name,
        description: input.description ?? null,
      });
      return { role };
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  @Patch(":roleId")
  @RequirePermission("settings.roles.manage")
  async update(
    @Param("roleId") roleId: string,
    @Body() body: unknown,
    @CurrentTenantId() tenantId: string,
    @CurrentUserId() userId: string
  ) {
    try {
      const input = UpdateRoleInputSchema.parse(body);
      const role = await this.updateRoleUseCase.execute({
        tenantId,
        actorUserId: userId,
        roleId,
        name: input.name,
        description: input.description,
      });
      return { role };
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  @Delete(":roleId")
  @RequirePermission("settings.roles.manage")
  async remove(
    @Param("roleId") roleId: string,
    @CurrentTenantId() tenantId: string,
    @CurrentUserId() userId: string
  ) {
    try {
      await this.deleteRoleUseCase.execute({ tenantId, actorUserId: userId, roleId });
      return { success: true };
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  @Get(":roleId/permissions")
  @RequirePermission("settings.roles.manage")
  async getRolePermissions(
    @Param("roleId") roleId: string,
    @CurrentTenantId() tenantId: string,
    @CurrentUserId() userId: string
  ) {
    try {
      return await this.getRolePermissionsUseCase.execute({
        tenantId,
        actorUserId: userId,
        roleId,
      });
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  @Put(":roleId/permissions")
  @RequirePermission("settings.roles.manage")
  async updateRolePermissions(
    @Param("roleId") roleId: string,
    @Body() body: unknown,
    @CurrentTenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Headers("x-request-id") requestId?: string
  ) {
    try {
      const input = UpdateRolePermissionsRequestSchema.parse(body);
      await this.updateRolePermissionsUseCase.execute({
        tenantId,
        actorUserId: userId,
        roleId,
        grants: input.grants,
        context: buildRequestContext({ requestId, tenantId, actorUserId: userId }),
      });
      return { success: true };
    } catch (error) {
      throw this.mapDomainError(error);
    }
  }

  private mapDomainError(error: unknown): HttpException {
    const { status, body } = mapErrorToHttp(error);
    return new HttpException(body, status);
  }
}
