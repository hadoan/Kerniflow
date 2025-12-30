import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
  Inject,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { MembershipRepositoryPort } from "../../application/ports/membership-repository.port";
import { MEMBERSHIP_REPOSITORY_TOKEN } from "../../application/ports/membership-repository.port";
import type { RolePermissionGrantRepositoryPort } from "../../application/ports/role-permission-grant-repository.port";
import { ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN } from "../../application/ports/role-permission-grant-repository.port";
import {
  computeEffectivePermissionSet,
  hasPermission,
} from "../../../../shared/permissions/effective-permissions";

export const REQUIRE_PERMISSION = "require_permission";

/**
 * RBAC Guard
 * Checks if user has required permission in the current tenant
 * Usage: @UseGuards(RbacGuard) @Require Permission('invoice.write')
 */
@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(MEMBERSHIP_REPOSITORY_TOKEN)
    private readonly membershipRepo: MembershipRepositoryPort,
    @Inject(ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN)
    private readonly grantRepo: RolePermissionGrantRepositoryPort
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<string>(REQUIRE_PERMISSION, context.getHandler());

    if (!requiredPermission) {
      return true; // No permission required
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;
    const tenantId = request.tenantId;

    if (!userId || !tenantId) {
      throw new ForbiddenException("User or tenant not found in context");
    }

    // Get user's membership and role
    const membership = await this.membershipRepo.findByTenantAndUser(tenantId, userId);

    if (!membership) {
      throw new ForbiddenException("User is not a member of this tenant");
    }

    const grants = await this.grantRepo.listByRoleIdsAndTenant(tenantId, [membership.getRoleId()]);
    const grantSet = computeEffectivePermissionSet(grants);
    const canAccess = hasPermission(grantSet, requiredPermission);

    if (!canAccess) {
      throw new ForbiddenException(`User does not have permission: ${requiredPermission}`);
    }

    return true;
  }
}

/**
 * Decorator to require a specific permission
 */
export const RequirePermission = (permission: string) => {
  return SetMetadata(REQUIRE_PERMISSION, permission);
};
