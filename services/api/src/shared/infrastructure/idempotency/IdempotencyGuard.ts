import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { PrismaService } from "@corely/data";

@Injectable()
export class IdempotencyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const key = request.headers["x-idempotency-key"];
    const tenantId = request.body?.tenantId; // assume tenantId in body
    const actionKey = request.route.path; // e.g., /expenses

    if (!key || !tenantId) {
      return true;
    } // allow if no key

    const existing = await this.prisma.idempotencyKey.findUnique({
      where: { tenantId_actionKey_key: { tenantId, actionKey, key } },
    });

    if (existing) {
      // Return stored response
      request.idempotentResponse = JSON.parse(existing.responseJson || "{}");
      return false; // block, but we'll handle in interceptor or something, but for simplicity, set on request
    }

    // Allow, and store later
    request.idempotencyKey = key;
    request.idempotencyAction = actionKey;
    request.idempotencyTenantId = tenantId;
    return true;
  }
}
