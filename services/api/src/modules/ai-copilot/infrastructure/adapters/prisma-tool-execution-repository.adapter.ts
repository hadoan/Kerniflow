import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { ToolExecutionRepositoryPort } from "../../application/ports/tool-execution-repository.port";
import { ToolExecution } from "../../domain/entities/tool-execution.entity";

@Injectable()
export class PrismaToolExecutionRepository implements ToolExecutionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(execution: {
    id: string;
    tenantId: string;
    runId: string;
    toolCallId: string;
    toolName: string;
    inputJson: string;
    status: string;
    traceId?: string;
  }): Promise<ToolExecution> {
    const created = await this.prisma.toolExecution.create({
      data: {
        id: execution.id,
        tenantId: execution.tenantId,
        runId: execution.runId,
        toolCallId: execution.toolCallId,
        toolName: execution.toolName,
        inputJson: execution.inputJson,
        status: execution.status,
        traceId: execution.traceId,
      },
    });

    return new ToolExecution(
      created.id,
      created.tenantId,
      created.runId,
      created.toolCallId,
      created.toolName,
      created.inputJson,
      created.status,
      created.startedAt,
      created.finishedAt || undefined,
      created.outputJson || undefined,
      created.errorJson || undefined,
      created.traceId || undefined
    );
  }

  async complete(
    tenantId: string,
    runId: string,
    toolCallId: string,
    data: { status: string; outputJson?: string; errorJson?: string }
  ): Promise<void> {
    await this.prisma.toolExecution.update({
      where: {
        tenantId_runId_toolCallId: {
          tenantId,
          runId,
          toolCallId,
        },
      },
      data: {
        status: data.status,
        outputJson: data.outputJson,
        errorJson: data.errorJson,
        finishedAt: new Date(),
      },
    });
  }
}
