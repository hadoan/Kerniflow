import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { getPrismaClient } from "../uow/prisma-unit-of-work.adapter";
import type { TransactionContext } from "@corely/kernel";

export interface WorkflowEventCreateInput {
  tenantId: string;
  instanceId: string;
  type: string;
  payload: string;
}

@Injectable()
export class WorkflowEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async append(event: WorkflowEventCreateInput, tx?: TransactionContext) {
    const client = getPrismaClient(this.prisma, tx);
    return client.workflowEvent.create({ data: event });
  }

  async appendMany(events: WorkflowEventCreateInput[], tx?: TransactionContext) {
    const client = getPrismaClient(this.prisma, tx);
    if (!events.length) {
      return { count: 0 };
    }

    return client.workflowEvent.createMany({ data: events });
  }

  async listByInstance(tenantId: string, instanceId: string) {
    return this.prisma.workflowEvent.findMany({
      where: { tenantId, instanceId },
      orderBy: { createdAt: "asc" },
    });
  }
}
