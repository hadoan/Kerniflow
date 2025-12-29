import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { getPrismaClient } from "../uow/prisma-unit-of-work.adapter";
import type { TransactionContext } from "@kerniflow/kernel";

export interface WorkflowInstanceCreateInput {
  tenantId: string;
  definitionId: string;
  businessKey?: string | null;
  status: "PENDING" | "RUNNING" | "WAITING" | "COMPLETED" | "FAILED" | "CANCELLED";
  currentState?: string | null;
  context?: string | null;
  startedAt?: Date | null;
}

export interface WorkflowInstanceUpdateSnapshotInput {
  status: "PENDING" | "RUNNING" | "WAITING" | "COMPLETED" | "FAILED" | "CANCELLED";
  currentState: string;
  context: string;
  completedAt?: Date | null;
  startedAt?: Date | null;
  lastError?: string | null;
}

export interface WorkflowInstanceFilters {
  status?: "PENDING" | "RUNNING" | "WAITING" | "COMPLETED" | "FAILED" | "CANCELLED";
  definitionId?: string;
  definitionKey?: string;
  businessKey?: string;
}

@Injectable()
export class WorkflowInstanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: WorkflowInstanceCreateInput, tx?: TransactionContext) {
    const client = getPrismaClient(this.prisma, tx);
    return client.workflowInstance.create({ data: input });
  }

  async findById(tenantId: string, id: string, tx?: TransactionContext) {
    const client = getPrismaClient(this.prisma, tx);
    return client.workflowInstance.findFirst({ where: { id, tenantId } });
  }

  async findByBusinessKey(
    tenantId: string,
    definitionId: string,
    businessKey: string,
    tx?: TransactionContext
  ) {
    const client = getPrismaClient(this.prisma, tx);
    return client.workflowInstance.findFirst({
      where: { tenantId, definitionId, businessKey },
    });
  }

  async list(tenantId: string, filters: WorkflowInstanceFilters = {}) {
    return this.prisma.workflowInstance.findMany({
      where: {
        tenantId,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.definitionId ? { definitionId: filters.definitionId } : {}),
        ...(filters.businessKey ? { businessKey: filters.businessKey } : {}),
        ...(filters.definitionKey ? { definition: { key: filters.definitionKey } } : {}),
      },
      include: { definition: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async getWithDetails(tenantId: string, id: string) {
    return this.prisma.workflowInstance.findFirst({
      where: { tenantId, id },
      include: { tasks: true, events: true, definition: true },
    });
  }

  async updateSnapshotIfCurrent(
    tenantId: string,
    id: string,
    updatedAt: Date,
    input: WorkflowInstanceUpdateSnapshotInput,
    tx?: TransactionContext
  ) {
    const client = getPrismaClient(this.prisma, tx);
    return client.workflowInstance.updateMany({
      where: { tenantId, id, updatedAt },
      data: {
        status: input.status,
        currentState: input.currentState,
        context: input.context,
        startedAt: input.startedAt ?? undefined,
        completedAt: input.completedAt ?? undefined,
        lastError: input.lastError ?? undefined,
      },
    });
  }

  async updateStatus(
    tenantId: string,
    id: string,
    status: "PENDING" | "RUNNING" | "WAITING" | "COMPLETED" | "FAILED" | "CANCELLED",
    tx?: TransactionContext
  ) {
    const client = getPrismaClient(this.prisma, tx);
    return client.workflowInstance.updateMany({
      where: { tenantId, id },
      data: { status },
    });
  }
}
