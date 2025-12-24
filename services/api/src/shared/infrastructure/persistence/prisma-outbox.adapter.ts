import { Injectable } from "@nestjs/common";
import { PrismaService } from "@kerniflow/data";
import type { OutboxPort } from "../../ports/outbox.port";

@Injectable()
export class PrismaOutboxAdapter implements OutboxPort {
  constructor(private readonly prisma: PrismaService) {}

  async enqueue(event: {
    eventType: string;
    payload: any;
    tenantId: string;
    correlationId?: string;
  }): Promise<void> {
    await this.prisma.outboxEvent.create({
      data: {
        tenantId: event.tenantId,
        eventType: event.eventType,
        payloadJson: JSON.stringify(event.payload ?? {}),
        correlationId: event.correlationId,
      },
    });
  }
}
