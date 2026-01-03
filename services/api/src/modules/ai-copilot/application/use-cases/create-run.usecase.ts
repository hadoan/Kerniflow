import { nanoid } from "nanoid";
import { type AgentRunRepositoryPort } from "../ports/agent-run-repository.port";

export class CreateRunUseCase {
  constructor(private readonly runs: AgentRunRepositoryPort) {}

  async execute(params: {
    tenantId: string;
    userId: string | null;
    metadataJson?: string;
    runId?: string;
    traceId?: string;
  }): Promise<{ runId: string }> {
    const runId = params.runId || nanoid();

    const existing = await this.runs.findById({ tenantId: params.tenantId, runId });
    if (existing) {
      return { runId: existing.id };
    }

    await this.runs.create({
      id: runId,
      tenantId: params.tenantId,
      createdByUserId: params.userId,
      status: "running",
      metadataJson: params.metadataJson,
      traceId: params.traceId,
    });

    return { runId };
  }
}
