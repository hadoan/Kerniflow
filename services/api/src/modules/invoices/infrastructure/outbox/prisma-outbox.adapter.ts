import { Injectable } from "@nestjs/common";
import { PrismaService } from "@kerniflow/data";
import { OutboxPort } from "../../application/ports/outbox.port";

@Injectable()
export class PrismaOutboxAdapter implements OutboxPort {
  constructor(private readonly prisma: PrismaService) {}

  async enqueue(event: {
    tenantId: string;
    eventType: string;
    payloadJson: string;
    correlationId?: string;
  }): Promise<void> {
    await prisma.outboxEvent.create({
      data: {
        tenantId: event.tenantId,
        eventType: event.eventType,
        payloadJson: event.payloadJson,
        correlationId: event.correlationId ?? null,
        status: "PENDING",
      },
    });
  }
}
