import { type CopilotMessage } from "../../domain/entities/message.entity";

export interface MessageRepositoryPort {
  create(message: {
    id: string;
    tenantId: string;
    runId: string;
    role: string;
    partsJson: string;
    traceId?: string;
  }): Promise<CopilotMessage>;

  createMany(
    messages: {
      id: string;
      tenantId: string;
      runId: string;
      role: string;
      partsJson: string;
      createdAt?: Date;
      traceId?: string;
    }[]
  ): Promise<void>;

  listByRun(params: { tenantId: string; runId: string }): Promise<CopilotMessage[]>;
}
