import { Injectable } from "@nestjs/common";
import { prisma } from "@kerniflow/data";
import { IOutboxPort } from "../../application/ports/outbox.port";

/**
 * Prisma Outbox Adapter Implementation
 * Persists domain events to the Outbox table for eventual consistency
 */
@Injectable()
export class PrismaOutboxAdapter implements IOutboxPort {
  async enqueue(data: { tenantId: string; eventType: string; payloadJson: string }): Promise<void> {
    await prisma.outboxEvent.create({
      data: {
        tenantId: data.tenantId,
        eventType: data.eventType,
        payloadJson: data.payloadJson,
        status: "PENDING",
        attempts: 0,
        availableAt: new Date(),
      },
    });
  }
}
