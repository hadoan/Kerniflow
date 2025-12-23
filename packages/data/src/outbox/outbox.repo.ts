import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { getPrismaClient } from "../uow/prisma-unit-of-work.adapter";
import type { TransactionContext } from "@kerniflow/kernel";

export interface OutboxEventData {
  eventType: string;
  payloadJson: string;
  tenantId: string;
  availableAt?: Date;
}

/**
 * OutboxRepository for worker polling use cases.
 * This is separate from OutboxPort which is used by application layer.
 */
@Injectable()
export class OutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  async enqueue(data: OutboxEventData, tx?: TransactionContext): Promise<void> {
    const client = getPrismaClient(this.prisma, tx);

    await client.outboxEvent.create({
      data: {
        tenantId: data.tenantId,
        eventType: data.eventType,
        payloadJson: data.payloadJson,
        availableAt: data.availableAt ?? new Date(),
      },
    });
  }

  async fetchPending(limit: number = 10) {
    return this.prisma.outboxEvent.findMany({
      where: {
        status: "PENDING",
        availableAt: { lte: new Date() },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  }

  async markSent(id: string) {
    return this.prisma.outboxEvent.update({
      where: { id },
      data: { status: "SENT" },
    });
  }

  async markFailed(id: string, error: string) {
    return this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: "FAILED",
        attempts: { increment: 1 },
      },
    });
  }
}
