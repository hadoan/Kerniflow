import { NotFoundException } from "@nestjs/common";
import { type AgentRunRepositoryPort } from "../ports/agent-run-repository.port";

export class GetRunUseCase {
  constructor(private readonly runs: AgentRunRepositoryPort) {}

  async execute(params: { tenantId: string; runId: string }) {
    const run = await this.runs.findById(params);
    if (!run) {
      throw new NotFoundException("Run not found");
    }
    return run;
  }
}
