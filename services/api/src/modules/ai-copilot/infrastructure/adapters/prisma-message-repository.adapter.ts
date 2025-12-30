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
}
