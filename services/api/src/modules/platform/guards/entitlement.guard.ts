import { Injectable, CanActivate, ExecutionContext, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ForbiddenError } from "@corely/kernel";
import { TenantEntitlementService } from "../application/services/tenant-entitlement.service";

export const REQUIRE_APP = "require_app";
export const REQUIRE_CAPABILITY = "require_capability";

/**
 * Entitlement Guard
 * Enforces that tenant has enabled required apps or capabilities
 * Composable with RBAC guard - both must pass
 */
@Injectable()
export class EntitlementGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlementService: TenantEntitlementService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredApp = this.reflector.get<string>(REQUIRE_APP, context.getHandler());
    const requiredCapability = this.reflector.get<string>(REQUIRE_CAPABILITY, context.getHandler());

    // If no requirements, allow
    if (!requiredApp && !requiredCapability) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenantId;

    if (!tenantId) {
      throw new ForbiddenError("Tenant context not found", {
        code: "Platform:NoTenantContext",
      });
    }

    const entitlement = await this.entitlementService.getTenantEntitlement(tenantId);

    // Check required app
    if (requiredApp && !entitlement.isAppEnabled(requiredApp)) {
      throw new ForbiddenError(`App "${requiredApp}" is not enabled for this tenant`, {
        code: "Platform:AppNotEnabled",
      });
    }

    // Check required capability
    if (requiredCapability && !entitlement.hasCapability(requiredCapability)) {
      throw new ForbiddenError(`Capability "${requiredCapability}" is not available`, {
        code: "Platform:CapabilityNotAvailable",
      });
    }

    return true;
  }
}

/**
 * Decorator to require an app to be enabled
 */
export const RequireApp = (appId: string) => SetMetadata(REQUIRE_APP, appId);

/**
 * Decorator to require a capability
 */
export const RequireCapability = (capability: string) =>
  SetMetadata(REQUIRE_CAPABILITY, capability);
