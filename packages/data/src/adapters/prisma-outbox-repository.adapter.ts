import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { getPrismaClient } from "../uow/prisma-unit-of-work.adapter";
import type { TransactionContext } from "@corely/kernel";

export interface OutboxEventData {
  eventType: string;
  payload: unknown;
  tenantId: string;
  correlationId?: string;
  availableAt?: Date;
}

/**
 * OutboxRepository for worker polling use cases.
 * This is separate from OutboxPort which is used by application layer.
 */
function safeParsePayload(payloadJson: string): unknown {
  try {
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
}

@Injectable()
export class OutboxRepository {
  private readonly maxAttempts = 3;
  private readonly baseDelayMs = 5000;

  constructor(private readonly prisma: PrismaService) {}

  async enqueue(data: OutboxEventData, tx?: TransactionContext): Promise<void> {
    const client = getPrismaClient(this.prisma, tx);

    await client.outboxEvent.create({
      data: {
        tenantId: data.tenantId,
        eventType: data.eventType,
        payloadJson: JSON.stringify(data.payload ?? {}),
        correlationId: data.correlationId ?? null,
        availableAt: data.availableAt ?? new Date(),
      },
    });
  }

  async fetchPending(limit: number = 10) {
    const events = await this.prisma.outboxEvent.findMany({
      where: {
        status: "PENDING",
        availableAt: { lte: new Date() },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    return events.map((event) => ({
      ...event,
      payload: safeParsePayload(event.payloadJson ?? "{}"),
    }));
  }

  async markSent(id: string) {
    return this.prisma.outboxEvent.update({
      where: { id },
      data: { status: "SENT" },
    });
  }

  async markFailed(id: string, _error: string) {
    const updated = await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        attempts: { increment: 1 },
      },
    });

    if (updated.attempts >= this.maxAttempts) {
      await this.prisma.outboxEvent.update({
        where: { id },
        data: { status: "FAILED" },
      });
      return;
    }

    const delayMs = this.baseDelayMs * Math.pow(2, updated.attempts - 1);
    await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: "PENDING",
        availableAt: new Date(Date.now() + delayMs),
      },
    });
  }
}
