import { Injectable, Optional } from "@nestjs/common";
import { PrismaService } from "@corely/data";

export type IdempotencyStatus = "IN_PROGRESS" | "COMPLETED" | "FAILED";

export type StartOrReplayResult =
  | { mode: "STARTED" }
  | { mode: "REPLAY"; responseStatus: number; responseBody: unknown }
  | { mode: "IN_PROGRESS"; retryAfterMs?: number }
  | { mode: "MISMATCH" }
  | { mode: "FAILED"; responseStatus: number; responseBody: unknown };

const LOCK_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

@Injectable()
export class IdempotencyService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly now: () => Date = () => new Date()
  ) {}

  async startOrReplay(params: {
    actionKey: string;
    tenantId: string | null;
    userId?: string | null;
    idempotencyKey: string;
    requestHash?: string | null;
    ttlMs?: number;
  }): Promise<StartOrReplayResult> {
    const now = this.now();
    const ttlMs = params.ttlMs ?? 24 * 60 * 60 * 1000;
    const expiresAt = new Date(now.getTime() + ttlMs);

    const existing = await this.prisma.idempotencyKey.findUnique({
      where: {
        tenantId_actionKey_key: {
          tenantId: params.tenantId as any,
          actionKey: params.actionKey,
          key: params.idempotencyKey,
        },
      },
    });

    if (!existing) {
      await this.prisma.idempotencyKey.create({
        data: {
          tenantId: params.tenantId,
          actionKey: params.actionKey,
          key: params.idempotencyKey,
          // Additional fields are tolerated via cast until Prisma client is regenerated.
          userId: params.userId ?? null,
          requestHash: params.requestHash ?? null,
          status: "IN_PROGRESS",
          expiresAt,
        } as any,
      });
      return { mode: "STARTED" };
    }

    const existingRecord = existing as any;

    if (
      existingRecord.requestHash &&
      params.requestHash &&
      existingRecord.requestHash !== params.requestHash
    ) {
      return { mode: "MISMATCH" };
    }

    if (existingRecord.status === "COMPLETED") {
      return {
        mode: "REPLAY",
        responseStatus: existingRecord.responseStatus ?? existingRecord.statusCode ?? 200,
        responseBody: this.parseJson(existingRecord.responseJson),
      };
    }

    if (existingRecord.status === "FAILED") {
      return {
        mode: "FAILED",
        responseStatus: existingRecord.responseStatus ?? 500,
        responseBody: this.parseJson(existingRecord.responseJson),
      };
    }

    const updatedAt = existingRecord.updatedAt ?? existingRecord.createdAt;
    if (now.getTime() - updatedAt.getTime() > LOCK_TIMEOUT_MS) {
      await this.prisma.idempotencyKey.update({
        where: {
          tenantId_actionKey_key: {
            tenantId: existing.tenantId as any,
            actionKey: existing.actionKey,
            key: existing.key,
          },
        },
        data: {
          status: "IN_PROGRESS",
          updatedAt: now,
          requestHash: params.requestHash ?? null,
        } as any,
      });
      return { mode: "STARTED" };
    }

    return { mode: "IN_PROGRESS", retryAfterMs: 1000 };
  }

  async complete(params: {
    actionKey: string;
    tenantId: string | null;
    idempotencyKey: string;
    responseStatus: number;
    responseBody: unknown;
  }): Promise<void> {
    await this.prisma.idempotencyKey.update({
      where: {
        tenantId_actionKey_key: {
          tenantId: params.tenantId as any,
          actionKey: params.actionKey,
          key: params.idempotencyKey,
        },
      },
      data: {
        status: "COMPLETED",
        responseStatus: params.responseStatus,
        responseJson: JSON.stringify(params.responseBody ?? null),
      } as any,
    });
  }

  async fail(params: {
    actionKey: string;
    tenantId: string | null;
    idempotencyKey: string;
    responseStatus?: number;
    responseBody?: unknown;
  }): Promise<void> {
    await this.prisma.idempotencyKey.update({
      where: {
        tenantId_actionKey_key: {
          tenantId: params.tenantId as any,
          actionKey: params.actionKey,
          key: params.idempotencyKey,
        },
      },
      data: {
        status: "FAILED",
        responseStatus: params.responseStatus ?? 500,
        responseJson: JSON.stringify(params.responseBody ?? null),
      } as any,
    });
  }

  private parseJson(raw: string | null): unknown {
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
}
