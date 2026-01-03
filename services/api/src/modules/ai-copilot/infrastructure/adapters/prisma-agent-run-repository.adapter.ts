import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { AgentRunRepositoryPort } from "../../application/ports/agent-run-repository.port";
import { AgentRun } from "../../domain/entities/agent-run.entity";

@Injectable()
export class PrismaAgentRunRepository implements AgentRunRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(run: {
    id: string;
    tenantId: string;
    createdByUserId: string | null;
    status: string;
    traceId?: string | undefined;
    metadataJson?: string | undefined;
  }): Promise<AgentRun> {
    const created = await this.prisma.agentRun.create({
      data: {
        id: run.id,
        tenantId: run.tenantId,
        createdByUserId: run.createdByUserId || undefined,
        status: run.status,
        metadataJson: run.metadataJson,
        traceId: run.traceId,
      },
    });
    return new AgentRun(
      created.id,
      created.tenantId,
      created.createdByUserId || null,
      created.status,
      created.startedAt,
      created.finishedAt || undefined,
      created.metadataJson || undefined,
      created.traceId || undefined
    );
  }

  async updateStatus(runId: string, status: string, finishedAt?: Date): Promise<void> {
    await this.prisma.agentRun.update({
      where: { id: runId },
      data: { status, finishedAt: finishedAt || null },
    });
  }

  async findById(params: { tenantId: string; runId: string }): Promise<AgentRun | null> {
    const found = await this.prisma.agentRun.findFirst({
      where: { id: params.runId, tenantId: params.tenantId },
    });
    if (!found) {
      return null;
    }
    return new AgentRun(
      found.id,
      found.tenantId,
      found.createdByUserId || null,
      found.status,
      found.startedAt,
      found.finishedAt || undefined,
      found.metadataJson || undefined,
      found.traceId || undefined
    );
  }
}
