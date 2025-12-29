import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { getPrismaClient } from "../uow/prisma-unit-of-work.adapter";
import type { TransactionContext } from "@kerniflow/kernel";

export interface WorkflowDefinitionCreateInput {
  tenantId: string;
  key: string;
  version: number;
  name: string;
  description?: string | null;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  spec: string;
  createdBy?: string | null;
}

export interface WorkflowDefinitionFilters {
  key?: string;
  status?: "ACTIVE" | "INACTIVE" | "ARCHIVED";
}

@Injectable()
export class WorkflowDefinitionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: WorkflowDefinitionCreateInput, tx?: TransactionContext) {
    const client = getPrismaClient(this.prisma, tx);
    return client.workflowDefinition.create({ data: input });
  }

  async findById(tenantId: string, id: string, tx?: TransactionContext) {
    const client = getPrismaClient(this.prisma, tx);
    return client.workflowDefinition.findFirst({ where: { id, tenantId } });
  }

  async list(tenantId: string, filters: WorkflowDefinitionFilters = {}) {
    return this.prisma.workflowDefinition.findMany({
      where: {
        tenantId,
        ...(filters.key ? { key: filters.key } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      orderBy: [{ key: "asc" }, { version: "desc" }],
    });
  }

  async findActiveByKey(tenantId: string, key: string, version?: number) {
    return this.prisma.workflowDefinition.findFirst({
      where: {
        tenantId,
        key,
        status: "ACTIVE",
        ...(version ? { version } : {}),
      },
      orderBy: { version: "desc" },
    });
  }

  async updateStatus(tenantId: string, id: string, status: "ACTIVE" | "INACTIVE" | "ARCHIVED") {
    return this.prisma.workflowDefinition.updateMany({
      where: { tenantId, id },
      data: { status },
    });
  }
}
