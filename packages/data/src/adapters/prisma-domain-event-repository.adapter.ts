import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { getPrismaClient } from "../uow/prisma-unit-of-work.adapter";
import type { TransactionContext } from "@corely/kernel";

export interface DomainEventCreateInput {
  tenantId: string;
  eventType: string;
  payload: string;
}

@Injectable()
export class DomainEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async append(event: DomainEventCreateInput, tx?: TransactionContext) {
    const client = getPrismaClient(this.prisma, tx);
    return client.domainEvent.create({ data: event });
  }
}
