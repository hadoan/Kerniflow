import { CanActivate, ExecutionContext, Injectable, BadRequestException } from "@nestjs/common";
import { HEADER_TENANT_ID } from "../../../../../shared/request-context/index.js";

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    if (request.context?.tenantId || request.tenantId) {
      return true;
    }
    const tenantId = request.headers[HEADER_TENANT_ID] as string | undefined;
    if (!tenantId) {
      throw new BadRequestException("Missing X-Tenant-Id");
    }
    request.tenantId = tenantId;
    return true;
  }
}
