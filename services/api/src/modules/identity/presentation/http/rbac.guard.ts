import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IMembershipRepository } from "../../application/ports/membership.repo.port";
import { IRoleRepository } from "../../application/ports/role.repo.port";

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
    private readonly membershipRepo: IMembershipRepository,
    private readonly roleRepo: IRoleRepository
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

    // Get role permissions
    const permissions = await this.roleRepo.getPermissions(membership.getRoleId());

    if (!permissions.includes(requiredPermission)) {
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
