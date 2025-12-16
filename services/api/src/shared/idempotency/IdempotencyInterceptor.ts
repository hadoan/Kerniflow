import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { prisma } from '@kerniflow/data';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const key = request.headers['x-idempotency-key'];
    const tenantId = request.body?.tenantId;
    const action = request.route.path;

    if (key && tenantId) {
      const existing = await prisma.idempotencyKey.findUnique({
        where: { tenantId_key: { tenantId, key } },
      });

      if (existing) {
        response.status(200).json(JSON.parse(existing.responseJson || '{}'));
        return of(null); // short circuit
      }

      // Proceed, and store response
      return next.handle().pipe(
        tap(async (data) => {
          await prisma.idempotencyKey.create({
            data: {
              tenantId,
              key,
              action,
              responseJson: JSON.stringify(data),
            },
          });
        }),
      );
    }

    return next.handle();
  }
}