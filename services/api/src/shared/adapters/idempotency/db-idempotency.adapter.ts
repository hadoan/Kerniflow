import { type PrismaService } from "@corely/data";
import { type IdempotencyPort } from "@corely/kernel";

/**
 * Database-backed idempotency cache. The provided key should already encode
 * tenant/action uniqueness (e.g. include tenantId + use case name).
 */
export class DbIdempotencyAdapter implements IdempotencyPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actionKey = "usecase"
  ) {}

  async run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const uniqueKey = {
      tenantId: null,
      actionKey: this.actionKey,
      key,
    };

    const existing = await this.prisma.idempotencyKey.findUnique({
      where: {
        tenantId_actionKey_key: uniqueKey as any,
      },
    });

    if (existing?.responseJson) {
      return JSON.parse(existing.responseJson) as T;
    }

    const result = await fn();

    await this.prisma.idempotencyKey.upsert({
      where: { tenantId_actionKey_key: uniqueKey as any },
      update: {
        responseJson: this.serialize(result),
      },
      create: {
        ...uniqueKey,
        responseJson: this.serialize(result),
      },
    });

    return result;
  }

  private serialize(value: unknown): string {
    return JSON.stringify(value, (_key, val) => {
      if (val instanceof Error) {
        return { name: val.name, message: val.message };
      }
      return val;
    });
  }
}
