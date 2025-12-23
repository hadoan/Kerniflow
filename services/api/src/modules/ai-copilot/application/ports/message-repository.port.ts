import { CopilotMessage } from "../../domain/entities/message.entity";

export interface MessageRepositoryPort {
  create(message: {
    id: string;
    tenantId: string;
    runId: string;
    role: string;
    partsJson: string;
  }): Promise<CopilotMessage>;
}
