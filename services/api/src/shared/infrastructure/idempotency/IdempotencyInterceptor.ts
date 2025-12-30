import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { Observable, of } from "rxjs";
import { tap } from "rxjs/operators";
import { PrismaService } from "@corely/data";

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    // If Prisma isn't available (e.g., interceptor used without provider binding), skip idempotency logic
    if (!this.prisma) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const key = request.headers["x-idempotency-key"];
    const tenantId = request.body?.tenantId;
    const actionKey = request.route.path;

    if (key && tenantId) {
      const existing = await this.prisma.idempotencyKey.findUnique({
        where: { tenantId_actionKey_key: { tenantId, actionKey, key } },
      });

      if (existing) {
        response.status(200).json(JSON.parse(existing.responseJson || "{}"));
        return of(null); // short circuit
      }

      // Proceed, and store response
      return next.handle().pipe(
        tap(async (data) => {
          await this.prisma.idempotencyKey.create({
            data: {
              tenantId,
              key,
              actionKey,
              responseJson: JSON.stringify(data),
            },
          });
        })
      );
    }

    return next.handle();
  }
}
