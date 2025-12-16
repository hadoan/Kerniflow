import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { prisma } from '@kerniflow/data';

@Injectable()
export class IdempotencyGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const key = request.headers['x-idempotency-key'];
    const tenantId = request.body?.tenantId; // assume tenantId in body
    const action = request.route.path; // e.g., /expenses

    if (!key || !tenantId) return true; // allow if no key

    const existing = await prisma.idempotencyKey.findUnique({
      where: { tenantId_key: { tenantId, key } },
    });

    if (existing) {
      // Return stored response
      request.idempotentResponse = JSON.parse(existing.responseJson || '{}');
      return false; // block, but we'll handle in interceptor or something, but for simplicity, set on request
    }

    // Allow, and store later
    request.idempotencyKey = key;
    request.idempotencyAction = action;
    request.idempotencyTenantId = tenantId;
    return true;
  }
}