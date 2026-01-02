import { Injectable } from "@nestjs/common";
import type { PrismaService } from "@corely/data";
import { MessageRepositoryPort } from "../../application/ports/message-repository.port";
import { CopilotMessage } from "../../domain/entities/message.entity";

@Injectable()
export class PrismaMessageRepository implements MessageRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(message: {
    id: string;
    tenantId: string;
    runId: string;
    role: string;
    partsJson: string;
  }): Promise<CopilotMessage> {
    const created = await this.prisma.message.create({
      data: {
        id: message.id,
        tenantId: message.tenantId,
        runId: message.runId,
        role: message.role,
        partsJson: message.partsJson,
      },
    });
    return new CopilotMessage(
      created.id,
      created.tenantId,
      created.runId,
      created.role,
      created.partsJson,
      created.createdAt
    );
  }

  async createMany(
    messages: {
      id: string;
      tenantId: string;
      runId: string;
      role: string;
      partsJson: string;
      createdAt?: Date;
    }[]
  ): Promise<void> {
    if (!messages.length) {
      return;
    }
    await this.prisma.message.createMany({
      data: messages.map((m) => ({
        id: m.id,
        tenantId: m.tenantId,
        runId: m.runId,
        role: m.role,
        partsJson: m.partsJson,
        createdAt: m.createdAt,
      })),
      skipDuplicates: true,
    });
  }

  async listByRun(params: { tenantId: string; runId: string }): Promise<CopilotMessage[]> {
    const rows = await this.prisma.message.findMany({
      where: { tenantId: params.tenantId, runId: params.runId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(
      (row) =>
        new CopilotMessage(row.id, row.tenantId, row.runId, row.role, row.partsJson, row.createdAt)
    );
  }
}
