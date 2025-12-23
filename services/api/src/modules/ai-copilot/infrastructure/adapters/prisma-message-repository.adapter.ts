import { Injectable } from "@nestjs/common";
import { prisma } from "@kerniflow/data";
import { MessageRepositoryPort } from "../../application/ports/message.repo.port";
import { CopilotMessage } from "../../domain/entities/message.entity";

@Injectable()
export class PrismaMessageRepository implements MessageRepositoryPort {
  async create(message: {
    id: string;
    tenantId: string;
    runId: string;
    role: string;
    partsJson: string;
  }): Promise<CopilotMessage> {
    const created = await prisma.message.create({
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
