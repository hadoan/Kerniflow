import { AgentRun } from "../../domain/entities/agent-run.entity";

export interface AgentRunRepositoryPort {
  create(run: {
    id: string;
    tenantId: string;
    createdByUserId: string | null;
    status: string;
    metadataJson?: string;
  }): Promise<AgentRun>;

  updateStatus(runId: string, status: string, finishedAt?: Date): Promise<void>;
}
