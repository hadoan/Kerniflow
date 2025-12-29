import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { getPrismaClient } from "../uow/prisma-unit-of-work.adapter";
import type { TransactionContext } from "@kerniflow/kernel";

export interface WorkflowTaskCreateInput {
  tenantId: string;
  instanceId: string;
  name: string;
  type: "HUMAN" | "TIMER" | "HTTP" | "EMAIL" | "AI" | "SYSTEM";
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED" | "SKIPPED";
  runAt?: Date | null;
  maxAttempts?: number;
  idempotencyKey?: string | null;
  input?: string | null;
  traceId?: string | null;
}

export interface WorkflowTaskUpdateResult {
  id: string;
  status: string;
}

@Injectable()
export class WorkflowTaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createTasks(inputs: WorkflowTaskCreateInput[], tx?: TransactionContext) {
    const client = getPrismaClient(this.prisma, tx);

    const created = [] as Array<{ id: string }>;
    for (const input of inputs) {
      if (input.idempotencyKey) {
        const existing = await client.task.findFirst({
          where: {
            tenantId: input.tenantId,
            idempotencyKey: input.idempotencyKey,
          },
        });

        if (existing) {
          continue;
        }
      }

      const task = await client.task.create({
        data: {
          tenantId: input.tenantId,
          instanceId: input.instanceId,
          name: input.name,
          type: input.type,
          status: input.status,
          runAt: input.runAt ?? null,
          maxAttempts: input.maxAttempts ?? 3,
          idempotencyKey: input.idempotencyKey ?? null,
          input: input.input ?? null,
          traceId: input.traceId ?? null,
        },
      });
      created.push({ id: task.id });
    }

    return created;
  }

  async findById(tenantId: string, id: string, tx?: TransactionContext) {
    const client = getPrismaClient(this.prisma, tx);
    return client.task.findFirst({ where: { tenantId, id } });
  }

  async listByInstance(tenantId: string, instanceId: string) {
    return this.prisma.task.findMany({
      where: { tenantId, instanceId },
      orderBy: { createdAt: "asc" },
    });
  }

  async listByTraceId(tenantId: string, traceId: string) {
    return this.prisma.task.findMany({
      where: { tenantId, traceId },
      orderBy: { createdAt: "asc" },
    });
  }

  async claimTask(tenantId: string, id: string, workerId: string, now: Date) {
    const updated = await this.prisma.task.updateMany({
      where: {
        tenantId,
        id,
        status: "PENDING",
        AND: [
          {
            OR: [{ lockedAt: null }, { lockedAt: { lt: new Date(now.getTime() - 60000) } }],
          },
          {
            OR: [{ runAt: null }, { runAt: { lte: now } }],
          },
        ],
      },
      data: {
        status: "RUNNING",
        lockedAt: now,
        lockedBy: workerId,
        attempts: { increment: 1 },
      },
    });

    if (updated.count === 0) {
      return null;
    }

    return this.prisma.task.findFirst({ where: { tenantId, id } });
  }

  async markSucceeded(
    tenantId: string,
    id: string,
    output: string | null,
    tx?: TransactionContext
  ) {
    const client = getPrismaClient(this.prisma, tx);
    return client.task.updateMany({
      where: { tenantId, id },
      data: {
        status: "SUCCEEDED",
        output,
        lockedAt: null,
        lockedBy: null,
      },
    });
  }

  async markFailed(
    tenantId: string,
    id: string,
    error: string | null,
    status: "FAILED" | "PENDING",
    tx?: TransactionContext
  ) {
    const client = getPrismaClient(this.prisma, tx);
    return client.task.updateMany({
      where: { tenantId, id },
      data: {
        status,
        error,
        lockedAt: null,
        lockedBy: null,
      },
    });
  }

  async markCancelled(tenantId: string, id: string, tx?: TransactionContext) {
    const client = getPrismaClient(this.prisma, tx);
    return client.task.updateMany({
      where: { tenantId, id },
      data: { status: "CANCELLED" },
    });
  }
}
