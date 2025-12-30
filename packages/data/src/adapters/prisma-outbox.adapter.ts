import { Injectable } from "@nestjs/common";
import { OutboxPort, TransactionContext } from "@corely/kernel";
import { PrismaService } from "../prisma/prisma.service";
import { getPrismaClient } from "../uow/prisma-unit-of-work.adapter";

/**
 * Prisma implementation of OutboxPort.
 * Supports both transactional and non-transactional operations.
 */
@Injectable()
export class PrismaOutboxAdapter implements OutboxPort {
  constructor(private readonly prisma: PrismaService) {}

  async enqueue(
    event: {
      eventType: string;
      payload: any;
      tenantId: string;
      correlationId?: string;
      availableAt?: Date;
    },
    tx?: TransactionContext
  ): Promise<void> {
    const client = getPrismaClient(this.prisma, tx);

    await client.outboxEvent.create({
      data: {
        tenantId: event.tenantId,
        eventType: event.eventType,
        payloadJson: JSON.stringify(event.payload ?? {}),
        correlationId: event.correlationId ?? null,
        availableAt: event.availableAt ?? new Date(),
      },
    });
  }
}
