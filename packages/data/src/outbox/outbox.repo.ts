import { prisma } from '../prisma.client';
import { Prisma } from '@prisma/client';

export interface OutboxEventData {
  eventType: string;
  payloadJson: string;
  tenantId: string;
  availableAt?: Date;
}

export class OutboxRepository {
  async enqueue(data: OutboxEventData, tx?: Prisma.TransactionClient) {
    const client = tx || prisma;
    return client.outboxEvent.create({
      data: {
        tenantId: data.tenantId,
        eventType: data.eventType,
        payloadJson: data.payloadJson,
        availableAt: data.availableAt || new Date(),
      },
    });
  }

  async fetchPending(limit: number = 10) {
    return prisma.outboxEvent.findMany({
      where: {
        status: 'PENDING',
        availableAt: { lte: new Date() },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  async markSent(id: string) {
    return prisma.outboxEvent.update({
      where: { id },
      data: { status: 'SENT' },
    });
  }

  async markFailed(id: string, error: string) {
    return prisma.outboxEvent.update({
      where: { id },
      data: {
        status: 'FAILED',
        attempts: { increment: 1 },
      },
    });
  }
}