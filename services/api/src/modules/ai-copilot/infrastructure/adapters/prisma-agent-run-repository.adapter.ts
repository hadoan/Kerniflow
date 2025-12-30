import { Injectable } from "@nestjs/common";
import type { PrismaService } from "@corely/data";
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
    metadataJson?: string | undefined;
  }): Promise<AgentRun> {
    const created = await this.prisma.agentRun.create({
      data: {
        id: run.id,
        tenantId: run.tenantId,
        createdByUserId: run.createdByUserId || undefined,
        status: run.status,
        metadataJson: run.metadataJson,
      },
    });
    return new AgentRun(
      created.id,
      created.tenantId,
      created.createdByUserId || null,
      created.status,
      created.startedAt,
      created.finishedAt || undefined,
      created.metadataJson || undefined
    );
  }

  async updateStatus(runId: string, status: string, finishedAt?: Date): Promise<void> {
    await this.prisma.agentRun.update({
      where: { id: runId },
      data: { status, finishedAt: finishedAt || null },
    });
  }
}
